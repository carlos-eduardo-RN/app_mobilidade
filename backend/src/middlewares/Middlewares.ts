/**
 * Middlewares
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';
import { ApplicationError } from '../models/Errors';
import { v4 as uuidv4 } from 'uuid';
import { JWTAuthService } from '../services/JWTAuthService';
import { RateLimiterService } from '../services/RateLimiterService';
import { UserRole } from '../models/Security';

/**
 * Mock Authentication Middleware (Legacy)
 * Em produção, seria JWT, OAuth, etc.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing authorization token' });
    return;
  }

  // Mock: aceitar qualquer token com formato "user_id:role"
  const parts = token.split(':');
  if (parts.length !== 2) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token format (expected: user_id:role)' });
    return;
  }

  req.user = {
    id: parts[0],
    role: parts[1],
  };

  next();
};

/**
 * JWT Authentication Middleware
 */
export const jwtAuthMiddleware = (jwtService: JWTAuthService) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer '

      // Verify token
      const payload = await jwtService.verifyToken(token);

      // Check if it's an access token
      if (payload.type !== 'access') {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Invalid token type',
        });
        return;
      }

      // Attach user to request
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Token expired') {
          res.status(401).json({
            error: 'TOKEN_EXPIRED',
            message: 'Your session has expired. Please login again.',
          });
          return;
        }
      }

      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }
  };
};

/**
 * Role-Based Authorization Middleware
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Permission-Based Authorization Middleware
 */
export const requirePermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    // In production, check user permissions from database
    // For now, allow all authenticated users
    next();
  };
};

/**
 * Rate Limiting Middleware
 */
export const rateLimitMiddleware = (
  rateLimiter: RateLimiterService,
  configName?: keyof typeof RateLimiterService.presets
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = rateLimiter.createKey(req.ip || 'unknown', req.path);
      const config = configName ? RateLimiterService.presets[configName] : undefined;

      const result = await rateLimiter.checkLimit(key, config);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config?.maxRequests || 100);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter || 60);
        res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: config?.message || 'Too many requests, please try again later.',
          retryAfter: result.retryAfter,
        });
        return;
      }

      next();
    } catch (error) {
      // Log error but don't block request
      Logger.error('RateLimitMiddleware', 'Error checking rate limit', error);
      next();
    }
  };
};

/**
 * Logging Middleware
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const traceId = uuidv4();
  (req as any).traceId = traceId;

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info('HTTP', `${req.method} ${req.path}`, {
      traceId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

/**
 * Error Handler Middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  const traceId = (req as any).traceId || 'unknown';

  Logger.error('ErrorHandler', `Error on ${req.method} ${req.path}`, {
    traceId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  if (err instanceof ApplicationError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
      traceId,
    });
    return;
  }

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    traceId,
  });
};

/**
 * Rate Limit Middleware (simples em memória)
 */
export class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.ip || 'unknown';
      const now = Date.now();

      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }

      const timestamps = this.requests.get(key)!;

      // Remover requisições fora da janela
      const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);
      this.requests.set(key, validTimestamps);

      if (validTimestamps.length >= this.maxRequests) {
        res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        });
        return;
      }

      validTimestamps.push(now);
      next();
    };
  }
}

/**
 * Request Validation Middleware
 */
export const validateRequestBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO: Implementar com library de validação (zod, joi, etc)
    next();
  };
};
