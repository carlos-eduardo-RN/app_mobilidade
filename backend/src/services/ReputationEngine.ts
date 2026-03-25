/**
 * Reputation Engine
 * Calculates and manages user reputation scores
 */

import { Logger } from '../utils/Logger';
import { RatingService } from './RatingService';
import {
  Reputation,
  BadgeType,
  RatingTag,
  ReputationUpdateEvent,
} from '../models/Rating';

export class ReputationEngine {
  private logger = new Logger('ReputationEngine');
  
  // In-memory storage (replace with database in production)
  private reputations: Map<string, Reputation> = new Map();
  
  constructor(private ratingService: RatingService) {}

  /**
   * Calculate reputation for a user
   */
  async calculateReputation(userId: string, userType: 'DRIVER' | 'PASSENGER'): Promise<Reputation> {
    const previousReputation = this.reputations.get(userId);
    
    // Get rating stats
    const stats = await this.ratingService.getRatingStats(userId);
    
    // Get top tags
    const topTags = await this.ratingService.getTopTags(userId, 10);
    
    // Calculate component scores
    const punctualityScore = this.calculateTagScore(topTags, [
      RatingTag.PUNCTUAL,
      RatingTag.LATE,
    ]);
    
    const friendlinessScore = this.calculateTagScore(topTags, [
      RatingTag.FRIENDLY,
      RatingTag.RUDE,
    ]);
    
    const cleanlinessScore = this.calculateTagScore(topTags, [
      RatingTag.CLEAN,
      RatingTag.DIRTY_VEHICLE,
    ]);
    
    const safetyScore = this.calculateTagScore(topTags, [
      RatingTag.SAFE_DRIVING,
      RatingTag.UNSAFE_DRIVING,
    ]);
    
    // Calculate overall score (0-100)
    const overallScore = this.calculateOverallScore({
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      punctualityScore,
      friendlinessScore,
      cleanlinessScore,
      safetyScore,
    });
    
    // Determine level (1-10)
    const level = this.calculateLevel(stats.totalRatings, overallScore);
    const experiencePoints = this.calculateExperiencePoints(stats.totalRatings, overallScore);
    
    // Determine badges
    const badges = await this.determineBadges({
      userId,
      userType,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      topTags,
      punctualityScore,
      friendlinessScore,
      cleanlinessScore,
      safetyScore,
    });
    
    // Create reputation object
    const reputation: Reputation = {
      userId,
      userType,
      overallScore,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      punctualityScore,
      friendlinessScore,
      cleanlinessScore,
      safetyScore,
      totalRides: stats.totalRatings, // Simplified
      cancellationRate: 0, // Would come from ride service
      completionRate: 100, // Would come from ride service
      badges,
      level,
      experiencePoints,
      isVerified: false, // Would come from verification service
      isSuspended: false,
      lastCalculatedAt: new Date(),
      createdAt: previousReputation?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    // Store reputation
    this.reputations.set(userId, reputation);
    
    // Emit event if changed
    if (previousReputation) {
      this.emitUpdateEvent(previousReputation, reputation);
    }
    
    this.logger.info('Reputation calculated', {
      userId,
      overallScore,
      level,
      badges: badges.length,
    });
    
    return reputation;
  }

  /**
   * Get reputation for a user
   */
  async getReputation(userId: string): Promise<Reputation | null> {
    return this.reputations.get(userId) || null;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    userType: 'DRIVER' | 'PASSENGER',
    limit: number = 10
  ): Promise<Reputation[]> {
    return Array.from(this.reputations.values())
      .filter(r => r.userType === userType && r.totalRatings >= 5)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }

  /**
   * Get users by badge
   */
  async getUsersByBadge(badgeType: BadgeType): Promise<Reputation[]> {
    return Array.from(this.reputations.values()).filter(r =>
      r.badges.includes(badgeType)
    );
  }

  /**
   * Recalculate all reputations (batch job)
   */
  async recalculateAllReputations(): Promise<void> {
    const userIds = new Set<string>();
    
    // Get all users from ratings
    const allRatings = await this.ratingService.getRatings({ limit: 10000 });
    allRatings.forEach(r => {
      userIds.add(r.toUserId);
    });
    
    this.logger.info('Recalculating reputations', { count: userIds.size });
    
    // Recalculate each user
    for (const userId of userIds) {
      try {
        // Determine user type (simplified - would come from user service)
        const userType = 'DRIVER'; // Would be determined from user service
        await this.calculateReputation(userId, userType);
      } catch (error) {
        this.logger.error('Failed to calculate reputation', { userId, error });
      }
    }
    
    this.logger.info('Recalculation complete');
  }

  /**
   * Get statistics
   */
  getStats() {
    const reputations = Array.from(this.reputations.values());
    
    return {
      totalUsers: reputations.length,
      averageScore: reputations.reduce((sum, r) => sum + r.overallScore, 0) / reputations.length || 0,
      topLevelUsers: reputations.filter(r => r.level === 10).length,
      verifiedUsers: reputations.filter(r => r.isVerified).length,
      suspendedUsers: reputations.filter(r => r.isSuspended).length,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Calculate tag-based score
   */
  private calculateTagScore(
    topTags: Array<{ tag: RatingTag; count: number; percentage: number }>,
    relevantTags: RatingTag[]
  ): number {
    let score = 50; // Start at neutral
    
    topTags.forEach(({ tag, percentage }) => {
      if (relevantTags[0] === tag) {
        // Positive tag
        score += percentage * 0.5; // Up to +50 points
      } else if (relevantTags[1] === tag) {
        // Negative tag
        score -= percentage * 0.5; // Up to -50 points
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate overall score (0-100)
   */
  private calculateOverallScore(params: {
    averageRating: number;
    totalRatings: number;
    punctualityScore: number;
    friendlinessScore: number;
    cleanlinessScore: number;
    safetyScore: number;
  }): number {
    const {
      averageRating,
      totalRatings,
      punctualityScore,
      friendlinessScore,
      cleanlinessScore,
      safetyScore,
    } = params;
    
    // Base score from average rating (0-100)
    let score = (averageRating / 5) * 100;
    
    // Bonus for number of ratings (up to +10)
    const ratingBonus = Math.min(10, Math.log10(totalRatings + 1) * 3);
    score += ratingBonus;
    
    // Component scores (weighted average)
    const componentScore = (
      punctualityScore * 0.3 +
      friendlinessScore * 0.2 +
      cleanlinessScore * 0.25 +
      safetyScore * 0.25
    );
    
    // Blend with base score
    score = score * 0.7 + componentScore * 0.3;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate user level (1-10)
   */
  private calculateLevel(totalRatings: number, overallScore: number): number {
    // Experience from ratings
    const ratingLevel = Math.min(5, Math.floor(totalRatings / 20));
    
    // Quality level from score
    const qualityLevel = Math.floor(overallScore / 20);
    
    // Combined level
    const level = Math.min(10, ratingLevel + qualityLevel);
    
    return Math.max(1, level);
  }

  /**
   * Calculate experience points
   */
  private calculateExperiencePoints(totalRatings: number, overallScore: number): number {
    return totalRatings * 10 + Math.floor(overallScore);
  }

  /**
   * Determine which badges user has earned
   */
  private async determineBadges(params: {
    userId: string;
    userType: 'DRIVER' | 'PASSENGER';
    averageRating: number;
    totalRatings: number;
    topTags: Array<{ tag: RatingTag; count: number; percentage: number }>;
    punctualityScore: number;
    friendlinessScore: number;
    cleanlinessScore: number;
    safetyScore: number;
  }): Promise<BadgeType[]> {
    const badges: BadgeType[] = [];
    
    const {
      userType,
      averageRating,
      totalRatings,
      topTags,
      punctualityScore,
      friendlinessScore,
      cleanlinessScore,
      safetyScore,
    } = params;
    
    if (userType === 'DRIVER') {
      // Top Rated
      if (averageRating >= 4.8 && totalRatings >= 50) {
        badges.push(BadgeType.TOP_RATED);
      }
      
      // Veteran
      if (totalRatings >= 1000) {
        badges.push(BadgeType.VETERAN);
      }
      
      // Punctual
      if (punctualityScore >= 90 && totalRatings >= 20) {
        badges.push(BadgeType.PUNCTUAL);
      }
      
      // Friendly
      if (friendlinessScore >= 90 && totalRatings >= 20) {
        badges.push(BadgeType.FRIENDLY);
      }
      
      // Clean Vehicle
      if (cleanlinessScore >= 90 && totalRatings >= 20) {
        badges.push(BadgeType.CLEAN_VEHICLE);
      }
      
      // Safe Driver
      if (safetyScore >= 95 && totalRatings >= 30) {
        badges.push(BadgeType.SAFE_DRIVER);
      }
    } else {
      // Passenger badges
      // Respectful
      if (averageRating >= 4.8 && totalRatings >= 20) {
        badges.push(BadgeType.RESPECTFUL);
      }
      
      // Frequent Rider
      if (totalRatings >= 100) {
        badges.push(BadgeType.FREQUENT_RIDER);
      }
      
      // Perfect Passenger
      if (averageRating === 5.0 && totalRatings >= 10) {
        badges.push(BadgeType.PERFECT_PASSENGER);
      }
    }
    
    return badges;
  }

  /**
   * Emit reputation update event
   */
  private emitUpdateEvent(
    previous: Reputation,
    current: Reputation
  ): void {
    // Check for changes
    const badgesEarned = current.badges.filter(
      b => !previous.badges.includes(b)
    );
    
    if (
      previous.overallScore !== current.overallScore ||
      previous.level !== current.level ||
      badgesEarned.length > 0
    ) {
      const event: ReputationUpdateEvent = {
        userId: current.userId,
        previousScore: previous.overallScore,
        newScore: current.overallScore,
        previousLevel: previous.level,
        newLevel: current.level,
        badgesEarned,
        timestamp: new Date(),
      };
      
      this.logger.info('Reputation updated', event);
      
      // Here you would emit to event bus, websocket, etc.
      // EventBus.emit('reputation:updated', event);
    }
  }
}
