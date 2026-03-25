import { Express, Request, Response, NextFunction } from 'express';

/**
 * Inicializa o Sentry (temporariamente desabilitado para estabilização do build)
 */
export const initSentry = (_app: Express) => {
  console.warn('Sentry temporariamente desabilitado para estabilização do backend.');
};

/**
 * Middleware de tratamento de erros (noop)
 */
export const sentryErrorHandler = (
  _err: any,
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(_err);
};

/**
 * Funções mock para manter compatibilidade com o restante do código
 */

export const captureException = (_error: Error, _context?: Record<string, any>) => {};

export const captureMessage = (
  _message: string,
  _level: any = 'info',
  _context?: Record<string, any>
) => {};

export const setUser = (_user: { id: string; email?: string; username?: string }) => {};

export const clearUser = () => {};

export const addBreadcrumb = (_breadcrumb: any) => {};

export const setContext = (_name: string, _context: Record<string, any>) => {};

export const setTag = (_key: string, _value: string) => {};

export const startTransaction = (_name: string, _op: string) => {
  return null;
};

export default {
  initSentry,
  sentryErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setContext,
  setTag,
  startTransaction,
};