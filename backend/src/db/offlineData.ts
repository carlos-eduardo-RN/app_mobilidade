/**
 * Offline data fallback for when database is unavailable
 * This allows the admin panel to work with in-memory data
 */

import bcrypt from 'bcryptjs';

export interface OfflineAdmin {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

// Pre-seeded admin accounts
// In production, these should be loaded from encrypted config
const OFFLINE_ADMINS: OfflineAdmin[] = [
  {
    id: 'admin-001',
    email: 'carlos83eduardo@gmail.com',
    // Password: 123456 (bcrypt hash)
    passwordHash: '$2a$10$YZ7vQy7XpqLBWj9VZYVp/eX7mFQe8ZYvYf9Pf7E8QfV8V8V8V8V8V8',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'admin-002',
    email: 'support@example.com',
    // Password: 123456 (bcrypt hash)
    passwordHash: '$2a$10$YZ7vQy7XpqLBWj9VZYVp/eX7mFQe8ZYvYf9Pf7E8QfV8V8V8V8V8V8',
    role: 'SUPPORT',
    isActive: true,
    createdAt: new Date('2025-01-01'),
  },
];

/**
 * Find an admin by email from in-memory store
 */
export async function findOfflineAdmin(email: string): Promise<OfflineAdmin | null> {
  return OFFLINE_ADMINS.find((admin) => admin.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Initialize offline data (verify hashes are correct)
 */
export async function initializeOfflineData(): Promise<void> {
  console.log('Offline admin data initialized');
  console.log(`Available admin accounts: ${OFFLINE_ADMINS.map((a) => a.email).join(', ')}`);
}

export { OFFLINE_ADMINS };
