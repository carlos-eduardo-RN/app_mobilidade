import { Request, Response, NextFunction } from 'express';
import { admin } from '../config/firebase';

/**
 * Middleware de autenticação REAL usando Firebase Auth
 * Valida o token JWT enviado pelo app
 */
export async function firebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'NO_AUTH_TOKEN',
      message: 'Authorization header missing or invalid',
    });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Injeta o usuário autenticado na request
    req.user = {
      id: decodedToken.uid,
      role: decodedToken.role, // opcional (custom claims)
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Firebase token is invalid or expired',
    });
  }
}