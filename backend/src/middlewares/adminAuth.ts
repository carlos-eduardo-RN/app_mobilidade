import { Request, Response, NextFunction } from 'express';
import { getAdminSessionCookie } from '../utils/AdminCookies';
import { loadValidAdminSession } from '../utils/AdminSessions';
import { createJwtService } from '../config/jwt';
import { UserRole } from '../models/Security';

const jwtService = createJwtService();

export async function adminSessionAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = await jwtService.verifyToken(token);

        if (payload.type === 'access' &&
          (payload.role === UserRole.ADMIN || payload.role === UserRole.SUPER_ADMIN)) {
          req.adminId = payload.userId;
          next();
          return;
        }
      } catch {
        // Fall back to session cookie auth
      }
    }

    const sessionId = getAdminSessionCookie(req);
    if (!sessionId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing admin session' });
      return;
    }

    const session = await loadValidAdminSession(sessionId);
    if (!session) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid admin session' });
      return;
    }

    req.adminId = session.adminId;
    next();
  } catch (error) {
    next(error);
  }
}
