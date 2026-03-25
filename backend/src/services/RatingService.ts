/**
 * Rating Service
 * Manages rating creation, retrieval, and statistics
 */

import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';
import {
  Rating,
  RatingInput,
  RatingStats,
  RatingFilter,
  RatingStatus,
  RatingTag,
  RatingReport,
} from '../models/Rating';

export class RatingService {
  private logger = new Logger('RatingService');
  
  // In-memory storage (replace with database in production)
  private ratings: Map<string, Rating> = new Map();
  private reports: Map<string, RatingReport> = new Map();
  
  // Index for fast lookups
  private ratingsByUser: Map<string, string[]> = new Map();
  private ratingsByRide: Map<string, string[]> = new Map();

  /**
   * Create a new rating
   */
  async createRating(input: RatingInput): Promise<Rating> {
    // Validate input
    this.validateRatingInput(input);

    // Check if rating already exists for this ride/user combination
    const existingRating = this.findExistingRating(input.rideId, input.fromUserId);
    if (existingRating) {
      throw new Error('Rating already exists for this ride');
    }

    // Create rating
    const rating: Rating = {
      id: uuidv4(),
      ...input,
      status: RatingStatus.ACTIVE,
      isModerated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check if needs moderation
    if (this.needsModeration(rating)) {
      rating.status = RatingStatus.MODERATED;
      rating.isModerated = true;
      rating.moderationReason = 'Flagged for review';
      this.logger.warn('Rating flagged for moderation', { ratingId: rating.id });
    }

    // Store rating
    this.ratings.set(rating.id, rating);
    this.indexRating(rating);

    this.logger.info('Rating created', {
      ratingId: rating.id,
      rideId: rating.rideId,
      rating: rating.rating,
    });

    return rating;
  }

  /**
   * Get rating by ID
   */
  async getRating(ratingId: string): Promise<Rating | null> {
    return this.ratings.get(ratingId) || null;
  }

  /**
   * Get ratings by filter
   */
  async getRatings(filter: RatingFilter = {}): Promise<Rating[]> {
    let results = Array.from(this.ratings.values());

    // Apply filters
    if (filter.userId) {
      const userRatingIds = this.ratingsByUser.get(filter.userId) || [];
      results = results.filter(r => userRatingIds.includes(r.id));
    }

    if (filter.rideId) {
      const rideRatingIds = this.ratingsByRide.get(filter.rideId) || [];
      results = results.filter(r => rideRatingIds.includes(r.id));
    }

    if (filter.type) {
      results = results.filter(r => r.type === filter.type);
    }

    if (filter.minRating !== undefined) {
      results = results.filter(r => r.rating >= filter.minRating!);
    }

    if (filter.maxRating !== undefined) {
      results = results.filter(r => r.rating <= filter.maxRating!);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(r =>
        filter.tags!.some(tag => r.tags.includes(tag))
      );
    }

    if (filter.status) {
      results = results.filter(r => r.status === filter.status);
    }

    if (filter.startDate) {
      results = results.filter(r => r.createdAt >= filter.startDate!);
    }

    if (filter.endDate) {
      results = results.filter(r => r.createdAt <= filter.endDate!);
    }

    // Sort by date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * Get rating statistics for a user
   */
  async getRatingStats(userId: string): Promise<RatingStats> {
    const ratings = await this.getRatings({ userId });

    const stats: RatingStats = {
      userId,
      totalRatings: ratings.length,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      tagCounts: {},
      recentRatings: ratings.slice(0, 10),
    };

    if (ratings.length === 0) {
      return stats;
    }

    // Calculate average
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    stats.averageRating = sum / ratings.length;

    // Calculate distribution
    ratings.forEach(r => {
      stats.ratingDistribution[r.rating as keyof typeof stats.ratingDistribution]++;
    });

    // Count tags
    ratings.forEach(r => {
      r.tags.forEach(tag => {
        stats.tagCounts[tag] = (stats.tagCounts[tag] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Update rating
   */
  async updateRating(
    ratingId: string,
    updates: Partial<Rating>
  ): Promise<Rating> {
    const rating = this.ratings.get(ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    const updatedRating = {
      ...rating,
      ...updates,
      updatedAt: new Date(),
    };

    this.ratings.set(ratingId, updatedRating);

    this.logger.info('Rating updated', { ratingId });

    return updatedRating;
  }

  /**
   * Delete rating (soft delete)
   */
  async deleteRating(ratingId: string): Promise<void> {
    const rating = this.ratings.get(ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    rating.status = RatingStatus.DELETED;
    rating.updatedAt = new Date();

    this.logger.info('Rating deleted', { ratingId });
  }

  /**
   * Report rating
   */
  async reportRating(
    ratingId: string,
    reporterId: string,
    reason: RatingReport['reason'],
    description?: string
  ): Promise<RatingReport> {
    const rating = this.ratings.get(ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    const report: RatingReport = {
      id: uuidv4(),
      ratingId,
      reporterId,
      reason,
      description,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.reports.set(report.id, report);

    this.logger.warn('Rating reported', {
      reportId: report.id,
      ratingId,
      reason,
    });

    return report;
  }

  /**
   * Get reports for a rating
   */
  async getReports(ratingId: string): Promise<RatingReport[]> {
    return Array.from(this.reports.values()).filter(
      r => r.ratingId === ratingId
    );
  }

  /**
   * Get top-rated users
   */
  async getTopRatedUsers(limit: number = 10): Promise<Array<{
    userId: string;
    averageRating: number;
    totalRatings: number;
  }>> {
    const userRatings = new Map<string, number[]>();

    // Group ratings by toUserId
    Array.from(this.ratings.values())
      .filter(r => r.status === RatingStatus.ACTIVE)
      .forEach(r => {
        const ratings = userRatings.get(r.toUserId) || [];
        ratings.push(r.rating);
        userRatings.set(r.toUserId, ratings);
      });

    // Calculate averages
    const results = Array.from(userRatings.entries())
      .map(([userId, ratings]) => ({
        userId,
        averageRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        totalRatings: ratings.length,
      }))
      .filter(u => u.totalRatings >= 5) // Minimum 5 ratings
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, limit);

    return results;
  }

  /**
   * Calculate satisfaction rate (% of 4-5 star ratings)
   */
  async getSatisfactionRate(userId: string): Promise<number> {
    const ratings = await this.getRatings({ userId });
    
    if (ratings.length === 0) {
      return 0;
    }

    const satisfiedCount = ratings.filter(r => r.rating >= 4).length;
    return (satisfiedCount / ratings.length) * 100;
  }

  /**
   * Get most common tags for a user
   */
  async getTopTags(userId: string, limit: number = 5): Promise<Array<{
    tag: RatingTag;
    count: number;
    percentage: number;
  }>> {
    const stats = await this.getRatingStats(userId);
    
    const sorted = Object.entries(stats.tagCounts)
      .map(([tag, count]) => ({
        tag: tag as RatingTag,
        count,
        percentage: (count / stats.totalRatings) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sorted;
  }

  /**
   * Export ratings for a user (GDPR compliance)
   */
  async exportUserRatings(userId: string): Promise<Rating[]> {
    return this.getRatings({ userId });
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalRatings: this.ratings.size,
      totalReports: this.reports.size,
      activeRatings: Array.from(this.ratings.values()).filter(
        r => r.status === RatingStatus.ACTIVE
      ).length,
      moderatedRatings: Array.from(this.ratings.values()).filter(
        r => r.isModerated
      ).length,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Validate rating input
   */
  private validateRatingInput(input: RatingInput): void {
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (input.fromUserId === input.toUserId) {
      throw new Error('Cannot rate yourself');
    }

    if (input.comment && input.comment.length > 500) {
      throw new Error('Comment too long (max 500 characters)');
    }

    if (input.tags.length > 5) {
      throw new Error('Maximum 5 tags allowed');
    }
  }

  /**
   * Find existing rating
   */
  private findExistingRating(
    rideId: string,
    fromUserId: string
  ): Rating | undefined {
    const rideRatings = this.ratingsByRide.get(rideId) || [];
    return Array.from(this.ratings.values()).find(
      r => r.id && rideRatings.includes(r.id) && r.fromUserId === fromUserId
    );
  }

  /**
   * Check if rating needs moderation
   */
  private needsModeration(rating: Rating): boolean {
    // Flag 1-star ratings with comments
    if (rating.rating === 1 && rating.comment) {
      return true;
    }

    // Flag comments with profanity (simple check)
    if (rating.comment) {
      const profanityWords = ['idiota', 'estúpido', 'burro', 'imbecil'];
      const lowerComment = rating.comment.toLowerCase();
      if (profanityWords.some(word => lowerComment.includes(word))) {
        return true;
      }
    }

    // Flag excessive negative tags
    const negativeTags = [
      RatingTag.LATE,
      RatingTag.RUDE,
      RatingTag.DIRTY_VEHICLE,
      RatingTag.UNSAFE_DRIVING,
      RatingTag.INAPPROPRIATE,
    ];
    const negativeCount = rating.tags.filter(tag =>
      negativeTags.includes(tag)
    ).length;
    if (negativeCount >= 3) {
      return true;
    }

    return false;
  }

  /**
   * Index rating for fast lookups
   */
  private indexRating(rating: Rating): void {
    // Index by toUserId
    const userRatings = this.ratingsByUser.get(rating.toUserId) || [];
    userRatings.push(rating.id);
    this.ratingsByUser.set(rating.toUserId, userRatings);

    // Index by rideId
    const rideRatings = this.ratingsByRide.get(rating.rideId) || [];
    rideRatings.push(rating.id);
    this.ratingsByRide.set(rating.rideId, rideRatings);
  }
}
