// ============================================================
// Opus8 — API Key Generator & Validator
// ============================================================

import { randomBytes, createHash } from 'crypto';
import { API_KEY_PREFIX } from '@shared/constants';

/**
 * Generate a new sk_opus8_ API key.
 * Format: sk_opus8_<32_random_hex>
 * Stores only the SHA-256 hash in the database.
 */
export function generateApiKey(): { fullKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(24).toString('hex'); // 48-char random string
  const fullKey = `${API_KEY_PREFIX}${randomPart}`;
  const keyHash = hashApiKey(fullKey);
  const keyPrefix = fullKey.slice(0, 16) + '...'; // sk_opus8_abc123...

  return { fullKey, keyHash, keyPrefix };
}

/**
 * Hash an API key with SHA-256 for storage.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate the format of an API key.
 * Must start with sk_opus8_ and have a valid hex suffix.
 */
export function validateApiKeyFormat(key: string): boolean {
  const prefix = API_KEY_PREFIX;
  if (!key.startsWith(prefix)) return false;
  const suffix = key.slice(prefix.length);
  // Must be 48 hex characters (24 bytes → hex)
  return /^[a-f0-9]{48}$/.test(suffix);
}

/**
 * Verify a plaintext key against a stored hash.
 */
export function verifyApiKey(plaintext: string, storedHash: string): boolean {
  return hashApiKey(plaintext) === storedHash;
}

/**
 * Extract enough of the key to identify the user without exposing the full key.
 * Shows first 16 chars for the user to recognize.
 */
export function maskApiKey(fullKey: string): string {
  return fullKey.slice(0, 16) + '••••••••••••••••' + fullKey.slice(-4);
}
