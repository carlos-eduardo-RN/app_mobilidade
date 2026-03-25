/**
 * Badge System
 * Manages badge awards and progress tracking
 */

import { Logger } from '../utils/Logger';
import { RatingService } from './RatingService';
import { ReputationEngine } from './ReputationEngine';
import {
  Badge,
  BadgeType,
  BadgeRequirements,
  UserBadge,
  RatingTag,
} from '../models/Rating';

export class BadgeSystem {
  private logger = new Logger('BadgeSystem');
  
  // Badge definitions
  private badges: Map<BadgeType, Badge> = new Map([
    // Driver badges
    [
      BadgeType.TOP_RATED,
      {
        type: BadgeType.TOP_RATED,
        name: 'Top Rated',
        description: 'Maintain 4.8+ rating with 50+ rides',
        icon: '⭐',
        rarity: 'Epic',
        requirements: {
          minRating: 4.8,
          minRides: 50,
        },
      },
    ],
    [
      BadgeType.VETERAN,
      {
        type: BadgeType.VETERAN,
        name: 'Veteran Driver',
        description: 'Complete 1000+ rides',
        icon: '🏆',
        rarity: 'Legendary',
        requirements: {
          minRides: 1000,
        },
      },
    ],
    [
      BadgeType.PUNCTUAL,
      {
        type: BadgeType.PUNCTUAL,
        name: 'Always On Time',
        description: '90%+ punctuality score with 20+ rides',
        icon: '⏰',
        rarity: 'Rare',
        requirements: {
          minRides: 20,
          minTagCount: { tag: RatingTag.PUNCTUAL, percentage: 30 },
        },
      },
    ],
    [
      BadgeType.FRIENDLY,
      {
        type: BadgeType.FRIENDLY,
        name: 'Super Friendly',
        description: '90%+ friendliness score with 20+ rides',
        icon: '😊',
        rarity: 'Rare',
        requirements: {
          minRides: 20,
          minTagCount: { tag: RatingTag.FRIENDLY, percentage: 30 },
        },
      },
    ],
    [
      BadgeType.CLEAN_VEHICLE,
      {
        type: BadgeType.CLEAN_VEHICLE,
        name: 'Pristine Ride',
        description: '90%+ cleanliness score with 20+ rides',
        icon: '✨',
        rarity: 'Rare',
        requirements: {
          minRides: 20,
          minTagCount: { tag: RatingTag.CLEAN, percentage: 30 },
        },
      },
    ],
    [
      BadgeType.SAFE_DRIVER,
      {
        type: BadgeType.SAFE_DRIVER,
        name: 'Safety First',
        description: '95%+ safety score with 30+ rides',
        icon: '🛡️',
        rarity: 'Epic',
        requirements: {
          minRides: 30,
          minTagCount: { tag: RatingTag.SAFE_DRIVING, percentage: 40 },
        },
      },
    ],
    // Passenger badges
    [
      BadgeType.RESPECTFUL,
      {
        type: BadgeType.RESPECTFUL,
        name: 'Respectful Rider',
        description: 'Maintain 4.8+ rating with 20+ rides',
        icon: '🤝',
        rarity: 'Epic',
        requirements: {
          minRating: 4.8,
          minRides: 20,
        },
      },
    ],
    [
      BadgeType.FREQUENT_RIDER,
      {
        type: BadgeType.FREQUENT_RIDER,
        name: 'Frequent Rider',
        description: 'Complete 100+ rides',
        icon: '🚗',
        rarity: 'Rare',
        requirements: {
          minRides: 100,
        },
      },
    ],
    [
      BadgeType.PERFECT_PASSENGER,
      {
        type: BadgeType.PERFECT_PASSENGER,
        name: 'Perfect Passenger',
        description: 'Maintain 5.0 rating with 10+ rides',
        icon: '💎',
        rarity: 'Legendary',
        requirements: {
          minRating: 5.0,
          minRides: 10,
        },
      },
    ],
    // Special badges
    [
      BadgeType.EARLY_ADOPTER,
      {
        type: BadgeType.EARLY_ADOPTER,
        name: 'Early Adopter',
        description: 'Joined in the first month',
        icon: '🌟',
        rarity: 'Legendary',
        requirements: {
          specialCondition: 'joined_before_2024_02_01',
        },
      },
    ],
    [
      BadgeType.REFERRAL_CHAMPION,
      {
        type: BadgeType.REFERRAL_CHAMPION,
        name: 'Referral Champion',
        description: 'Referred 10+ users',
        icon: '📢',
        rarity: 'Epic',
        requirements: {
          specialCondition: 'min_10_referrals',
        },
      },
    ],
  ]);
  
