/**
 * Unit tests for the atomic claim helpers in queue.ts.
 *
 * The claim is the single linchpin that prevents two cron workers
 * from sending the same row twice, so it warrants its own dedicated
 * tests. We cover:
 *
 *   - claimQueueItem returns null when updateMany touches 0 rows
 *     (i.e. someone else got there first or the row is no longer
 *     in QUEUED/PENDING).
 *   - claimQueueItem returns the post-update row when updateMany
 *     touches 1 row, with status flipped to SENDING and a fresh
 *     claimToken stamped.
 *   - reclaimStaleClaims targets only SENDING rows older than the
 *     threshold and resets their claim fields.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    whatsAppMessageQueue: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  claimQueueItem,
  reclaimStaleClaims,
  STALE_CLAIM_THRESHOLD_MS,
} from './queue';

const mockedUpdateMany = prisma.whatsAppMessageQueue.updateMany as jest.MockedFunction<
  typeof prisma.whatsAppMessageQueue.updateMany
>;
const mockedFindUnique = prisma.whatsAppMessageQueue.findUnique as jest.MockedFunction<
  typeof prisma.whatsAppMessageQueue.findUnique
>;

beforeEach(() => {
  mockedUpdateMany.mockReset();
  mockedFindUnique.mockReset();
});

describe('claimQueueItem', () => {
  it('returns null when updateMany matches 0 rows (lost race)', async () => {
    mockedUpdateMany.mockResolvedValueOnce({ count: 0 } as any);

    const claimed = await claimQueueItem('q1');

    expect(claimed).toBeNull();
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it('returns the post-update row when updateMany matches 1 row', async () => {
    mockedUpdateMany.mockResolvedValueOnce({ count: 1 } as any);
    mockedFindUnique.mockResolvedValueOnce({
      id: 'q1',
      status: 'sending',
      attempts: 1,
      claimToken: 'tok',
    } as any);

    const claimed = await claimQueueItem('q1');

    expect(claimed).toEqual(
      expect.objectContaining({ id: 'q1', status: 'sending', attempts: 1 }),
    );
  });

  it('only matches rows currently in QUEUED or PENDING', async () => {
    mockedUpdateMany.mockResolvedValueOnce({ count: 1 } as any);
    mockedFindUnique.mockResolvedValueOnce({ id: 'q1' } as any);

    await claimQueueItem('q1');

    const where = (mockedUpdateMany.mock.calls[0][0] as any).where;
    expect(where.id).toBe('q1');
    expect(where.status).toEqual({ in: ['queued', 'pending'] });
  });

  it('flips status to SENDING and increments attempts in one update', async () => {
    mockedUpdateMany.mockResolvedValueOnce({ count: 1 } as any);
    mockedFindUnique.mockResolvedValueOnce({ id: 'q1' } as any);

    await claimQueueItem('q1');

    const data = (mockedUpdateMany.mock.calls[0][0] as any).data;
    expect(data.status).toBe('sending');
    expect(data.attempts).toEqual({ increment: 1 });
    expect(typeof data.claimToken).toBe('string');
    expect(data.claimToken.length).toBeGreaterThan(0);
    expect(data.claimedAt).toBeInstanceOf(Date);
  });
});

describe('reclaimStaleClaims', () => {
  it('only targets SENDING rows older than the threshold', async () => {
    mockedUpdateMany.mockResolvedValueOnce({ count: 0 } as any);

    await reclaimStaleClaims();

    const where = (mockedUpdateMany.mock.calls[0][0] as any).where;
    expect(where.status).toBe('sending');
    expect(where.claimedAt.lt).toBeInstanceOf(Date);
    // Cutoff should be roughly STALE_CLAIM_THRESHOLD_MS in the past
    const ageMs = Date.now() - where.claimedAt.lt.getTime();
    expect(ageMs).toBeGreaterThanOrEqual(STALE_CLAIM_THRESHOLD_MS - 1000);
    expect(ageMs).toBeLessThanOrEqual(STALE_CLAIM_THRESHOLD_MS + 1000);
  });

  it('resets status, claimToken, and claimedAt', async () => {
    mockedUpdateMany.mockResolvedValueOnce({ count: 3 } as any);

    const reclaimed = await reclaimStaleClaims();

    expect(reclaimed).toBe(3);
    const data = (mockedUpdateMany.mock.calls[0][0] as any).data;
    expect(data.status).toBe('queued');
    expect(data.claimToken).toBeNull();
    expect(data.claimedAt).toBeNull();
  });
});
