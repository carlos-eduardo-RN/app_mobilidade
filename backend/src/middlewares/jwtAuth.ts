import { Request, Response, NextFunction } from 'express';
import { createJwtService } from '../config/jwt';
import { Logger } from '../utils/Logger';

const jwtService = createJwtService();

export async function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'NO_AUTH_TOKEN',
      message: 'Token de autenticacao ausente ou invalido.',
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const payload = await jwtService.verifyToken(token);

    if (payload.type !== 'access') {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Token de autenticacao invalido.',
      });
    }

    req.user = {
      id: payload.userId,
      role: payload.role,
    };

    return next();
  } catch (error) {
    Logger.warn('jwtAuth', 'Token invalido', { error });
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Token de autenticacao invalido ou expirado.',
    });
  }
}
