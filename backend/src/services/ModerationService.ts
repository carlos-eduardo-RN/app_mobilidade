/**
 * Moderation Service
 * Handles rating moderation, toxic content detection, and report management
 */

import { Logger } from '../utils/Logger';
import {
  Rating,
  RatingStatus,
  RatingReport,
  ModerationAction,
} from '../models/Rating';
import { RatingService } from './RatingService';

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  pattern?: RegExp;
  keywords?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'flag' | 'auto-moderate' | 'auto-delete';
}

export class ModerationService {
  private logger = new Logger('ModerationService');
  private ratingService: RatingService;
  
  // Moderation rules
  private rules: ModerationRule[] = [
    {
      id: 'profanity',
      name: 'Profanity Filter',
      description: 'Detects offensive language',
      keywords: ['profanity', 'offensive', 'inappropriate'],
      severity: 'high',
      action: 'auto-moderate',
    },
    {
      id: 'personal_info',
      name: 'Personal Information',
      description: 'Detects phone numbers, emails, addresses',
      pattern: /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      severity: 'medium',
      action: 'flag',
    },
    {
      id: 'spam',
      name: 'Spam Detection',
      description: 'Detects repetitive or promotional content',
      keywords: ['buy now', 'click here', 'visit', 'www.', 'http'],
      severity: 'medium',
      action: 'auto-moderate',
    },
    {
      id: 'harassment',
      name: 'Harassment Detection',
      description: 'Detects threatening or harassing language',
      keywords: ['threat', 'violence', 'harm', 'kill', 'hurt'],
      severity: 'critical',
      action: 'auto-delete',
    },
    {
      id: 'discrimination',
      name: 'Discrimination Filter',
      description: 'Detects discriminatory language',
      keywords: ['racist', 'sexist', 'homophobic', 'discrimination'],
      severity: 'critical',
      action: 'auto-delete',
    },
  ];

  // Moderation actions history
  private actions: Map<string, ModerationAction> = new Map();

  constructor(ratingService: RatingService) {
    this.ratingService = ratingService;
  }

  /**
   * Auto-moderate a rating before it's saved
   */
  async autoModerate(rating: Partial<Rating>): Promise<{
    approved: boolean;
    violations: string[];
    suggestedAction?: 'flag' | 'moderate' | 'delete';
  }> {
    this.logger.info('Auto-moderating rating', { ratingId: rating.id });

    const violations: string[] = [];
    let highestSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let suggestedAction: 'flag' | 'moderate' | 'delete' | undefined;

    // Check comment content
    if (rating.comment) {
      for (const rule of this.rules) {
        if (this.checkRule(rating.comment, rule)) {
          violations.push(rule.id);
          
          // Track highest severity
          if (this.compareSeverity(rule.severity, highestSeverity) > 0) {
            highestSeverity = rule.severity;
            suggestedAction = rule.action === 'auto-moderate' ? 'moderate' :
                             rule.action === 'auto-delete' ? 'delete' : 'flag';
          }
        }
      }
    }

    // Check for suspicious patterns
    if (rating.comment) {
      // All caps (excessive)
      if (rating.comment.length > 20 && rating.comment === rating.comment.toUpperCase()) {
        violations.push('excessive_caps');
        if (highestSeverity === 'low') {
          highestSeverity = 'medium';
          suggestedAction = 'flag';
        }
      }

      // Excessive punctuation
      if ((rating.comment.match(/[!?]{3,}/g) || []).length > 0) {
        violations.push('excessive_punctuation');
      }

      // Very short generic comments (potential spam)
      if (rating.comment.length < 3) {
        violations.push('too_short');
      }
    }

    // Check rating patterns (suspicious ratings)
    if (rating.rating === 1) {
      // Very low rating with no comment might be suspicious
      if (!rating.comment || rating.comment.length < 10) {
        violations.push('low_rating_no_explanation');
      }
    }

    const approved = violations.length === 0 || highestSeverity === 'low';

    this.logger.info('Auto-moderation complete', {
      ratingId: rating.id,
      approved,
      violations,
      suggestedAction,
    });

    return { approved, violations, suggestedAction };
  }

