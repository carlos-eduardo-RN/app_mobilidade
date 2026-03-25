/**
 * Moderation Service Tests
 * Tests for content moderation and report management
 */

import { ModerationService } from '../services/ModerationService';
import { RatingService } from '../services/RatingService';
import {
  RatingType,
  RatingStatus,
  RatingInput,
} from '../models/Rating';

describe('ModerationService', () => {
  let service: ModerationService;
  let ratingService: RatingService;

  beforeEach(() => {
    ratingService = new RatingService();
    service = new ModerationService(ratingService);
  });

  afterEach(() => {
    service.clearAll();
    ratingService.clearAll();
  });

  describe('autoModerate', () => {
    it('should approve clean content', async () => {
      const rating = {
        id: 'rating1',
        comment: 'Great service, very professional!',
        rating: 5,
      };

      const result = await service.autoModerate(rating);

      expect(result.approved).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should flag profanity', async () => {
      const rating = {
        id: 'rating1',
        comment: 'This was profanity here!',
        rating: 1,
      };

      const result = await service.autoModerate(rating);

      expect(result.approved).toBe(false);
      expect(result.violations).toContain('profanity');
    });

    it('should flag personal information', async () => {
      const rating = {
        id: 'rating1',
        comment: 'Call me at 555-123-4567',
        rating: 5,
      };

      const result = await service.autoModerate(rating);

      expect(result.approved).toBe(false);
      expect(result.violations).toContain('personal_info');
    });

    it('should flag spam content', async () => {
      const rating = {
        id: 'rating1',
        comment: 'Buy now at www.example.com!',
        rating: 5,
      };

      const result = await service.autoModerate(rating);

      expect(result.approved).toBe(false);
      expect(result.violations).toContain('spam');
    });

    it('should flag harassment', async () => {
      const rating = {
        id: 'rating1',
        comment: 'I will hurt you!',
        rating: 1,
      };

      const result = await service.autoModerate(rating);

      expect(result.approved).toBe(false);
      expect(result.violations).toContain('harassment');
      expect(result.suggestedAction).toBe('delete');
    });

    it('should flag excessive caps', async () => {
      const rating = {
        id: 'rating1',
        comment: 'THIS IS ALL CAPS AND VERY ANNOYING!!!',
        rating: 1,
      };

      const result = await service.autoModerate(rating);

      expect(result.violations).toContain('excessive_caps');
    });

    it('should flag very short comments', async () => {
      const rating = {
        id: 'rating1',
        comment: 'ok',
        rating: 5,
      };

      const result = await service.autoModerate(rating);

      expect(result.violations).toContain('too_short');
    });

    it('should flag low rating without explanation', async () => {
      const rating = {
        id: 'rating1',
        rating: 1,
      };

      const result = await service.autoModerate(rating);

      expect(result.violations).toContain('low_rating_no_explanation');
    });

    it('should handle multiple violations', async () => {
      const rating = {
        id: 'rating1',
        comment: 'PROFANITY AND SPAM www.example.com!!!',
        rating: 1,
      };

      const result = await service.autoModerate(rating);

      expect(result.approved).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
    });
  });

  describe('moderateRating', () => {
    it('should hide a rating', async () => {
      const ratingInput: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        comment: 'Inappropriate content',
        tags: [],
      };

      const rating = await ratingService.createRating(ratingInput);

      const action = await service.moderateRating(
        rating.id,
        'hide',
        'moderator1',
        'Inappropriate language'
      );

      expect(action).toBeDefined();
      expect(action.action).toBe('hide');
      expect(action.ratingId).toBe(rating.id);

      const updated = await ratingService.getRating(rating.id);
      expect(updated?.status).toBe(RatingStatus.MODERATED);
    });

    it('should delete a rating', async () => {
      const ratingInput: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        comment: 'Very inappropriate',
        tags: [],
      };

      const rating = await ratingService.createRating(ratingInput);

      await service.moderateRating(
        rating.id,
        'delete',
        'moderator1',
        'Severe violation'
      );

      const updated = await ratingService.getRating(rating.id);
      expect(updated?.status).toBe(RatingStatus.DELETED);
    });

    it('should approve a rating', async () => {
      const ratingInput: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        comment: 'Great service',
        tags: [],
      };

      const rating = await ratingService.createRating(ratingInput);

      await service.moderateRating(
        rating.id,
        'approve',
        'moderator1',
        'Content is appropriate'
      );

      const updated = await ratingService.getRating(rating.id);
      expect(updated?.status).toBe(RatingStatus.ACTIVE);
    });

    it('should reject moderation of non-existent rating', async () => {
      await expect(
        service.moderateRating('invalid-id', 'hide', 'moderator1', 'Test')
      ).rejects.toThrow('Rating not found');
    });

    it('should track moderator information', async () => {
      const ratingInput: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        tags: [],
      };

      const rating = await ratingService.createRating(ratingInput);

      await service.moderateRating(
        rating.id,
        'hide',
        'moderator1',
        'Test reason',
        'Test note'
      );

      const updated = await ratingService.getRating(rating.id);
      expect(updated?.moderatedBy).toBe('moderator1');
      expect(updated?.moderatedAt).toBeInstanceOf(Date);
    });
  });

  describe('reviewReport', () => {
    it('should approve a report and moderate rating', async () => {
      const ratingInput: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        comment: 'Inappropriate',
        tags: [],
      };

      const rating = await ratingService.createRating(ratingInput);
      const report = await ratingService.reportRating(
        rating.id,
        'reporter1',
        'inappropriate'
      );

      await service.reviewReport(
        report.id,
        'moderator1',
        'approve_report',
        'Valid report'
      );

      const updatedRating = await ratingService.getRating(rating.id);
      expect(updatedRating?.status).toBe(RatingStatus.MODERATED);

      const updatedReport = await ratingService.getReport(report.id);
      expect(updatedReport?.status).toBe('approved');
      expect(updatedReport?.reviewedBy).toBe('moderator1');
    });

    it('should reject a report', async () => {
      const ratingInput: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        comment: 'Good service',
        tags: [],
      };

      const rating = await ratingService.createRating(ratingInput);
      const report = await ratingService.reportRating(
        rating.id,
        'reporter1',
        'spam'
      );

      await service.reviewReport(
        report.id,
        'moderator1',
        'reject_report',
        'Not a valid concern'
      );

      const updatedReport = await ratingService.getReport(report.id);
      expect(updatedReport?.status).toBe('rejected');

      const updatedRating = await ratingService.getRating(rating.id);
      expect(updatedRating?.status).toBe(RatingStatus.ACTIVE);
    });

    it('should escalate a report', async () => {
      const ratingInput: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        tags: [],
      };

      const rating = await ratingService.createRating(ratingInput);
      const report = await ratingService.reportRating(
        rating.id,
        'reporter1',
        'severe'
      );

      await service.reviewReport(
        report.id,
        'moderator1',
        'escalate',
        'Needs senior review'
      );

      const updatedReport = await ratingService.getReport(report.id);
      expect(updatedReport?.status).toBe('escalated');
    });
  });

  describe('getModerationStats', () => {
    it('should track moderation actions', async () => {
      const rating1 = await ratingService.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        tags: [],
      });

      const rating2 = await ratingService.createRating({
        rideId: 'ride2',
        fromUserId: 'passenger2',
        toUserId: 'driver2',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        tags: [],
      });

      await service.moderateRating(rating1.id, 'hide', 'moderator1', 'Test1');
      await service.moderateRating(rating2.id, 'delete', 'moderator1', 'Test2');

      const stats = await service.getModerationStats();

      expect(stats.totalActions).toBe(2);
      expect(stats.actionsByType['hide']).toBe(1);
      expect(stats.actionsByType['delete']).toBe(1);
      expect(stats.recentActions).toHaveLength(2);
    });
  });

  describe('getRatingModerationHistory', () => {
    it('should get moderation history for a rating', async () => {
      const rating = await ratingService.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        tags: [],
      });

      await service.moderateRating(rating.id, 'hide', 'moderator1', 'First action');
      await service.moderateRating(rating.id, 'approve', 'moderator2', 'Approved');

      const history = await service.getRatingModerationHistory(rating.id);

      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('approve'); // Most recent first
      expect(history[1].action).toBe('hide');
    });
  });

  describe('getUserModerationHistory', () => {
    it('should get user violation history', async () => {
      const rating1 = await ratingService.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        comment: 'Bad',
        tags: [],
      });

      const rating2 = await ratingService.createRating({
        rideId: 'ride2',
        fromUserId: 'passenger1',
        toUserId: 'driver2',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        comment: 'Worse',
        tags: [],
      });

      await service.moderateRating(rating1.id, 'hide', 'moderator1', 'Inappropriate');
      await service.moderateRating(rating2.id, 'hide', 'moderator1', 'Spam');

      const history = await service.getUserModerationHistory('passenger1');

      expect(history.totalViolations).toBe(2);
      expect(history.violations).toContain('Inappropriate');
      expect(history.violations).toContain('Spam');
      expect(history.moderatedRatings).toHaveLength(2);
    });
  });

  describe('moderation rules', () => {
    it('should add custom rule', () => {
      const customRule = {
        id: 'custom1',
        name: 'Custom Rule',
        description: 'Test rule',
        keywords: ['test'],
        severity: 'low' as const,
        action: 'flag' as const,
      };

      service.addRule(customRule);

      const rules = service.getRules();
      expect(rules).toContainEqual(customRule);
    });

    it('should remove rule', () => {
      const initialCount = service.getRules().length;

      service.addRule({
        id: 'temp',
        name: 'Temp',
        description: 'Temp',
        severity: 'low',
        action: 'flag',
      });

      expect(service.getRules()).toHaveLength(initialCount + 1);

      service.removeRule('temp');

      expect(service.getRules()).toHaveLength(initialCount);
    });

    it('should get all rules', () => {
      const rules = service.getRules();
      
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('id');
      expect(rules[0]).toHaveProperty('name');
      expect(rules[0]).toHaveProperty('severity');
    });
  });

  describe('edge cases', () => {
    it('should handle empty comment', async () => {
      const rating = {
        id: 'rating1',
        rating: 5,
      };

      const result = await service.autoModerate(rating);
      expect(result).toBeDefined();
    });

    it('should handle very long comments', async () => {
      const rating = {
        id: 'rating1',
        comment: 'A'.repeat(10000),
        rating: 5,
      };

      const result = await service.autoModerate(rating);
      expect(result).toBeDefined();
    });

    it('should handle special characters', async () => {
      const rating = {
        id: 'rating1',
        comment: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        rating: 5,
      };

      const result = await service.autoModerate(rating);
      expect(result).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should moderate efficiently', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        await service.autoModerate({
          id: `rating${i}`,
          comment: 'Test comment for moderation',
          rating: 5,
        });
      }

      const time = Date.now() - start;
      expect(time).toBeLessThan(1000); // Should moderate 100 items in < 1s
    });
  });
});
