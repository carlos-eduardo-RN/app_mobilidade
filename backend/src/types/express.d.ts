/**
 * Extensão de tipos para Express.js
 * Adiciona propriedades customizadas ao Request
 */

declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: string;
    };
    adminId?: string;
  }
}
export {};