  /**
   * Moderate a rating manually
   */
  async moderateRating(
    ratingId: string,
    action: 'approve' | 'hide' | 'delete',
    moderatorId: string,
    reason: string,
    note?: string
  ): Promise<ModerationAction> {
    this.logger.info('Moderating rating', { ratingId, action, moderatorId });

    const rating = await this.ratingService.getRating(ratingId);
    if (!rating) {
      throw new Error('Rating not found');
    }

    // Create moderation action
    const moderationAction: ModerationAction = {
      id: this.generateId(),
      ratingId,
      action,
      moderatorId,
      reason,
      note,
      timestamp: new Date(),
    };

    this.actions.set(moderationAction.id, moderationAction);

    // Apply the action
    switch (action) {
      case 'hide':
        rating.status = RatingStatus.MODERATED;
        rating.moderationAction = moderationAction;
        rating.moderatedAt = new Date();
        rating.moderatedBy = moderatorId;
        break;
      case 'delete':
        rating.status = RatingStatus.DELETED;
        rating.moderationAction = moderationAction;
        rating.moderatedAt = new Date();
        rating.moderatedBy = moderatorId;
        break;
      case 'approve':
        rating.status = RatingStatus.ACTIVE;
        rating.moderationAction = moderationAction;
        rating.moderatedAt = new Date();
        rating.moderatedBy = moderatorId;
        break;
    }

    this.logger.info('Rating moderated', { ratingId, action });

    return moderationAction;
  }

  /**
   * Review a report and take action
   */
  async reviewReport(
    reportId: string,
    reviewerId: string,
    action: 'approve_report' | 'reject_report' | 'escalate',
    note?: string
  ): Promise<void> {
    this.logger.info('Reviewing report', { reportId, action, reviewerId });

    const report = await this.ratingService.getReport(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    report.status = action === 'approve_report' ? 'approved' :
                   action === 'reject_report' ? 'rejected' : 'escalated';
    report.reviewedBy = reviewerId;
    report.reviewedAt = new Date();
    report.reviewNote = note;

    // If report is approved, moderate the rating
    if (action === 'approve_report') {
      await this.moderateRating(
        report.ratingId,
        'hide',
        reviewerId,
        `Report approved: ${report.reason}`,
        note
      );
    }

    this.logger.info('Report reviewed', { reportId, action });
  }

  /**
   * Get all pending reports
   */
  async getPendingReports(): Promise<RatingReport[]> {
    return await this.ratingService.getPendingReports();
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(): Promise<{
    totalActions: number;
    actionsByType: { [key: string]: number };
    actionsBySeverity: { [key: string]: number };
    recentActions: ModerationAction[];
  }> {
    const actions = Array.from(this.actions.values());

    const actionsByType: { [key: string]: number } = {};
    actions.forEach(a => {
      actionsByType[a.action] = (actionsByType[a.action] || 0) + 1;
    });

    const recentActions = actions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return {
      totalActions: actions.length,
      actionsByType,
      actionsBySeverity: {}, // TODO: Track severity
      recentActions,
    };
  }

  /**
   * Get moderation action by ID
   */
  async getModerationAction(actionId: string): Promise<ModerationAction | undefined> {
    return this.actions.get(actionId);
  }

  /**
   * Get all moderation actions for a rating
   */
  async getRatingModerationHistory(ratingId: string): Promise<ModerationAction[]> {
    return Array.from(this.actions.values())
      .filter(a => a.ratingId === ratingId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get user's moderation history
   */
  async getUserModerationHistory(userId: string): Promise<{
    totalViolations: number;
    violations: string[];
    moderatedRatings: Rating[];
  }> {
    // Get all ratings by the user
    const userRatings = await this.ratingService.queryRatings({
      userId,
      status: RatingStatus.MODERATED,
    });

    const violations = new Set<string>();
    userRatings.forEach(rating => {
      if (rating.moderationAction) {
        violations.add(rating.moderationAction.reason);
      }
    });

    return {
      totalViolations: userRatings.length,
      violations: Array.from(violations),
      moderatedRatings: userRatings,
    };
  }

  /**
   * Add custom moderation rule
   */
  addRule(rule: ModerationRule): void {
    this.rules.push(rule);
    this.logger.info('Moderation rule added', { ruleId: rule.id });
  }

  /**
   * Remove moderation rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      this.logger.info('Moderation rule removed', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Get all rules
   */
  getRules(): ModerationRule[] {
    return [...this.rules];
  }

  /**
   * Clear all moderation data (for testing)
   */
  clearAll(): void {
    this.actions.clear();
    this.logger.info('All moderation data cleared');
  }

  // Private helpers

  private checkRule(text: string, rule: ModerationRule): boolean {
    // Check pattern
    if (rule.pattern) {
      if (rule.pattern.test(text)) {
        return true;
      }
    }

    // Check keywords
    if (rule.keywords) {
      const lowerText = text.toLowerCase();
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  private compareSeverity(
    a: 'low' | 'medium' | 'high' | 'critical',
    b: 'low' | 'medium' | 'high' | 'critical'
  ): number {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    return levels[a] - levels[b];
  }

  private generateId(): string {
    return `moderation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
