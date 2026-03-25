import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';
import { Logger } from '../utils/Logger';
import { createJwtService } from '../config/jwt';
import {
  buildAdminSessionCookie,
  buildAdminSessionClearCookie,
  getAdminSessionCookie,
  getRequestIp,
} from '../utils/AdminCookies';
import { recordAdminAudit } from '../utils/AdminAudit';
import { loadValidAdminSession, revokeAdminSession } from '../utils/AdminSessions';
import { UserRole } from '../models/Security';
import { findOfflineAdmin } from '../db/offlineData';

const SESSION_TTL_MS = 15 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

// In-memory rate limiting (tracks failed login attempts)
const failedLoginAttempts = new Map<string, { count: number; timestamp: number }>();

function getAttemptKey(email: string, ipAddress: string): string {
  return `${email}:${ipAddress}`;
}

function checkAndRecordFailedAttempt(email: string, ipAddress: string): boolean {
  const key = getAttemptKey(email, ipAddress);
  const now = Date.now();

  const existing = failedLoginAttempts.get(key);
  if (existing && now - existing.timestamp < LOGIN_WINDOW_MS) {
    if (existing.count >= MAX_FAILED_LOGIN_ATTEMPTS) {
      return false; // Rate limited
    }
    existing.count++;
  } else {
    failedLoginAttempts.set(key, { count: 1, timestamp: now });
  }

  return true; // Not rate limited
}

function clearFailedAttempts(email: string, ipAddress: string): void {
  const key = getAttemptKey(email, ipAddress);
  failedLoginAttempts.delete(key);
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of failedLoginAttempts.entries()) {
    if (now - value.timestamp > LOGIN_WINDOW_MS) {
      failedLoginAttempts.delete(key);
    }
  }
}, 60 * 1000); // Cleanup every minute

export class AdminAuthController {
  private jwtService = createJwtService();

  /**
   * POST /api/admin/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { email, password } = req.body || {};
      const ipAddress = getRequestIp(req);
      const userAgent = req.get('user-agent');

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'INVALID_REQUEST' });
        return;
      }

      Logger.debug('AdminAuthController', 'POST /api/admin/login', { traceId, email });

      // Check rate limiting (in-memory)
      const safeIpAddress = ipAddress || 'unknown';
      if (!checkAndRecordFailedAttempt(email, safeIpAddress)) {
        res.status(429).json({ success: false, error: 'RATE_LIMIT' });
        return;
      }

      // Try database first, fall back to offline data if database is unavailable
      let admin: any = null;
      try {
        admin = await prisma.admin.findUnique({ where: { email } });
      } catch (dbError) {
        Logger.warn('AdminAuthController', 'Database unavailable, trying offline data', { traceId });
        admin = await findOfflineAdmin(email);
      }

      const passwordMatches = admin
        ? await bcrypt.compare(password, admin.passwordHash)
        : false;

      if (!admin || !passwordMatches || !admin.isActive) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }

      // Clear failed attempts on successful login
      clearFailedAttempts(email, safeIpAddress);

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      let session;
      
      try {
        session = await prisma.adminSession.create({
          data: {
            adminId: admin.id,
            expiresAt,
            ipAddress,
            userAgent,
          },
        });
      } catch (sessionError) {
        Logger.warn('AdminAuthController', 'Failed to create admin session in database', { traceId, error: sessionError });
        // Generate a temporary session ID for offline mode
        session = { id: `temp-${Date.now()}`, adminId: admin.id, expiresAt, ipAddress, userAgent, createdAt: new Date(), isValid: true };
      }

      // Try to record audit, but don't fail if database is unavailable
      try {
        await recordAdminAudit({
          adminId: admin.id,
          action: 'admin_login_success',
          entityType: 'admin_session',
          entityId: session.id,
          ipAddress,
          userAgent,
        });
      } catch (auditError) {
        Logger.warn('AdminAuthController', 'Failed to record audit log', { traceId, error: auditError });
      }

      const tokens = await this.jwtService.generateTokens({
        userId: admin.id,
        email: admin.email,
        role: admin.role as UserRole,
      });

      const isProduction = process.env.NODE_ENV === 'production';
      res.setHeader('Set-Cookie', buildAdminSessionCookie(session.id, isProduction));
      res.status(200).json({
        success: true,
        tokens,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const ipAddress = getRequestIp(req);
      const userAgent = req.get('user-agent');
      const sessionId = getAdminSessionCookie(req);

      Logger.debug('AdminAuthController', 'POST /api/admin/logout', { traceId });

      if (!sessionId) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }

      const session = await loadValidAdminSession(sessionId);
      if (!session) {
        res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
        return;
      }

      await revokeAdminSession(sessionId);
      await recordAdminAudit({
        adminId: session.adminId,
        action: 'admin_logout',
        entityType: 'admin_session',
        entityId: sessionId,
        ipAddress,
        userAgent,
      });

      const isProduction = process.env.NODE_ENV === 'production';
      res.setHeader('Set-Cookie', buildAdminSessionClearCookie(isProduction));
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
