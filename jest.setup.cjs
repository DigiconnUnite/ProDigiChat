/**
 * Jest setup file. Runs once before any tests are loaded.
 *
 * The encryption module (`src/lib/encryption.ts`) refuses to load
 * unless `ENCRYPTION_KEY` is set, by design — this prevents the
 * application from accidentally storing plaintext credentials in
 * production. For unit tests we set the well-known dev sentinel
 * value so transitively-imported modules (queue.ts -> messages.ts
 * -> auth.ts -> encryption.ts) load without requiring real keys.
 *
 * Tests that exercise encryption directly should override these in
 * a beforeAll/beforeEach block.
 */

process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  'dev-only-do-not-use-in-prod-allow-plaintext-credentials';
process.env.NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || 'test-nextauth-secret-32-chars-long-xx';
