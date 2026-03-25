import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de autenticação MOCK
 * Apenas para desenvolvimento local
 */
export function authMock(req: Request, _res: Response, next: NextFunction) {
  req.user = {
    id: 'mock-driver-id',
    role: 'driver',
    name: 'Mock Driver',
    email: 'mock@driver.com',
  };

  next();
}