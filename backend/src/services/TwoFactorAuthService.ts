/**
 * Two-Factor Authentication Service
 * 
 * Handles 2FA setup and verification via SMS, Authenticator apps, and Email
 */

import * as crypto from 'crypto';
import { Logger } from '../utils/Logger';
import {
  TwoFactorMethod,
  TwoFactorSetup,
  TwoFactorVerifyInput,
  TwoFactorConfig,
  SecurityEventType,
  SecurityEvent,
} from '../models/Security';

/**
 * Two-Factor Auth Service Configuration
 */
interface TwoFactorAuthServiceConfig {
  twoFactor: TwoFactorConfig;
  smsProvider?: 'twilio' | 'aws-sns';  // For SMS sending
  emailProvider?: 'sendgrid' | 'ses';  // For email sending
}

/**
 * Pending Verification
 */
interface PendingVerification {
  userId: string;
  method: TwoFactorMethod;
  code: string;
  secret?: string;  // For authenticator
  expiresAt: Date;
  attempts: number;
}

/**
 * Two-Factor Auth Service Class
 */
export class TwoFactorAuthService {
  private logger: Logger;
  private config: TwoFactorAuthServiceConfig;
  
  // In-memory storage (in production, use Redis)
  private pendingVerifications: Map<string, PendingVerification> = new Map();
  private userSecrets: Map<string, string> = new Map(); // userId -> authenticator secret
  private backupCodes: Map<string, string[]> = new Map(); // userId -> backup codes
  private securityEvents: SecurityEvent[] = [];

  constructor(config: TwoFactorAuthServiceConfig) {
    this.logger = new Logger('TwoFactorAuthService');
    this.config = {
      smsProvider: 'twilio',
      emailProvider: 'sendgrid',
      ...config,
    };
  }

  /**
   * Setup Two-Factor Authentication
   */
  async setup(userId: string, method: TwoFactorMethod): Promise<TwoFactorSetup> {
    this.logger.info(`Setting up 2FA for user ${userId} with method: ${method}`);

    const setup: TwoFactorSetup = { method };

    switch (method) {
      case TwoFactorMethod.AUTHENTICATOR:
        setup.secret = this.generateSecret();
        setup.qrCode = this.generateQRCode(userId, setup.secret);
        setup.backupCodes = this.generateBackupCodes();
        
        // Store temporarily (user must verify before it's active)
        this.userSecrets.set(userId, setup.secret);
        this.backupCodes.set(userId, setup.backupCodes);
        break;

      case TwoFactorMethod.SMS:
      case TwoFactorMethod.EMAIL:
        // Send verification code
        const code = this.generateCode();
        await this.sendVerificationCode(userId, method, code);
        
        // Store pending verification
        this.pendingVerifications.set(this.getVerificationKey(userId, method), {
          userId,
          method,
          code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          attempts: 0,
        });
        break;
    }

    return setup;
  }

  /**
   * Verify Setup Code
   */
  async verifySetup(input: TwoFactorVerifyInput): Promise<boolean> {
    this.logger.info(`Verifying 2FA setup for user: ${input.userId}`);

    const isValid = await this.verify(input);

    if (isValid) {
      // Log security event
      await this.logSecurityEvent({
        userId: input.userId,
        type: SecurityEventType.TWO_FACTOR_ENABLED,
        description: `Two-factor authentication enabled via ${input.method}`,
      });

      this.logger.info(`2FA enabled successfully for user: ${input.userId}`);
    }

    return isValid;
  }

  /**
   * Verify Two-Factor Code
   */
  async verify(input: TwoFactorVerifyInput): Promise<boolean> {
    this.logger.debug(`Verifying 2FA code for user: ${input.userId}`);

    let isValid = false;

    switch (input.method) {
      case TwoFactorMethod.AUTHENTICATOR:
        isValid = await this.verifyTOTP(input.userId, input.code);
        break;

      case TwoFactorMethod.SMS:
      case TwoFactorMethod.EMAIL:
        isValid = await this.verifyCode(input.userId, input.method, input.code);
        break;
    }

    if (isValid) {
      // Log security event
      await this.logSecurityEvent({
        userId: input.userId,
        type: SecurityEventType.TWO_FACTOR_VERIFIED,
        description: `Two-factor authentication verified via ${input.method}`,
      });
    } else {
      // Track failed attempt
      const key = this.getVerificationKey(input.userId, input.method);
      const pending = this.pendingVerifications.get(key);
      if (pending) {
        pending.attempts++;
        
        // Lock after too many attempts
        if (pending.attempts >= 3) {
          this.pendingVerifications.delete(key);
          this.logger.warn(`2FA locked for user ${input.userId} after 3 failed attempts`);
        }
      }
    }

    return isValid;
  }

  /**
   * Verify TOTP Code (Authenticator App)
   */
  private async verifyTOTP(userId: string, code: string): Promise<boolean> {
    const secret = this.userSecrets.get(userId);
    
    if (!secret) {
      return false;
    }

    // Generate valid codes for current time window
    const validCodes = this.generateTOTPCodes(secret);
    
    return validCodes.includes(code);
  }

