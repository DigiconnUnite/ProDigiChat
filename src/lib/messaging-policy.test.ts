/**
 * Unit tests for messaging-policy.ts.
 *
 * The module decides whether a particular outbound message is allowed
 * under Meta's WhatsApp Business policy. We verify each branch of
 * `evaluateOutboundPolicy`:
 *   - unknown contact -> denied (contact_not_found)
 *   - deleted contact -> denied (contact_deleted)
 *   - opted_out contact -> denied (opted_out)
 *   - pending contact -> denied (not_opted_in)
 *   - opted_in + within 24h + freeform -> allowed
 *   - opted_in + outside 24h + freeform -> denied (outside_24h_window)
 *   - opted_in + outside 24h + template -> allowed
 *   - opted_in + null lastInbound + template -> allowed (templates bypass window)
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { evaluateOutboundPolicy, CUSTOMER_CARE_WINDOW_MS } from './messaging-policy';

const mockedFindFirst = prisma.contact.findFirst as jest.MockedFunction<
  typeof prisma.contact.findFirst
>;

const orgId = 'org-1';

const baseContact = {
  id: 'c-1',
  organizationId: orgId,
  phoneNumber: '+15551234567',
  optInStatus: 'opted_in',
  lastInboundAt: new Date(),
  isDeleted: false,
};

beforeEach(() => {
  mockedFindFirst.mockReset();
});

describe('messaging-policy.evaluateOutboundPolicy', () => {
  it('denies when no contact is found in the organization', async () => {
    mockedFindFirst.mockResolvedValueOnce(null as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      phoneNumber: '+15551234567',
      isTemplate: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('contact_not_found');
    }
  });

  it('denies a soft-deleted contact', async () => {
    mockedFindFirst.mockResolvedValueOnce({
      ...baseContact,
      isDeleted: true,
    } as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      contactId: 'c-1',
      isTemplate: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('contact_deleted');
    }
  });

  it('denies an opted_out contact even for templates', async () => {
    mockedFindFirst.mockResolvedValueOnce({
      ...baseContact,
      optInStatus: 'opted_out',
    } as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      contactId: 'c-1',
      isTemplate: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('opted_out');
    }
  });

  it('denies a pending (not yet opted in) contact', async () => {
    mockedFindFirst.mockResolvedValueOnce({
      ...baseContact,
      optInStatus: 'pending',
    } as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      contactId: 'c-1',
      isTemplate: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('not_opted_in');
    }
  });

  it('allows freeform send within the 24-hour window', async () => {
    mockedFindFirst.mockResolvedValueOnce({
      ...baseContact,
      lastInboundAt: new Date(Date.now() - 60 * 60 * 1000),
    } as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      contactId: 'c-1',
      isTemplate: false,
    });

    expect(result.ok).toBe(true);
  });

  it('denies a freeform send outside the 24-hour window', async () => {
    mockedFindFirst.mockResolvedValueOnce({
      ...baseContact,
      lastInboundAt: new Date(Date.now() - CUSTOMER_CARE_WINDOW_MS - 60_000),
    } as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      contactId: 'c-1',
      isTemplate: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('outside_24h_window');
    }
  });

  it('allows a template send outside the 24-hour window', async () => {
    mockedFindFirst.mockResolvedValueOnce({
      ...baseContact,
      lastInboundAt: new Date(Date.now() - CUSTOMER_CARE_WINDOW_MS - 60_000),
    } as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      contactId: 'c-1',
      isTemplate: true,
    });

    expect(result.ok).toBe(true);
  });

  it('allows a template send when the contact has never replied', async () => {
    mockedFindFirst.mockResolvedValueOnce({
      ...baseContact,
      lastInboundAt: null,
    } as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      contactId: 'c-1',
      isTemplate: true,
    });

    expect(result.ok).toBe(true);
  });

  it('denies a freeform send when the contact has never replied', async () => {
    mockedFindFirst.mockResolvedValueOnce({
      ...baseContact,
      lastInboundAt: null,
    } as any);

    const result = await evaluateOutboundPolicy({
      organizationId: orgId,
      contactId: 'c-1',
      isTemplate: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('outside_24h_window');
    }
  });
});
