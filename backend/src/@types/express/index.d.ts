import type { UserRole } from '../../models/Security';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      role?: UserRole | string;
      email?: string;
      name?: string;
    };
    adminId?: string;
  }
}

export {};
