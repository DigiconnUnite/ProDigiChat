/**
 * Unit tests for meta-errors.ts.
 *
 * The classifier collapses the long list of Meta error codes into a
 * small handful of categories, so the queue worker can decide retry
 * vs no_retry vs rate_limit vs reconnect_auth without knowing the
 * specifics of any single code. We verify that:
 *
 *   - well-known retry codes -> retry
 *   - well-known permanent codes -> no_retry
 *   - rate-limit codes -> rate_limited with a cooldown
 *   - auth codes -> reconnect_auth
 *   - unknown codes fall back to retry (the conservative default)
 *   - HTTP-level fallbacks for non-Meta-coded errors work as expected
 */

import { classifyMetaError } from './meta-errors';

function metaErr(code: number, message = 'mock'): unknown {
  return {
    response: {
      status: 400,
      data: { error: { code, message } },
    },
    message,
  };
}

describe('classifyMetaError', () => {
  it('classifies 130429 as rate_limited with a 1h cooldown', () => {
    const result = classifyMetaError(metaErr(130429, 'business limit reached'));
    expect(result.category).toBe('rate_limited');
    expect(result.cooldownMs).toBe(60 * 60 * 1000);
    expect(result.reason).toContain('130429');
  });

  it('classifies 132016 (template disabled) as no_retry', () => {
    const result = classifyMetaError(metaErr(132016, 'template disabled'));
    expect(result.category).toBe('no_retry');
  });

  it('classifies 131008 (parameter missing) as no_retry', () => {
    const result = classifyMetaError(metaErr(131008));
    expect(result.category).toBe('no_retry');
  });

  it('classifies 190 (invalid OAuth token) as reconnect_auth', () => {
    const result = classifyMetaError(metaErr(190, 'invalid token'));
    expect(result.category).toBe('reconnect_auth');
  });

  it('classifies 131000 (generic) as retry', () => {
    const result = classifyMetaError(metaErr(131000));
    expect(result.category).toBe('retry');
  });

  it('falls back to retry for unknown Meta codes with no HTTP context', () => {
    const result = classifyMetaError({
      error: { code: 999999, message: 'never seen this code' },
    });
    expect(result.category).toBe('retry');
  });

  it('prefers HTTP status when an unknown Meta code is wrapped in a 400 response', () => {
    // Unknown code + HTTP 400 -> the HTTP-status fallback wins and we
    // refuse to retry. Better than burning attempts on a 400.
    const result = classifyMetaError(metaErr(999999, 'never seen this code'));
    expect(result.category).toBe('no_retry');
  });

  it('treats HTTP 401 as reconnect_auth even with no Meta code', () => {
    const result = classifyMetaError({
      response: { status: 401, data: {} },
    });
    expect(result.category).toBe('reconnect_auth');
  });

  it('treats HTTP 429 as rate_limited with a 1m cooldown when no Meta code', () => {
    const result = classifyMetaError({
      response: { status: 429, data: {} },
    });
    expect(result.category).toBe('rate_limited');
    expect(result.cooldownMs).toBe(60 * 1000);
  });

  it('treats HTTP 5xx as retry', () => {
    const result = classifyMetaError({
      response: { status: 503, data: {} },
    });
    expect(result.category).toBe('retry');
  });

  it('treats HTTP 4xx (other than 401/403/429) as no_retry', () => {
    const result = classifyMetaError({
      response: { status: 400, data: {} },
    });
    expect(result.category).toBe('no_retry');
  });

  it('handles plain Error-like inputs by returning retry', () => {
    const result = classifyMetaError(new Error('socket hang up'));
    expect(result.category).toBe('retry');
  });

  it('accepts string-coded errors and parses them', () => {
    const result = classifyMetaError({
      response: { data: { error: { code: '130429' as any, message: 'rl' } } },
    });
    expect(result.category).toBe('rate_limited');
  });
});
