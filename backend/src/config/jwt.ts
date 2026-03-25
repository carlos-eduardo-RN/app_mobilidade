import { JWTAuthService } from '../services/JWTAuthService';
import type { JWTConfig } from '../models/Security';

const DEFAULT_SECRET = 'dev_jwt_secret_change_in_production_min_32_chars';

export function getJwtConfig(): JWTConfig {
  return {
    secret: process.env.JWT_SECRET || DEFAULT_SECRET,
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1d',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'voudemoto',
    audience: process.env.JWT_AUDIENCE || 'voudemoto-admin',
  };
}

export function createJwtService(): JWTAuthService {
  return new JWTAuthService({ jwt: getJwtConfig() });
}
