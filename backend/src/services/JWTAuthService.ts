/**
 * JWT Authentication Service
 * 
 * Handles JWT token generation, validation, and management
 */

import * as crypto from 'crypto';
import { Logger } from '../utils/Logger';
import {
  JWTPayload,
  AuthTokens,
  JWTConfig,
  Session,
  UserRole,
  SecurityEvent,
  SecurityEventType,
} from '../models/Security';

/**
 * JWT Auth Service Configuration
 */
interface JWTAuthServiceConfig {
  jwt: JWTConfig;
  enableSessionTracking?: boolean;
}

/**
 * JWT Auth Service Class
 */
export class JWTAuthService {
  private config: JWTAuthServiceConfig;
  
  // In-memory storage (in production, use Redis)
  private sessions: Map<string, Session> = new Map();
  private refreshTokens: Map<string, string> = new Map(); // refreshToken -> userId
  private securityEvents: SecurityEvent[] = [];

  constructor(config: JWTAuthServiceConfig) {
    this.config = {
      enableSessionTracking: true,
      ...config,
    };
  }

  /**
   * Generate Access and Refresh Tokens
   */
  async generateTokens(payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): Promise<AuthTokens> {
    Logger.info('JWTAuthService', `Generating tokens for user: ${payload.userId}`);

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    // Parse expiry (e.g., '15m', '1h', '7d')
    const expiresIn = this.parseExpiry(this.config.jwt.accessTokenExpiry);

    // Store refresh token
    this.refreshTokens.set(refreshToken, payload.userId);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Generate Access Token
   */
  private async generateAccessToken(
    payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiry(this.config.jwt.accessTokenExpiry);

    const fullPayload: JWTPayload = {
      ...payload,
      type: 'access',
      iat: now,
      exp,
    };

    return this.signToken(fullPayload);
  }

  /**
   * Generate Refresh Token
   */
  private async generateRefreshToken(
    payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiry(this.config.jwt.refreshTokenExpiry);

    const fullPayload: JWTPayload = {
      ...payload,
      type: 'refresh',
      iat: now,
      exp,
    };

    return this.signToken(fullPayload);
  }

  /**
   * Sign Token (Simplified JWT - in production use jsonwebtoken library)
   */
  private signToken(payload: JWTPayload): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    
    const signature = this.createSignature(`${encodedHeader}.${encodedPayload}`);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify and Decode Token
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    Logger.debug('JWTAuthService', 'Verifying token');

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, providedSignature] = parts;

    // Verify signature
    const expectedSignature = this.createSignature(`${encodedHeader}.${encodedPayload}`);
    if (expectedSignature !== providedSignature) {
      throw new Error('Invalid token signature');
    }

    // Decode payload
    const payload: JWTPayload = JSON.parse(this.base64UrlDecode(encodedPayload));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }

    // Check issuer and audience
    if (this.config.jwt.issuer || this.config.jwt.audience) {
      // In production, verify these claims
    }

    return payload;
  }

  /**
   * Refresh Access Token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    Logger.info('JWTAuthService', 'Refreshing access token');

    // Verify refresh token
    const payload = await this.verifyToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Check if refresh token is valid
    const userId = this.refreshTokens.get(refreshToken);
    if (!userId || userId !== payload.userId) {
      throw new Error('Invalid or revoked refresh token');
    }

    // Generate new access token
    const accessToken = await this.generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    const expiresIn = this.parseExpiry(this.config.jwt.accessTokenExpiry);

    return { accessToken, expiresIn };
  }

  /**
   * Revoke Refresh Token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    Logger.info('JWTAuthService', 'Revoking refresh token');

    this.refreshTokens.delete(refreshToken);

    // Also remove associated sessions
    const sessions = Array.from(this.sessions.values()).filter(
      s => s.refreshToken === refreshToken
    );

    for (const session of sessions) {
      session.isActive = false;
      this.sessions.set(session.id, session);
    }
  }

  /**
   * Create Session
   */
  async createSession(
    userId: string,
    tokens: AuthTokens,
    deviceInfo: { userAgent?: string; ip?: string; platform?: string }
  ): Promise<Session> {
    if (!this.config.enableSessionTracking) {
      throw new Error('Session tracking is disabled');
    }

    Logger.info('JWTAuthService', `Creating session for user: ${userId}`);

    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + this.parseExpiry(this.config.jwt.refreshTokenExpiry) * 1000);

    const session: Session = {
      id: sessionId,
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      deviceInfo,
      isActive: true,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt,
    };

    this.sessions.set(sessionId, session);

    // Log security event
    await this.logSecurityEvent({
      userId,
      type: SecurityEventType.LOGIN_SUCCESS,
      description: 'User logged in successfully',
      metadata: {
        ip: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
      },
    });

    return session;
  }

  /**
   * Get User Sessions
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    Logger.debug('JWTAuthService', `Fetching sessions for user: ${userId}`);

    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.isActive);
  }

  /**
   * Revoke Session
   */
  async revokeSession(sessionId: string): Promise<void> {
    Logger.info('JWTAuthService', `Revoking session: ${sessionId}`);

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.isActive = false;
    this.sessions.set(sessionId, session);

    // Revoke associated refresh token
    await this.revokeRefreshToken(session.refreshToken);

    // Log security event
    await this.logSecurityEvent({
      userId: session.userId,
      type: SecurityEventType.LOGOUT,
      description: 'User logged out',
    });
  }

  /**
   * Revoke All User Sessions
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    Logger.info('JWTAuthService', `Revoking all sessions for user: ${userId}`);

    const sessions = await this.getUserSessions(userId);

    for (const session of sessions) {
      await this.revokeSession(session.id);
    }
  }

  /**
   * Get Security Events
   */
  async getSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    Logger.debug('JWTAuthService', `Fetching security events for user: ${userId}`);

    return this.securityEvents
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Log Security Event
   */
  private async logSecurityEvent(
    event: Omit<SecurityEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      timestamp: new Date(),
    };

    this.securityEvents.push(securityEvent);
    Logger.info('JWTAuthService', `Security event logged: ${event.type} for user ${event.userId}`);
  }

  /**
   * Create Signature
   */
  private createSignature(data: string): string {
    return crypto
      .createHmac('sha256', this.config.jwt.secret)
      .update(data)
      .digest('base64url');
  }

  /**
   * Base64 URL Encode
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL Decode
   */
  private base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return Buffer.from(str, 'base64').toString('utf-8');
  }

  /**
   * Parse Expiry String to Seconds
   */
  private parseExpiry(expiry: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    return value * (units[unit] || 1);
  }

  /**
   * Generate Session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Validate Password (Helper)
   */
  async validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // This would use config.passwordPolicy in production
    if (!/^[0-9]{6,}$/.test(password)) {
      errors.push('Password must contain only numbers and be at least 6 digits long');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Hash Password (Simplified - use bcrypt in production)
   */
  async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt.hash(password, saltRounds)
    return crypto.createHash('sha256').update(password + this.config.jwt.secret).digest('hex');
  }

  /**
   * Compare Password (Simplified - use bcrypt in production)
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }
}
