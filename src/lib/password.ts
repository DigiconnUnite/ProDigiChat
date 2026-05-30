/**
 * Shared password-strength policy. Kept in one place so registration,
 * password reset, and invite set-password flows all enforce identical
 * rules.
 */
export const PASSWORD_RULES_TEXT =
  "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.";

export function validatePasswordStrength(password: string): {
  valid: boolean;
  error?: string;
} {
  if (typeof password !== "string" || password.length < 8) {
    return { valid: false, error: PASSWORD_RULES_TEXT };
  }
  const checks = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  ];
  if (!checks.every(Boolean)) {
    return { valid: false, error: PASSWORD_RULES_TEXT };
  }
  return { valid: true };
}