  // User badges storage
  private userBadges: Map<string, UserBadge[]> = new Map();
  
  constructor(
    private ratingService: RatingService,
    private reputationEngine: ReputationEngine
  ) {}

  /**
   * Check if user is eligible for a badge
   */
  async checkEligibility(
    userId: string,
    badgeType: BadgeType
  ): Promise<{ eligible: boolean; progress: number; missing: string[] }> {
    const badge = this.badges.get(badgeType);
    if (!badge) {
      throw new Error(`Badge not found: ${badgeType}`);
    }
    
    const requirements = badge.requirements;
    const missing: string[] = [];
    let progress = 0;
    let totalChecks = 0;
    let passedChecks = 0;
    
    // Get user data
    const reputation = await this.reputationEngine.getReputation(userId);
    const stats = await this.ratingService.getRatingStats(userId);
    const topTags = await this.ratingService.getTopTags(userId, 10);
    
    // Check rating requirement
    if (requirements.minRating !== undefined) {
      totalChecks++;
      if (stats.averageRating >= requirements.minRating) {
        passedChecks++;
      } else {
        missing.push(
          `Need ${requirements.minRating} rating (current: ${stats.averageRating.toFixed(2)})`
        );
      }
    }
    
    // Check rides requirement
    if (requirements.minRides !== undefined) {
      totalChecks++;
      if (stats.totalRatings >= requirements.minRides) {
        passedChecks++;
      } else {
        missing.push(
          `Need ${requirements.minRides} rides (current: ${stats.totalRatings})`
        );
      }
    }
    
    // Check tag requirement
    if (requirements.minTagCount) {
      totalChecks++;
      const tagData = topTags.find(t => t.tag === requirements.minTagCount!.tag);
      const percentage = tagData?.percentage || 0;
      
      if (percentage >= requirements.minTagCount.percentage) {
        passedChecks++;
      } else {
        missing.push(
          `Need ${requirements.minTagCount.percentage}% ${requirements.minTagCount.tag} tags (current: ${percentage.toFixed(1)}%)`
        );
      }
    }
    
    // Check special conditions
    if (requirements.specialCondition) {
      totalChecks++;
      const meetsCondition = await this.checkSpecialCondition(
        userId,
        requirements.specialCondition
      );
      
      if (meetsCondition) {
        passedChecks++;
      } else {
        missing.push(`Special requirement: ${requirements.specialCondition}`);
      }
    }
    
    progress = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
    
    return {
      eligible: missing.length === 0,
      progress,
      missing,
    };
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId: string, badgeType: BadgeType): Promise<UserBadge> {
    // Check if already has badge
    const existing = this.getUserBadges(userId);
    if (existing.some(b => b.badgeType === badgeType)) {
      throw new Error(`User already has badge: ${badgeType}`);
    }
    
    // Check eligibility
    const eligibility = await this.checkEligibility(userId, badgeType);
    if (!eligibility.eligible) {
      throw new Error(
        `User not eligible for badge: ${eligibility.missing.join(', ')}`
      );
    }
    
    // Create user badge
    const userBadge: UserBadge = {
      userId,
      badgeType,
      awardedAt: new Date(),
      progress: 100,
    };
    
    // Store badge
    const badges = this.userBadges.get(userId) || [];
    badges.push(userBadge);
    this.userBadges.set(userId, badges);
    
    this.logger.info('Badge awarded', { userId, badgeType });
    
    // Here you would send notification
    // await notificationService.send(userId, {
    //   type: 'BADGE_EARNED',
    //   title: 'New Badge Earned!',
    //   body: `You earned the ${badge.name} badge!`,
    // });
    
    return userBadge;
  }

