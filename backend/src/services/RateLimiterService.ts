/**
 * Rate Limiter Service
 * 
 * Advanced rate limiting with Redis-like storage and flexible configuration
 */

import { Logger } from '../utils/Logger';
import { RateLimitConfig, RateLimitResult } from '../models/Security';

/**
 * Rate Limit Entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: Date;
  timestamps: number[];
}

/**
 * Rate Limiter Service Configuration
 */
interface RateLimiterServiceConfig {
  defaultConfig?: RateLimitConfig;
  enableLogging?: boolean;
}

/**
 * Rate Limiter Service Class
 */
export class RateLimiterService {
  private logger: Logger;
  private config: RateLimiterServiceConfig;
  
  // In-memory storage (in production, use Redis)
  private limits: Map<string, RateLimitEntry> = new Map();

  constructor(config: RateLimiterServiceConfig = {}) {
    this.logger = new Logger('RateLimiterService');
    this.config = {
      defaultConfig: {
        windowMs: 60000, // 1 minute
        maxRequests: 100,
        message: 'Too many requests, please try again later.',
      },
      enableLogging: true,
      ...config,
    };
  }

  /**
   * Check Rate Limit
   */
  async checkLimit(
    key: string,
    config?: RateLimitConfig
  ): Promise<RateLimitResult> {
    const rateLimitConfig = config || this.config.defaultConfig!;
    const now = Date.now();

    // Get or create entry
    let entry = this.limits.get(key);
    
    if (!entry || now >= entry.resetAt.getTime()) {
      // Create new entry
      entry = {
        count: 0,
        resetAt: new Date(now + rateLimitConfig.windowMs),
        timestamps: [],
      };
      this.limits.set(key, entry);
    }

    // Remove old timestamps
    entry.timestamps = entry.timestamps.filter(
      t => now - t < rateLimitConfig.windowMs
    );

    // Check if limit exceeded
    const allowed = entry.timestamps.length < rateLimitConfig.maxRequests;
    
    if (allowed) {
      // Add new timestamp
      entry.timestamps.push(now);
      entry.count = entry.timestamps.length;
    }

    const remaining = Math.max(0, rateLimitConfig.maxRequests - entry.timestamps.length);
    const retryAfter = allowed ? undefined : Math.ceil((entry.resetAt.getTime() - now) / 1000);

    if (this.config.enableLogging && !allowed) {
      this.logger.warn(`Rate limit exceeded for key: ${key}`);
    }

    return {
      allowed,
      remaining,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  /**
   * Increment Counter
   */
  async increment(key: string, config?: RateLimitConfig): Promise<RateLimitResult> {
    return this.checkLimit(key, config);
  }

  /**
   * Reset Limit for Key
   */
  async reset(key: string): Promise<void> {
    this.logger.info(`Resetting rate limit for key: ${key}`);
    this.limits.delete(key);
  }

  /**
   * Get Current Count
   */
  async getCount(key: string): Promise<number> {
    const entry = this.limits.get(key);
    return entry ? entry.count : 0;
  }

  /**
   * Get Remaining Requests
   */
  async getRemaining(key: string, config?: RateLimitConfig): Promise<number> {
    const rateLimitConfig = config || this.config.defaultConfig!;
    const entry = this.limits.get(key);
    
    if (!entry) {
      return rateLimitConfig.maxRequests;
    }

    const now = Date.now();
    const validTimestamps = entry.timestamps.filter(
      t => now - t < rateLimitConfig.windowMs
    );

    return Math.max(0, rateLimitConfig.maxRequests - validTimestamps.length);
  }

  /**
   * Check if Limit Exceeded
   */
  async isLimitExceeded(key: string, config?: RateLimitConfig): Promise<boolean> {
    const result = await this.checkLimit(key, config);
    return !result.allowed;
  }

  /**
   * Create Rate Limit Key
   */
  createKey(...parts: string[]): string {
    return parts.join(':');
  }

  /**
   * Clean Up Expired Entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetAt.getTime()) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get All Limits (for monitoring)
   */
  async getAllLimits(): Promise<Map<string, RateLimitEntry>> {
    return new Map(this.limits);
  }

  /**
   * Presets for Common Use Cases
   */
  static presets = {
    // Authentication endpoints
    login: {
      windowMs: 900000, // 15 minutes
      maxRequests: 5,
      message: 'Too many login attempts. Please try again in 15 minutes.',
    },
    register: {
      windowMs: 3600000, // 1 hour
      maxRequests: 3,
      message: 'Too many registration attempts. Please try again in 1 hour.',
    },
    passwordReset: {
      windowMs: 3600000, // 1 hour
      maxRequests: 3,
      message: 'Too many password reset requests. Please try again in 1 hour.',
    },
    twoFactor: {
      windowMs: 300000, // 5 minutes
      maxRequests: 3,
      message: 'Too many 2FA attempts. Please try again in 5 minutes.',
    },
    
    // API endpoints
    api: {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      message: 'Too many API requests. Please try again later.',
    },
    apiStrict: {
      windowMs: 60000, // 1 minute
      maxRequests: 30,
      message: 'Rate limit exceeded. Please slow down.',
    },
    
    // Search/Query endpoints
    search: {
      windowMs: 60000, // 1 minute
      maxRequests: 20,
      message: 'Too many search requests. Please try again later.',
    },
    
    // Upload endpoints
    upload: {
      windowMs: 3600000, // 1 hour
      maxRequests: 10,
      message: 'Too many upload requests. Please try again in 1 hour.',
    },
    
    // SMS/Email sending
    sms: {
      windowMs: 3600000, // 1 hour
      maxRequests: 5,
      message: 'Too many SMS requests. Please try again in 1 hour.',
    },
    email: {
      windowMs: 3600000, // 1 hour
      maxRequests: 10,
      message: 'Too many email requests. Please try again in 1 hour.',
    },
  };
}