  /**
   * Verify SMS/Email Code
   */
  private async verifyCode(
    userId: string,
    method: TwoFactorMethod,
    code: string
  ): Promise<boolean> {
    const key = this.getVerificationKey(userId, method);
    const pending = this.pendingVerifications.get(key);

    if (!pending) {
      return false;
    }

    // Check expiration
    if (new Date() > pending.expiresAt) {
      this.pendingVerifications.delete(key);
      return false;
    }

    // Check code
    if (pending.code !== code) {
      return false;
    }

    // Valid - clean up
    this.pendingVerifications.delete(key);
    return true;
  }

  /**
   * Verify Backup Code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    this.logger.info(`Verifying backup code for user: ${userId}`);

    const codes = this.backupCodes.get(userId);
    
    if (!codes || !codes.includes(code)) {
      return false;
    }

    // Remove used backup code
    const index = codes.indexOf(code);
    codes.splice(index, 1);
    this.backupCodes.set(userId, codes);

    // Log security event
    await this.logSecurityEvent({
      userId,
      type: SecurityEventType.TWO_FACTOR_VERIFIED,
      description: 'Two-factor authentication verified via backup code',
    });

    this.logger.info(`Backup code verified for user: ${userId}`);
    return true;
  }

  /**
   * Disable Two-Factor Authentication
   */
  async disable(userId: string): Promise<void> {
    this.logger.info(`Disabling 2FA for user: ${userId}`);

    // Remove all 2FA data
    this.userSecrets.delete(userId);
    this.backupCodes.delete(userId);
    
    // Remove pending verifications
    for (const method of Object.values(TwoFactorMethod)) {
      const key = this.getVerificationKey(userId, method);
      this.pendingVerifications.delete(key);
    }

    // Log security event
    await this.logSecurityEvent({
      userId,
      type: SecurityEventType.TWO_FACTOR_DISABLED,
      description: 'Two-factor authentication disabled',
    });

    this.logger.info(`2FA disabled for user: ${userId}`);
  }

  /**
   * Regenerate Backup Codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    this.logger.info(`Regenerating backup codes for user: ${userId}`);

    const newCodes = this.generateBackupCodes();
    this.backupCodes.set(userId, newCodes);

    return newCodes;
  }

  /**
   * Get Remaining Backup Codes Count
   */
  async getRemainingBackupCodes(userId: string): Promise<number> {
    const codes = this.backupCodes.get(userId);
    return codes ? codes.length : 0;
  }

  /**
   * Send Verification Code
   */
  private async sendVerificationCode(
    userId: string,
    method: TwoFactorMethod,
    code: string
  ): Promise<void> {
    this.logger.info(`Sending ${method} verification code to user: ${userId}`);

    // In production, integrate with SMS/Email providers
    switch (method) {
      case TwoFactorMethod.SMS:
        // await this.sendSMS(userId, `Your verification code is: ${code}`);
        this.logger.debug(`[MOCK SMS] Code: ${code}`);
        break;

      case TwoFactorMethod.EMAIL:
        // await this.sendEmail(userId, 'Verification Code', `Your code is: ${code}`);
        this.logger.debug(`[MOCK EMAIL] Code: ${code}`);
        break;
    }
  }

  /**
   * Generate Secret for Authenticator
   */
  private generateSecret(): string {
    // Generate base32 secret (in production, use speakeasy or similar)
    const buffer = crypto.randomBytes(20);
    return buffer.toString('base64').replace(/[^A-Z2-7]/gi, '').substr(0, 32);
  }

  /**
   * Generate QR Code URL
   */
  private generateQRCode(userId: string, secret: string): string {
    const issuer = this.config.twoFactor.issuer;
    const account = `${issuer}:${userId}`;
    
    // otpauth:// URL format
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    
    // In production, generate actual QR code image
    // For now, return the URL that can be used to generate QR code
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
  }

  /**
   * Generate TOTP Codes (Time-based One-Time Password)
   */
  private generateTOTPCodes(secret: string): string[] {
    // Simplified TOTP implementation
    // In production, use speakeasy or similar library
    const timeStep = 30; // 30 seconds
    const window = this.config.twoFactor.window; // Number of time steps to check
    const currentTime = Math.floor(Date.now() / 1000);
    
    const codes: string[] = [];
    
    for (let i = -window; i <= window; i++) {
      const time = Math.floor((currentTime + (i * timeStep)) / timeStep);
      const code = this.generateHOTP(secret, time);
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Generate HOTP Code (HMAC-based One-Time Password)
   */
  private generateHOTP(secret: string, counter: number): string {
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));
    hmac.update(counterBuffer);
    
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0xf;
    const binary = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);
    
    const otp = binary % Math.pow(10, this.config.twoFactor.codeLength);
    return otp.toString().padStart(this.config.twoFactor.codeLength, '0');
  }

  /**
   * Generate Verification Code (6 digits)
   */
  private generateCode(): string {
    const length = this.config.twoFactor.codeLength;
    const max = Math.pow(10, length);
    const code = Math.floor(Math.random() * max);
    return code.toString().padStart(length, '0');
  }

  /**
   * Generate Backup Codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Get Verification Key
   */
  private getVerificationKey(userId: string, method: TwoFactorMethod): string {
    return `${userId}:${method}`;
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
    this.logger.info(`Security event logged: ${event.type}`);
  }

  /**
   * Get Security Events
   */
  async getSecurityEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    return this.securityEvents
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