  /**
   * Revoke badge from user
   */
  revokeBadge(userId: string, badgeType: BadgeType): void {
    const badges = this.userBadges.get(userId) || [];
    const filtered = badges.filter(b => b.badgeType !== badgeType);
    
    if (filtered.length === badges.length) {
      throw new Error(`User does not have badge: ${badgeType}`);
    }
    
    this.userBadges.set(userId, filtered);
    
    this.logger.warn('Badge revoked', { userId, badgeType });
  }

  /**
   * Get all badges for user
   */
  getUserBadges(userId: string): UserBadge[] {
    return this.userBadges.get(userId) || [];
  }

  /**
   * Get badge progress for user
   */
  async getBadgeProgress(
    userId: string,
    badgeType: BadgeType
  ): Promise<{ badge: Badge; progress: number; missing: string[] }> {
    const badge = this.badges.get(badgeType);
    if (!badge) {
      throw new Error(`Badge not found: ${badgeType}`);
    }
    
    const eligibility = await this.checkEligibility(userId, badgeType);
    
    return {
      badge,
      progress: eligibility.progress,
      missing: eligibility.missing,
    };
  }

  /**
   * Get all available badges
   */
  getAvailableBadges(): Badge[] {
    return Array.from(this.badges.values());
  }

  /**
   * Get badges by rarity
   */
  getBadgesByRarity(rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary'): Badge[] {
    return Array.from(this.badges.values()).filter(b => b.rarity === rarity);
  }

  /**
   * Check and award all eligible badges for user
   */
  async checkAndAwardBadges(userId: string): Promise<UserBadge[]> {
    const awarded: UserBadge[] = [];
    
    for (const badgeType of this.badges.keys()) {
      try {
        const eligibility = await this.checkEligibility(userId, badgeType);
        
        if (eligibility.eligible) {
          // Check if already has badge
          const existing = this.getUserBadges(userId);
          if (!existing.some(b => b.badgeType === badgeType)) {
            const userBadge = await this.awardBadge(userId, badgeType);
            awarded.push(userBadge);
          }
        }
      } catch (error) {
        // Skip if already has badge or other error
        continue;
      }
    }
    
    if (awarded.length > 0) {
      this.logger.info('Auto-awarded badges', { userId, count: awarded.length });
    }
    
    return awarded;
  }

  /**
   * Get statistics
   */
  getStats() {
    const allBadges = Array.from(this.userBadges.values()).flat();
    
    const badgeCounts = new Map<BadgeType, number>();
    allBadges.forEach(b => {
      badgeCounts.set(b.badgeType, (badgeCounts.get(b.badgeType) || 0) + 1);
    });
    
    return {
      totalBadgesAwarded: allBadges.length,
      uniqueUsers: this.userBadges.size,
      averageBadgesPerUser: this.userBadges.size > 0
        ? allBadges.length / this.userBadges.size
        : 0,
      badgeCounts: Object.fromEntries(badgeCounts),
      mostCommonBadge: Array.from(badgeCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0],
    };
  }

  // ==================== Private Methods ====================

  /**
   * Check special condition
   */
  private async checkSpecialCondition(
    userId: string,
    condition: string
  ): Promise<boolean> {
    // In production, these would check actual user data
    switch (condition) {
      case 'joined_before_2024_02_01':
        // Would check user.createdAt < new Date('2024-02-01')
        return false;
      
      case 'min_10_referrals':
        // Would check user.referralCount >= 10
        return false;
      
      default:
        return false;
    }
  }
}
