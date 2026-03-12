import crypto from "crypto";

// Configuration constants
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256-bit key
const PBKDF2_ITERATIONS = 100000;

// Environment variable name for encryption key
const ENCRYPTION_KEY_ENV = "ENCRYPTION_KEY";

// In-memory key cache (derived from env var)
let derivedKey: Buffer | null = null;
let encryptionKeyWarningLogged = false;

/**
 * Check if encryption key is configured
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env[ENCRYPTION_KEY_ENV];
  return !!(key && key.length >= 32);
}

/**
 * Derive encryption key from environment variable using PBKDF2
 * @param encryptionKey - The raw encryption key from environment variable
 * @returns Derived key buffer
 */
function deriveKey(encryptionKey: string): Buffer {
  // Use a static salt for consistent key derivation
  // In production, you might want to store this salt securely
  const salt = Buffer.from("whatsapp-credential-encryption-salt-v1", "utf-8");
  
  return crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );
}

/**
 * Initialize or validate the encryption key
 * Should be called on application startup
 * @throws Error if encryption key is not configured
 */
export function initializeEncryption(): void {
  const encryptionKey = process.env[ENCRYPTION_KEY_ENV];
  
  if (!encryptionKey) {
    if (!encryptionKeyWarningLogged) {
      console.warn(
        "[Encryption] WARNING: ENCRYPTION_KEY environment variable is not set. " +
        "Sensitive credentials will be stored in plaintext. " +
        "This is not recommended for production environments."
      );
      encryptionKeyWarningLogged = true;
    }
    derivedKey = null;
    return;
  }
  
  if (encryptionKey.length < 32) {
    console.error(
      `[Encryption] ERROR: ENCRYPTION_KEY must be at least 32 characters. ` +
      `Current length: ${encryptionKey.length}`
    );
    throw new Error(
      "ENCRYPTION_KEY must be at least 32 characters long for secure encryption"
    );
  }
  
  derivedKey = deriveKey(encryptionKey);
  console.log("[Encryption] Encryption key initialized successfully");
}

/**
 * Check if a value is encrypted (has the encryption prefix)
 * @param value - The value to check
 * @returns true if the value appears to be encrypted
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }
  return value.startsWith("enc:");
}

/**
 * Encrypt a sensitive field value
 * @param plaintext - The plain text value to encrypt
 * @returns Encrypted value with prefix, or original value if encryption not configured
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  // Return null/undefined as-is
  if (plaintext === null || plaintext === undefined) {
    return null;
  }
  
  // If encryption is not configured, return plaintext (with warning)
  if (!derivedKey) {
    if (!encryptionKeyWarningLogged) {
      console.warn(
        "[Encryption] WARNING: Encryption not configured. " +
        "Sensitive data will be stored without encryption."
      );
      encryptionKeyWarningLogged = true;
    }
    return plaintext;
  }
  
  try {
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV + AuthTag + Encrypted data
    // Format: enc:iv:authTag:encryptedData (all base64)
    const combined = `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
    
    return `enc:${combined}`;
  } catch (error) {
    console.error("[Encryption] Error encrypting field:", error);
    throw new Error("Failed to encrypt sensitive data");
  }
}

/**
 * Decrypt a sensitive field value
 * @param encryptedValue - The encrypted value (with enc: prefix) or plain text
 * @returns Decrypted plain text, or original value if not encrypted
 */
export function decryptField(encryptedValue: string | null | undefined): string | null {
  // Return null/undefined as-is
  if (encryptedValue === null || encryptedValue === undefined) {
    return null;
  }
  
  // If not encrypted, return as-is
  if (!isEncrypted(encryptedValue)) {
    return encryptedValue;
  }
  
  // If encryption is not configured but value is marked as encrypted, throw error
  if (!derivedKey) {
    console.error(
      "[Encryption] ERROR: Cannot decrypt - encryption key not configured. " +
      "Value is marked as encrypted but no key available."
    );
    throw new Error(
      "Cannot decrypt: ENCRYPTION_KEY environment variable is not configured"
    );
  }
  
  try {
    // Remove prefix and split components
    const encryptedPart = encryptedValue.substring(4); // Remove "enc:"
    const parts = encryptedPart.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted value format");
    }
    
    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    
    // Set authentication tag
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("[Encryption] Error decrypting field:", error);
    throw new Error("Failed to decrypt sensitive data");
  }
}

/**
 * Encrypt multiple sensitive fields in an object
 * @param obj - Object containing sensitive fields
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  if (!obj) {
    return obj;
  }
  
  const result = { ...obj };
  
  for (const field of fieldsToEncrypt) {
    const value = result[field];
    if (value !== null && value !== undefined) {
      (result as any)[field] = encryptField(String(value));
    }
  }
  
  return result;
}

/**
 * Decrypt multiple sensitive fields in an object
 * @param obj - Object containing encrypted fields
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T | null,
  fieldsToDecrypt: (keyof T)[]
): T | null {
  if (!obj) {
    return obj;
  }
  
  const result = { ...obj };
  
  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (value !== null && value !== undefined) {
      (result as any)[field] = decryptField(String(value));
    }
  }
  
  return result;
}

/**
 * Fields that should be encrypted in WhatsApp credentials
 */
export const SENSITIVE_CREDENTIAL_FIELDS = [
  "accessToken",
  "facebookAppSecret",
  "systemUserToken",
] as const;

/**
 * Type for sensitive credential fields
 */
export type SensitiveCredentialField = "accessToken" | "facebookAppSecret" | "systemUserToken";

/**
 * Encrypt WhatsApp credential fields before storage
 * @param credential - Credential object with sensitive fields
 * @returns Credential object with encrypted sensitive fields
 */
export function encryptWhatsAppCredential<T extends Record<string, any>>(
  credential: T
): T {
  return encryptFields(credential, ["accessToken", "facebookAppSecret", "systemUserToken"]);
}

/**
 * Decrypt WhatsApp credential fields after retrieval
 * @param credential - Credential object with potentially encrypted fields
 * @returns Credential object with decrypted sensitive fields
 */
export function decryptWhatsAppCredential<T extends Record<string, any>>(
  credential: T | null
): T | null {
  return decryptFields(credential, ["accessToken", "facebookAppSecret", "systemUserToken"]);
}

// Initialize encryption on module load
initializeEncryption();
