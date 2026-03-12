import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";


// Rate limiting for failed login attempts
const loginAttempts = new Map<string, number[]>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export async function handleFailedLoginAttempt(email: string) {
  const now = Date.now();
  const attempts = loginAttempts.get(email) || [];

  // Filter out attempts older than the window
  const recentAttempts = (attempts as number[]).filter((timestamp: number) => {
    return now - timestamp < LOGIN_ATTEMPT_WINDOW;
  });

  recentAttempts.push(now);
  loginAttempts.set(email, recentAttempts);

  if (recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
    // Account locking is handled by NextAuth
    // We track attempts in memory but don't modify the user record
    throw new Error("Too many failed login attempts. Account locked.");
  }
}

export async function validatePasswordStrength(password: string) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (password.length < minLength) {
    throw new Error(`Password must be at least ${minLength} characters long.`);
  }

  if (!hasUpperCase) {
    throw new Error("Password must contain at least one uppercase letter.");
  }

  if (!hasLowerCase) {
    throw new Error("Password must contain at least one lowercase letter.");
  }

  if (!hasNumbers) {
    throw new Error("Password must contain at least one number.");
  }

  if (!hasSpecialChars) {
    throw new Error("Password must contain at least one special character.");
  }
}

// Session management is handled by NextAuth
// This function is kept for reference but uses NextAuth's session handling
export async function handleSessionExpiration(sessionToken: string) {
  // NextAuth handles session management internally
  // This function would require a custom session model if needed
  throw new Error("Session management is handled by NextAuth");
}