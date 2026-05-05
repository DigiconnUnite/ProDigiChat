/**
 * Unit tests for distributed-lock.ts.
 *
 * We mock the @upstash/redis client so we don't need a real Redis to
 * run the tests. Two scenarios that matter:
 *
 *   1. tryAcquireLock: returns a handle when SET NX returns OK,
 *      returns null when SET NX returns null (someone else holds it).
 *   2. withLock: runs the inner function and reports {ran: true} on
 *      success, reports {ran: false, reason: 'locked'} when SET NX
 *      fails. The inner function must NOT run when the lock cannot
 *      be acquired.
 *   3. releaseLock: only deletes when the value still matches our
 *      owner (no-op otherwise) — verified via the eval mock seeing
 *      our owner string.
 */

const setMock = jest.fn();
const evalMock = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    set: setMock,
    eval: evalMock,
  })),
}));

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  setMock.mockReset();
  evalMock.mockReset();
  process.env = {
    ...ORIGINAL_ENV,
    UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'test-token',
  };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('distributed-lock', () => {
  it('tryAcquireLock returns a handle when SET NX succeeds', async () => {
    setMock.mockResolvedValueOnce('OK');
    const { tryAcquireLock } = await import('./distributed-lock');

    const lock = await tryAcquireLock('foo', 5000);

    expect(lock).not.toBeNull();
    expect(lock?.key).toBe('lock:foo');
    expect(lock?.ttlMs).toBe(5000);
    expect(setMock).toHaveBeenCalledWith('lock:foo', expect.any(String), {
      nx: true,
      px: 5000,
    });
  });

  it('tryAcquireLock returns null when SET NX is rejected', async () => {
    setMock.mockResolvedValueOnce(null);
    const { tryAcquireLock } = await import('./distributed-lock');

    const lock = await tryAcquireLock('foo', 5000);

    expect(lock).toBeNull();
  });

  it('withLock runs the function when the lock is acquired', async () => {
    setMock.mockResolvedValueOnce('OK');
    evalMock.mockResolvedValueOnce(1);
    const { withLock } = await import('./distributed-lock');

    const inner = jest.fn().mockResolvedValue('done');

    const result = await withLock('foo', 5000, inner);

    expect(result).toEqual({ ran: true, value: 'done' });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(evalMock).toHaveBeenCalled();
  });

  it('withLock does NOT run the function when the lock is held', async () => {
    setMock.mockResolvedValueOnce(null);
    const { withLock } = await import('./distributed-lock');

    const inner = jest.fn().mockResolvedValue('should-not-run');

    const result = await withLock('foo', 5000, inner);

    expect(result).toEqual({ ran: false, reason: 'locked' });
    expect(inner).not.toHaveBeenCalled();
    expect(evalMock).not.toHaveBeenCalled();
  });

  it('falls back to a synthetic lock when Upstash is not configured', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    };
    jest.resetModules();
    const { withLock } = await import('./distributed-lock');

    const inner = jest.fn().mockResolvedValue('ran');
    const result = await withLock('foo', 5000, inner);

    expect(result).toEqual({ ran: true, value: 'ran' });
    expect(inner).toHaveBeenCalledTimes(1);
    // No Redis calls should have been made.
    expect(setMock).not.toHaveBeenCalled();
    expect(evalMock).not.toHaveBeenCalled();
  });

  it('releaseLock passes the owner to the eval CHECK-AND-DELETE', async () => {
    setMock.mockResolvedValueOnce('OK');
    evalMock.mockResolvedValueOnce(1);
    const { tryAcquireLock, releaseLock } = await import('./distributed-lock');

    const lock = await tryAcquireLock('foo', 5000);
    expect(lock).not.toBeNull();

    await releaseLock(lock!);

    expect(evalMock).toHaveBeenCalledTimes(1);
    const [_script, keys, argv] = evalMock.mock.calls[0];
    expect(keys).toEqual(['lock:foo']);
    expect(argv).toEqual([lock!.owner]);
  });
});
