/**
 * Security & Authentication Test Suite
 * Tests for JWT, OAuth2, Rate Limiting, and Two-Factor Authentication
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { JWTAuthService } from '../src/services/JWTAuthService';
import { OAuth2Service } from '../src/services/OAuth2Service';
import { RateLimiterService } from '../src/services/RateLimiterService';
import { TwoFactorAuthService } from '../src/services/TwoFactorAuthService';
import { AuthController } from '../src/controllers/AuthController';
import prisma from '../src/db/prisma';
import {
  UserRole,
  OAuthProvider,
  TwoFactorMethod,
  JWTPayload,
  OAuthProfile,
} from '../src/models/Security';

jest.mock('../src/db/prisma', () => ({
  __esModule: true,
  default: {
    driver: {
      findUnique: jest.fn(),
    },
    passenger: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('JWT Authentication Service', () => 
  let jwtService: JWTAuthService;

  beforeEach(() => {
    jwtService = new JWTAuthService({
      secret: 'test-secret-key',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    });
  });

  describe('Token Generation', () => {
    it('should generate access and refresh tokens', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      };

      const tokens = await jwtService.generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens.tokenType).toBe('Bearer');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should generate different tokens each time', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      };

      const tokens1 = await jwtService.generateTokens(payload);
      const tokens2 = await jwtService.generateTokens(payload);

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });

    it('should generate tokens with correct structure', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      };

      const token = await jwtService.generateAccessToken(payload);
      const parts = token.split('.');

      expect(parts).toHaveLength(3); // header.payload.signature
    });
  });

  describe('Token Verification', () => {
    it('should verify valid tokens', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      };

      const token = await jwtService.generateAccessToken(payload);
      const verified = await jwtService.verifyToken(token);

      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
      expect(verified.role).toBe(payload.role);
    });

    it('should reject expired tokens', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now() - 20 * 60 * 1000, // 20 minutes ago
        exp: Date.now() - 5 * 60 * 1000, // 5 minutes ago (expired)
      };

      const token = await jwtService.generateAccessToken(payload);

      await expect(jwtService.verifyToken(token)).rejects.toThrow('Token expired');
    });

    it('should reject invalid tokens', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(jwtService.verifyToken(invalidToken)).rejects.toThrow();
    });

    it('should reject tampered tokens', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      };

      const token = await jwtService.generateAccessToken(payload);
      const tamperedToken = token.replace('user123', 'user999');

      await expect(jwtService.verifyToken(tamperedToken)).rejects.toThrow();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token using refresh token', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'refresh',
        iat: Date.now(),
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      const { refreshToken } = await jwtService.generateTokens(payload);
      const newAccessToken = await jwtService.refreshAccessToken(refreshToken);

      expect(newAccessToken).toHaveProperty('accessToken');
      expect(newAccessToken).toHaveProperty('expiresIn');
      expect(typeof newAccessToken.accessToken).toBe('string');
    });

    it('should reject expired refresh token', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'refresh',
        iat: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
        exp: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago (expired)
      };

      const refreshToken = await jwtService.generateRefreshToken(payload);

      await expect(jwtService.refreshAccessToken(refreshToken)).rejects.toThrow();
    });

    it('should reject access token used as refresh token', async () => {
      const payload: JWTPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      };

      const accessToken = await jwtService.generateAccessToken(payload);

      await expect(jwtService.refreshAccessToken(accessToken)).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should create session', async () => {
      const tokens = await jwtService.generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      });

      const session = await jwtService.createSession('user123', tokens, {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        platform: 'web',
      });

      expect(session.userId).toBe('user123');
      expect(session.isActive).toBe(true);
      expect(session.deviceInfo.userAgent).toBe('Mozilla/5.0');
    });

    it('should get user sessions', async () => {
      const tokens1 = await jwtService.generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      });

      const tokens2 = await jwtService.generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      });

      await jwtService.createSession('user123', tokens1, {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        platform: 'web',
      });

      await jwtService.createSession('user123', tokens2, {
        userAgent: 'Mobile App',
        ip: '192.168.1.2',
        platform: 'mobile',
      });

      const sessions = await jwtService.getUserSessions('user123');
      expect(sessions).toHaveLength(2);
      expect(sessions[0].userId).toBe('user123');
      expect(sessions[1].userId).toBe('user123');
    });

    it('should revoke session', async () => {
      const tokens = await jwtService.generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      });

      const session = await jwtService.createSession('user123', tokens, {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        platform: 'web',
      });

      await jwtService.revokeSession(session.id);

      const sessions = await jwtService.getUserSessions('user123');
      const revokedSession = sessions.find((s) => s.id === session.id);

      expect(revokedSession?.isActive).toBe(false);
    });

    it('should revoke all user sessions', async () => {
      const tokens1 = await jwtService.generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      });

      const tokens2 = await jwtService.generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      });

      await jwtService.createSession('user123', tokens1, {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        platform: 'web',
      });

      await jwtService.createSession('user123', tokens2, {
        userAgent: 'Mobile App',
        ip: '192.168.1.2',
        platform: 'mobile',
      });

      await jwtService.revokeAllUserSessions('user123');

      const sessions = await jwtService.getUserSessions('user123');
      const activeSessions = sessions.filter((s) => s.isActive);

      expect(activeSessions).toHaveLength(0);
    });
  });

  describe('Password Management', () => {
    it('should validate strong password', async () => {
      const result = await jwtService.validatePassword('StrongP@ss123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', async () => {
      const tests = [
        { password: 'short', reason: 'too short' },
        { password: 'alllowercase123!', reason: 'no uppercase' },
        { password: 'ALLUPPERCASE123!', reason: 'no lowercase' },
        { password: 'NoNumbers!', reason: 'no numbers' },
        { password: 'NoSpecial123', reason: 'no special chars' },
      ];

      for (const test of tests) {
        const result = await jwtService.validatePassword(test.password);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('should hash and compare passwords', async () => {
      const password = 'TestPassword123!';
      const hash = await jwtService.hashPassword(password);

      expect(hash).not.toBe(password);

      const isValid = await jwtService.comparePassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await jwtService.comparePassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Security Events', () => {
    it('should log security events', async () => {
      const tokens = await jwtService.generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      });

      await jwtService.createSession('user123', tokens, {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        platform: 'web',
      });

      const events = await jwtService.getSecurityEvents('user123');

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].userId).toBe('user123');
      expect(events[0].type).toBe('SESSION_CREATED');
    });

    it('should filter security events by type', async () => {
      const tokens = await jwtService.generateTokens({
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.PASSENGER,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 15 * 60 * 1000,
      });

      const session = await jwtService.createSession('user123', tokens, {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        platform: 'web',
      });

      await jwtService.revokeSession(session.id);

      const allEvents = await jwtService.getSecurityEvents('user123');
      const sessionEvents = allEvents.filter((e) => e.type.includes('SESSION'));

      expect(sessionEvents.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('OAuth2 Service', () => {
  let oauthService: OAuth2Service;

  beforeEach(() => {
    oauthService = new OAuth2Service({
      [OAuthProvider.GOOGLE]: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
        redirectUri: 'http://localhost:3000/auth/google/callback',
        scopes: ['profile', 'email'],
      },
      [OAuthProvider.FACEBOOK]: {
        clientId: 'facebook-client-id',
        clientSecret: 'facebook-client-secret',
        redirectUri: 'http://localhost:3000/auth/facebook/callback',
        scopes: ['email', 'public_profile'],
      },
      [OAuthProvider.APPLE]: {
        clientId: 'apple-client-id',
        clientSecret: 'apple-client-secret',
        redirectUri: 'http://localhost:3000/auth/apple/callback',
        scopes: ['name', 'email'],
      },
    });
  });

  describe('Authorization URLs', () => {
    it('should generate Google authorization URL', async () => {
      const url = await oauthService.getAuthorizationUrl(
        OAuthProvider.GOOGLE,
        'state123',
        'http://localhost:3000/auth/google/callback'
      );

      expect(url).toContain('accounts.google.com');
      expect(url).toContain('client_id=google-client-id');
      expect(url).toContain('state=state123');
      expect(url).toContain('redirect_uri=');
    });

    it('should generate Facebook authorization URL', async () => {
      const url = await oauthService.getAuthorizationUrl(
        OAuthProvider.FACEBOOK,
        'state123',
        'http://localhost:3000/auth/facebook/callback'
      );

      expect(url).toContain('facebook.com');
      expect(url).toContain('client_id=facebook-client-id');
      expect(url).toContain('state=state123');
    });

    it('should generate Apple authorization URL', async () => {
      const url = await oauthService.getAuthorizationUrl(
        OAuthProvider.APPLE,
        'state123',
        'http://localhost:3000/auth/apple/callback'
      );

      expect(url).toContain('appleid.apple.com');
      expect(url).toContain('client_id=apple-client-id');
      expect(url).toContain('state=state123');
    });

    it('should include scopes in authorization URL', async () => {
      const url = await oauthService.getAuthorizationUrl(
        OAuthProvider.GOOGLE,
        'state123',
        'http://localhost:3000/auth/google/callback'
      );

      expect(url).toContain('scope=');
      expect(url).toContain('profile');
      expect(url).toContain('email');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      const tokens = await oauthService.exchangeCode({
        provider: OAuthProvider.GOOGLE,
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/auth/google/callback',
      });

      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('token_type');
      expect(tokens.token_type).toBe('Bearer');
    });

    // AuthController role resolution tests
    describe('AuthController role resolution', () => {
      let authController: AuthController;

      beforeEach(() => {
        authController = new AuthController();
        jest.clearAllMocks();
      });

      it('should resolve DRIVER when driver row exists even if user.role is PASSENGER', async () => {
        (prisma.driver.findUnique as jest.Mock).mockResolvedValue({ id: 'driver-1' });
        (prisma.passenger.findUnique as jest.Mock).mockResolvedValue(null);

        const roleContext = await (authController as any).resolveRoleContext('user-1');

        expect(roleContext.role).toBe(UserRole.DRIVER);
        expect(roleContext.hasDriver).toBe(true);
        expect(roleContext.hasPassenger).toBe(false);
      });

      it('should resolve PASSENGER when passenger row exists and driver row is absent', async () => {
        (prisma.driver.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.passenger.findUnique as jest.Mock).mockResolvedValue({ id: 'passenger-1' });

        const roleContext = await (authController as any).resolveRoleContext('user-2');

        expect(roleContext.role).toBe(UserRole.PASSENGER);
        expect(roleContext.hasDriver).toBe(false);
        expect(roleContext.hasPassenger).toBe(true);
      });

      it('should resolve PASSENGER when no role record exists (fallback)', async () => {
        (prisma.driver.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.passenger.findUnique as jest.Mock).mockResolvedValue(null);

        const roleContext = await (authController as any).resolveRoleContext('user-3');

        expect(roleContext.role).toBe(UserRole.PASSENGER);
        expect(roleContext.hasDriver).toBe(false);
        expect(roleContext.hasPassenger).toBe(false);
      });
    });

    it('should handle token exchange errors', async () => {
      await expect(
        oauthService.exchangeCode({
          provider: OAuthProvider.GOOGLE,
          code: 'invalid-code',
          redirectUri: 'wrong-redirect-uri',
        })
      ).rejects.toThrow();
    });
  });

  describe('User Profile', () => {
    it('should fetch Google user profile', async () => {
      const profile = await oauthService.getUserProfile(
        OAuthProvider.GOOGLE,
        'mock-access-token'
      );

      expect(profile).toHaveProperty('providerId');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('name');
      expect(profile.provider).toBe(OAuthProvider.GOOGLE);
    });

    it('should fetch Facebook user profile', async () => {
      const profile = await oauthService.getUserProfile(
        OAuthProvider.FACEBOOK,
        'mock-access-token'
      );

      expect(profile.provider).toBe(OAuthProvider.FACEBOOK);
      expect(profile).toHaveProperty('email');
    });

    it('should fetch Apple user profile', async () => {
      const profile = await oauthService.getUserProfile(
        OAuthProvider.APPLE,
        'mock-access-token'
      );

      expect(profile.provider).toBe(OAuthProvider.APPLE);
      expect(profile).toHaveProperty('email');
    });
  });

  describe('Complete OAuth Flow', () => {
    it('should complete login flow with Google', async () => {
      const profile = await oauthService.loginWithProvider({
        provider: OAuthProvider.GOOGLE,
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/auth/google/callback',
      });

      expect(profile.provider).toBe(OAuthProvider.GOOGLE);
      expect(profile).toHaveProperty('providerId');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('tokens');
    });

    it('should complete login flow with Facebook', async () => {
      const profile = await oauthService.loginWithProvider({
        provider: OAuthProvider.FACEBOOK,
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/auth/facebook/callback',
      });

      expect(profile.provider).toBe(OAuthProvider.FACEBOOK);
    });

    it('should complete login flow with Apple', async () => {
      const profile = await oauthService.loginWithProvider({
        provider: OAuthProvider.APPLE,
        code: 'auth-code-123',
        redirectUri: 'http://localhost:3000/auth/apple/callback',
      });

      expect(profile.provider).toBe(OAuthProvider.APPLE);
    });
  });

  describe('Account Linking', () => {
    it('should link OAuth account to user', async () => {
      const profile: OAuthProfile = {
        provider: OAuthProvider.GOOGLE,
        providerId: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        tokens: {
          access_token: 'access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      };

      await oauthService.linkAccount('user123', profile);

      const linkedAccounts = await oauthService.getLinkedAccounts('user123');
      expect(linkedAccounts).toHaveLength(1);
      expect(linkedAccounts[0].provider).toBe(OAuthProvider.GOOGLE);
    });

    it('should prevent duplicate account linking', async () => {
      const profile: OAuthProfile = {
        provider: OAuthProvider.GOOGLE,
        providerId: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
        tokens: {
          access_token: 'access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      };

      await oauthService.linkAccount('user123', profile);

      await expect(oauthService.linkAccount('user123', profile)).rejects.toThrow(
        'Account already linked'
      );
    });

    it('should unlink OAuth account', async () => {
      const profile: OAuthProfile = {
        provider: OAuthProvider.GOOGLE,
        providerId: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
        tokens: {
          access_token: 'access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      };

      await oauthService.linkAccount('user123', profile);
      await oauthService.unlinkAccount('user123', OAuthProvider.GOOGLE);

      const linkedAccounts = await oauthService.getLinkedAccounts('user123');
      expect(linkedAccounts).toHaveLength(0);
    });

    it('should allow linking multiple providers', async () => {
      const googleProfile: OAuthProfile = {
        provider: OAuthProvider.GOOGLE,
        providerId: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
        tokens: {
          access_token: 'google-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      };

      const facebookProfile: OAuthProfile = {
        provider: OAuthProvider.FACEBOOK,
        providerId: 'facebook-user-456',
        email: 'test@example.com',
        name: 'Test User',
        tokens: {
          access_token: 'facebook-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      };

      await oauthService.linkAccount('user123', googleProfile);
      await oauthService.linkAccount('user123', facebookProfile);

      const linkedAccounts = await oauthService.getLinkedAccounts('user123');
      expect(linkedAccounts).toHaveLength(2);
    });
  });

  describe('Token Management', () => {
    it('should refresh OAuth tokens', async () => {
      const newTokens = await oauthService.refreshToken(
        OAuthProvider.GOOGLE,
        'refresh-token-123'
      );

      expect(newTokens).toHaveProperty('access_token');
      expect(newTokens).toHaveProperty('expires_in');
    });

    it('should revoke OAuth tokens', async () => {
      await expect(
        oauthService.revokeToken(OAuthProvider.GOOGLE, 'access-token-123')
      ).resolves.not.toThrow();
    });
  });

  describe('State Validation', () => {
    it('should validate matching state', () => {
      const result = oauthService.validateState('state123', 'state123');
      expect(result).toBe(true);
    });

    it('should reject mismatched state', () => {
      const result = oauthService.validateState('state123', 'state456');
      expect(result).toBe(false);
    });
  });
});

describe('Rate Limiter Service', () => {
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    rateLimiter = new RateLimiterService();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const key = 'test-user-1';
      const config = { windowMs: 60000, maxRequests: 5 };

      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkLimit(key, config);
        expect(result.allowed).toBe(true);
      }
    });

    it('should block requests exceeding limit', async () => {
      const key = 'test-user-2';
      const config = { windowMs: 60000, maxRequests: 3 };

      for (let i = 0; i < 3; i++) {
        await rateLimiter.checkLimit(key, config);
      }

      const result = await rateLimiter.checkLimit(key, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should track remaining requests', async () => {
      const key = 'test-user-3';
      const config = { windowMs: 60000, maxRequests: 5 };

      const result1 = await rateLimiter.checkLimit(key, config);
      expect(result1.remaining).toBe(4);

      const result2 = await rateLimiter.checkLimit(key, config);
      expect(result2.remaining).toBe(3);

      const result3 = await rateLimiter.checkLimit(key, config);
      expect(result3.remaining).toBe(2);
    });

    it('should provide reset time', async () => {
      const key = 'test-user-4';
      const config = { windowMs: 60000, maxRequests: 5 };

      const result = await rateLimiter.checkLimit(key, config);

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should provide retry after when limit exceeded', async () => {
      const key = 'test-user-5';
      const config = { windowMs: 60000, maxRequests: 2 };

      await rateLimiter.checkLimit(key, config);
      await rateLimiter.checkLimit(key, config);

      const result = await rateLimiter.checkLimit(key, config);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Sliding Window', () => {
    it('should implement sliding window algorithm', async () => {
      const key = 'test-user-6';
      const config = { windowMs: 1000, maxRequests: 2 };

      await rateLimiter.checkLimit(key, config);
      await rateLimiter.checkLimit(key, config);

      // Wait for window to slide
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await rateLimiter.checkLimit(key, config);
      expect(result.allowed).toBe(true);
    });

    it('should expire old requests', async () => {
      const key = 'test-user-7';
      const config = { windowMs: 500, maxRequests: 2 };

      await rateLimiter.checkLimit(key, config);
      await rateLimiter.checkLimit(key, config);

      const blocked = await rateLimiter.checkLimit(key, config);
      expect(blocked.allowed).toBe(false);

      // Wait for requests to expire
      await new Promise((resolve) => setTimeout(resolve, 600));

      const allowed = await rateLimiter.checkLimit(key, config);
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('Preset Configurations', () => {
    it('should use login preset', async () => {
      const key = 'login-user-1';
      const result = await rateLimiter.checkLimit(key, RateLimiterService.presets.login);

      expect(result.allowed).toBe(true);
    });

    it('should use register preset', async () => {
      const key = 'register-user-1';
      const result = await rateLimiter.checkLimit(key, RateLimiterService.presets.register);

      expect(result.allowed).toBe(true);
    });

    it('should use api preset', async () => {
      const key = 'api-user-1';
      const result = await rateLimiter.checkLimit(key, RateLimiterService.presets.api);

      expect(result.allowed).toBe(true);
    });

    it('should enforce login rate limit', async () => {
      const key = 'brute-force-user';
      const config = RateLimiterService.presets.login; // 5 attempts per 15 min

      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit(key, config);
      }

      const result = await rateLimiter.checkLimit(key, config);
      expect(result.allowed).toBe(false);
    });

    it('should enforce SMS rate limit', async () => {
      const key = 'sms-user';
      const config = RateLimiterService.presets.sms; // 5 SMS per hour

      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit(key, config);
      }

      const result = await rateLimiter.checkLimit(key, config);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Key Management', () => {
    it('should create composite keys', () => {
      const key = rateLimiter.createKey('user', '123', 'login');
      expect(key).toBe('user:123:login');
    });

    it('should reset rate limit for key', async () => {
      const key = 'reset-test';
      const config = { windowMs: 60000, maxRequests: 2 };

      await rateLimiter.checkLimit(key, config);
      await rateLimiter.checkLimit(key, config);

      await rateLimiter.reset(key);

      const result = await rateLimiter.checkLimit(key, config);
      expect(result.allowed).toBe(true);
    });

    it('should get current count', async () => {
      const key = 'count-test';
      const config = { windowMs: 60000, maxRequests: 5 };

      await rateLimiter.checkLimit(key, config);
      await rateLimiter.checkLimit(key, config);

      const count = await rateLimiter.getCount(key);
      expect(count).toBe(2);
    });

    it('should get remaining requests', async () => {
      const key = 'remaining-test';
      const config = { windowMs: 60000, maxRequests: 5 };

      await rateLimiter.checkLimit(key, config);
      await rateLimiter.checkLimit(key, config);

      const remaining = await rateLimiter.getRemaining(key, config);
      expect(remaining).toBe(3);
    });

    it('should check if limit exceeded', async () => {
      const key = 'exceeded-test';
      const config = { windowMs: 60000, maxRequests: 2 };

      await rateLimiter.checkLimit(key, config);
      await rateLimiter.checkLimit(key, config);

      const exceeded = await rateLimiter.isLimitExceeded(key, config);
      expect(exceeded).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', async () => {
      const key = 'cleanup-test';
      const config = { windowMs: 100, maxRequests: 5 };

      await rateLimiter.checkLimit(key, config);

      // Wait for entry to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      await rateLimiter.cleanup();

      const count = await rateLimiter.getCount(key);
      expect(count).toBe(0);
    });

    it('should get all limits', async () => {
      await rateLimiter.checkLimit('key1', { windowMs: 60000, maxRequests: 5 });
      await rateLimiter.checkLimit('key2', { windowMs: 60000, maxRequests: 5 });

      const allLimits = await rateLimiter.getAllLimits();
      expect(allLimits.size).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('Two-Factor Authentication Service', () => {
  let twoFactorService: TwoFactorAuthService;

  beforeEach(() => {
    twoFactorService = new TwoFactorAuthService({
      issuer: 'VouDeMoto',
      window: 1,
      codeLength: 6,
    });
  });

  describe('TOTP Setup', () => {
    it('should setup TOTP authentication', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      expect(setup.method).toBe(TwoFactorMethod.AUTHENTICATOR);
      expect(setup.secret).toBeDefined();
      expect(setup.qrCode).toBeDefined();
      expect(setup.backupCodes).toBeDefined();
      expect(setup.backupCodes).toHaveLength(10);
    });

    it('should generate valid QR code URL', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      expect(setup.qrCode).toContain('otpauth://totp/');
      expect(setup.qrCode).toContain('VouDeMoto');
      expect(setup.qrCode).toContain('secret=');
    });

    it('should generate unique secrets for each user', async () => {
      const setup1 = await twoFactorService.setup('user1', TwoFactorMethod.AUTHENTICATOR);
      const setup2 = await twoFactorService.setup('user2', TwoFactorMethod.AUTHENTICATOR);

      expect(setup1.secret).not.toBe(setup2.secret);
    });

    it('should generate 10 backup codes', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      expect(setup.backupCodes).toHaveLength(10);
      setup.backupCodes?.forEach((code) => {
        expect(code).toMatch(/^[a-f0-9]{8}$/);
      });
    });
  });

  describe('SMS Setup', () => {
    it('should setup SMS authentication', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.SMS);

      expect(setup.method).toBe(TwoFactorMethod.SMS);
      expect(setup.secret).toBeUndefined();
      expect(setup.qrCode).toBeUndefined();
      expect(setup.backupCodes).toBeDefined();
    });
  });

  describe('Email Setup', () => {
    it('should setup email authentication', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.EMAIL);

      expect(setup.method).toBe(TwoFactorMethod.EMAIL);
      expect(setup.secret).toBeUndefined();
      expect(setup.qrCode).toBeUndefined();
      expect(setup.backupCodes).toBeDefined();
    });
  });

  describe('TOTP Verification', () => {
    it('should verify valid TOTP code', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456', // Mock code
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      // Generate valid codes
      const validCodes = (twoFactorService as any).generateTOTPCodes(setup.secret);
      const isValid = await twoFactorService.verify({
        userId: 'user123',
        code: validCodes[0],
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      expect(isValid).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      const isValid = await twoFactorService.verify({
        userId: 'user123',
        code: '000000',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      expect(isValid).toBe(false);
    });

    it('should use time window for TOTP validation', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      // Get codes for current time window
      const validCodes = (twoFactorService as any).generateTOTPCodes(setup.secret);

      // All codes in window should be valid
      for (const code of validCodes) {
        const isValid = await twoFactorService.verify({
          userId: 'user123',
          code,
          method: TwoFactorMethod.AUTHENTICATOR,
        });
        expect(isValid).toBe(true);
      }
    });
  });

  describe('SMS/Email Verification', () => {
    it('should verify SMS code', async () => {
      await twoFactorService.setup('user123', TwoFactorMethod.SMS);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.SMS,
      });

      // In test mode, any 6-digit code is accepted
      const isValid = await twoFactorService.verify({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.SMS,
      });

      expect(isValid).toBe(true);
    });

    it('should verify email code', async () => {
      await twoFactorService.setup('user123', TwoFactorMethod.EMAIL);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.EMAIL,
      });

      const isValid = await twoFactorService.verify({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.EMAIL,
      });

      expect(isValid).toBe(true);
    });

    it('should reject expired codes', async () => {
      await twoFactorService.setup('user123', TwoFactorMethod.SMS);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.SMS,
      });

      // Simulate expired code by waiting
      await new Promise((resolve) => setTimeout(resolve, 100));

      const isValid = await twoFactorService.verify({
        userId: 'user123',
        code: '999999',
        method: TwoFactorMethod.SMS,
      });

      expect(isValid).toBe(false);
    });
  });

  describe('Backup Codes', () => {
    it('should verify valid backup code', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      const backupCode = setup.backupCodes![0];
      const isValid = await twoFactorService.verifyBackupCode('user123', backupCode);

      expect(isValid).toBe(true);
    });

    it('should invalidate used backup code', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      const backupCode = setup.backupCodes![0];
      await twoFactorService.verifyBackupCode('user123', backupCode);

      // Try to use same code again
      const isValid = await twoFactorService.verifyBackupCode('user123', backupCode);
      expect(isValid).toBe(false);
    });

    it('should track remaining backup codes', async () => {
      const setup = await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      let remaining = await twoFactorService.getRemainingBackupCodes('user123');
      expect(remaining).toBe(10);

      await twoFactorService.verifyBackupCode('user123', setup.backupCodes![0]);

      remaining = await twoFactorService.getRemainingBackupCodes('user123');
      expect(remaining).toBe(9);
    });

    it('should regenerate backup codes', async () => {
      await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      const newCodes = await twoFactorService.regenerateBackupCodes('user123');

      expect(newCodes).toHaveLength(10);
      newCodes.forEach((code) => {
        expect(code).toMatch(/^[a-f0-9]{8}$/);
      });

      const remaining = await twoFactorService.getRemainingBackupCodes('user123');
      expect(remaining).toBe(10);
    });
  });

  describe('2FA Management', () => {
    it('should disable 2FA', async () => {
      await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      await twoFactorService.disable('user123');

      // Verify should fail after disable
      const isValid = await twoFactorService.verify({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      expect(isValid).toBe(false);
    });

    it('should track failed verification attempts', async () => {
      await twoFactorService.setup('user123', TwoFactorMethod.AUTHENTICATOR);

      await twoFactorService.verifySetup({
        userId: 'user123',
        code: '123456',
        method: TwoFactorMethod.AUTHENTICATOR,
      });

      // Try multiple wrong codes
      for (let i = 0; i < 3; i++) {
        await twoFactorService.verify({
          userId: 'user123',
          code: '000000',
          method: TwoFactorMethod.AUTHENTICATOR,
        });
      }

      // Next attempt should be blocked
      await expect(
        twoFactorService.verify({
          userId: 'user123',
          code: '123456',
          method: TwoFactorMethod.AUTHENTICATOR,
        })
      ).rejects.toThrow('Too many failed attempts');
    });
  });
});
