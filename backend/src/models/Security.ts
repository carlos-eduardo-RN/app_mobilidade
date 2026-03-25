/**
 * Security Models & Types
 * 
 * Data models for authentication and security
 */

/**
 * JWT Token Payload
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;  // Issued at
  exp?: number;  // Expires at
}

/**
 * User Role Types
 */
export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Auth Tokens Response
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // seconds
  tokenType: 'Bearer';
}

/**
 * Login Credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Register Input
 */
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
}

/**
 * OAuth Provider Types
 */
export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  APPLE = 'APPLE',
}

/**
 * OAuth Profile
 */
export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
}

/**
 * OAuth Login Input
 */
export interface OAuthLoginInput {
  provider: OAuthProvider;
  code: string;  // Authorization code
  redirectUri?: string;
}

/**
 * Two-Factor Auth Methods
 */
export enum TwoFactorMethod {
  SMS = 'SMS',
  AUTHENTICATOR = 'AUTHENTICATOR',
  EMAIL = 'EMAIL',
}

/**
 * Two-Factor Auth Setup
 */
export interface TwoFactorSetup {
  method: TwoFactorMethod;
  secret?: string;  // For authenticator app
  qrCode?: string;  // QR code image URL
  backupCodes?: string[];  // Backup codes
}

/**
 * Two-Factor Verification Input
 */
export interface TwoFactorVerifyInput {
  userId: string;
  code: string;
  method: TwoFactorMethod;
}

/**
 * Session Data
 */
export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  deviceInfo: {
    userAgent?: string;
    ip?: string;
    platform?: string;
  };
  isActive: boolean;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

/**
 * Password Reset Request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password Reset Confirmation
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;  // Seconds until retry
}

/**
 * Security Event Types
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  TWO_FACTOR_VERIFIED = 'TWO_FACTOR_VERIFIED',
  OAUTH_LOGIN = 'OAUTH_LOGIN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
}

/**
 * Security Event Log
 */
export interface SecurityEvent {
  id: string;
  userId: string;
  type: SecurityEventType;
  description: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    location?: string;
    provider?: OAuthProvider;
    reason?: string;
  };
  timestamp: Date;
}

/**
 * User Security Settings
 */
export interface UserSecuritySettings {
  userId: string;
  twoFactorEnabled: boolean;
  twoFactorMethod?: TwoFactorMethod;
  passwordChangedAt?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  isLocked: boolean;
  lockedUntil?: Date;
  trustedDevices: string[];  // Device fingerprints
}

/**
 * JWT Configuration
 */
export interface JWTConfig {
  secret: string;
  accessTokenExpiry: string;  // e.g., '15m', '1h'
  refreshTokenExpiry: string;  // e.g., '7d', '30d'
  issuer: string;
  audience: string;
}

/**
 * OAuth Provider Configuration
 */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * OAuth Configuration
 */
export interface OAuthConfig {
  google?: OAuthProviderConfig;
  facebook?: OAuthProviderConfig;
  apple?: OAuthProviderConfig;
}

/**
 * Two-Factor Auth Configuration
 */
export interface TwoFactorConfig {
  issuer: string;  // App name for authenticator
  window: number;  // Time window for code validation
  codeLength: number;  // Length of verification code
}

/**
 * Security Configuration
 */
export interface SecurityConfig {
  jwt: JWTConfig;
  oauth?: OAuthConfig;
  twoFactor?: TwoFactorConfig;
  rateLimit: {
    login: RateLimitConfig;
    register: RateLimitConfig;
    passwordReset: RateLimitConfig;
    api: RateLimitConfig;
  };
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  accountLockout: {
    maxAttempts: number;
    lockoutDurationMs: number;
  };
}

/**
 * Auth Response
 */
export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  tokens: AuthTokens;
  requiresTwoFactor?: boolean;
  twoFactorSession?: string;
}

/**
 * Refresh Token Response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}
