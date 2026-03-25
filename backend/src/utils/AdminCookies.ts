import { Request } from 'express';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE_SECONDS = 900; // 15 minutes

export function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {} as Record<string, string>);
}

export function getAdminSessionCookie(req: Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME];
}

export function buildAdminSessionCookie(sessionId: string, isProduction: boolean): string {
  const secure = isProduction ? ' Secure;' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS};`;
}

export function buildAdminSessionClearCookie(isProduction: boolean): string {
  const secure = isProduction ? ' Secure;' : '';
  return `${SESSION_COOKIE_NAME}=; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=0;`;
}

export function getRequestIp(req: Request): string | undefined {
  return req.ip || req.socket.remoteAddress || undefined;
}
