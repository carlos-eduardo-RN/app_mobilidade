/**
 * Rating Service Tests
 * Comprehensive tests for the rating system
 */

import { RatingService } from '../services/RatingService';
import {
  RatingType,
  RatingStatus,
  RatingTag,
  RatingInput,
} from '../models/Rating';

describe('RatingService', () => {
  let service: RatingService;

  beforeEach(() => {
    service = new RatingService();
  });

  afterEach(() => {
    service.clearAll();
  });

  describe('createRating', () => {
    it('should create a valid rating', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        comment: 'Excellent driver!',
        tags: [RatingTag.PUNCTUAL, RatingTag.FRIENDLY],
      };

      const rating = await service.createRating(input);

      expect(rating).toBeDefined();
      expect(rating.id).toBeDefined();
      expect(rating.rating).toBe(5);
      expect(rating.status).toBe(RatingStatus.ACTIVE);
      expect(rating.createdAt).toBeInstanceOf(Date);
    });

    it('should reject rating with invalid value', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 6, // Invalid
        tags: [],
      };

      await expect(service.createRating(input)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should reject duplicate ratings', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      };

      await service.createRating(input);
      
      await expect(service.createRating(input)).rejects.toThrow(
        'Rating already exists for this ride'
      );
    });

    it('should allow both driver and passenger to rate same ride', async () => {
      const passengerRating: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      };

      const driverRating: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'driver1',
        toUserId: 'passenger1',
        type: RatingType.DRIVER_TO_PASSENGER,
        rating: 4,
        tags: [],
      };

      const rating1 = await service.createRating(passengerRating);
      const rating2 = await service.createRating(driverRating);

      expect(rating1.id).not.toBe(rating2.id);
    });

    it('should accept rating without comment', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      };

      const rating = await service.createRating(input);
      expect(rating.comment).toBeUndefined();
    });

    it('should reject invalid tags', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: ['invalid_tag' as any],
      };

      await expect(service.createRating(input)).rejects.toThrow();
    });
  });

  describe('updateRating', () => {
    it('should update rating value', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 4,
        tags: [],
      };

      const rating = await service.createRating(input);
      const updated = await service.updateRating(rating.id, { rating: 5 });

      expect(updated.rating).toBe(5);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(rating.createdAt.getTime());
    });

    it('should update comment', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      };

      const rating = await service.createRating(input);
      const updated = await service.updateRating(rating.id, {
        comment: 'Great service!',
      });

      expect(updated.comment).toBe('Great service!');
    });

    it('should update tags', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [RatingTag.PUNCTUAL],
      };

      const rating = await service.createRating(input);
      const updated = await service.updateRating(rating.id, {
        tags: [RatingTag.PUNCTUAL, RatingTag.FRIENDLY],
      });

      expect(updated.tags).toHaveLength(2);
      expect(updated.tags).toContain(RatingTag.FRIENDLY);
    });

    it('should reject update to non-existent rating', async () => {
      await expect(
        service.updateRating('invalid-id', { rating: 5 })
      ).rejects.toThrow('Rating not found');
    });
  });

  describe('deleteRating', () => {
    it('should soft delete rating', async () => {
      const input: RatingInput = {
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      };

      const rating = await service.createRating(input);
      await service.deleteRating(rating.id);

      const retrieved = await service.getRating(rating.id);
      expect(retrieved?.status).toBe(RatingStatus.DELETED);
    });

    it('should reject delete of non-existent rating', async () => {
      await expect(service.deleteRating('invalid-id')).rejects.toThrow(
        'Rating not found'
      );
    });
  });

  describe('getRatingStats', () => {
    it('should calculate correct average rating', async () => {
      const ratings = [5, 4, 5, 3, 4];
      
      for (let i = 0; i < ratings.length; i++) {
        await service.createRating({
          rideId: `ride${i}`,
          fromUserId: `passenger${i}`,
          toUserId: 'driver1',
          type: RatingType.PASSENGER_TO_DRIVER,
          rating: ratings[i],
          tags: [],
        });
      }

      const stats = await service.getRatingStats('driver1', 'DRIVER');
      
      expect(stats.totalRatings).toBe(5);
      expect(stats.averageRating).toBe(4.2);
    });

    it('should calculate rating distribution', async () => {
      const ratings = [5, 5, 4, 3, 5];
      
      for (let i = 0; i < ratings.length; i++) {
        await service.createRating({
          rideId: `ride${i}`,
          fromUserId: `passenger${i}`,
          toUserId: 'driver1',
          type: RatingType.PASSENGER_TO_DRIVER,
          rating: ratings[i],
          tags: [],
        });
      }

      const stats = await service.getRatingStats('driver1', 'DRIVER');
      
      expect(stats.ratingDistribution[5]).toBe(3);
      expect(stats.ratingDistribution[4]).toBe(1);
      expect(stats.ratingDistribution[3]).toBe(1);
      expect(stats.ratingDistribution[2]).toBe(0);
      expect(stats.ratingDistribution[1]).toBe(0);
    });

    it('should identify top tags', async () => {
      await service.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [RatingTag.PUNCTUAL, RatingTag.FRIENDLY],
      });

      await service.createRating({
        rideId: 'ride2',
        fromUserId: 'passenger2',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [RatingTag.PUNCTUAL],
      });

      const stats = await service.getRatingStats('driver1', 'DRIVER');
      
      expect(stats.topTags).toHaveLength(2);
      expect(stats.topTags[0].tagId).toBe(RatingTag.PUNCTUAL);
      expect(stats.topTags[0].count).toBe(2);
    });

    it('should return empty stats for user with no ratings', async () => {
      const stats = await service.getRatingStats('driver1', 'DRIVER');
      
      expect(stats.totalRatings).toBe(0);
      expect(stats.averageRating).toBe(0);
    });

    it('should cache stats', async () => {
      await service.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      });

      const stats1 = await service.getRatingStats('driver1', 'DRIVER');
      const stats2 = await service.getRatingStats('driver1', 'DRIVER');
      
      expect(stats1.lastUpdated).toEqual(stats2.lastUpdated);
    });
  });

  describe('queryRatings', () => {
    beforeEach(async () => {
      // Create test data
      await service.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [RatingTag.PUNCTUAL],
      });

      await service.createRating({
        rideId: 'ride2',
        fromUserId: 'passenger1',
        toUserId: 'driver2',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 3,
        tags: [RatingTag.LATE],
      });

      await service.createRating({
        rideId: 'ride1',
        fromUserId: 'driver1',
        toUserId: 'passenger1',
        type: RatingType.DRIVER_TO_PASSENGER,
        rating: 4,
        tags: [],
      });
    });

    it('should filter by userId', async () => {
      const ratings = await service.queryRatings({ userId: 'driver1' });
      expect(ratings).toHaveLength(2);
    });

    it('should filter by rideId', async () => {
      const ratings = await service.queryRatings({ rideId: 'ride1' });
      expect(ratings).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const ratings = await service.queryRatings({
        type: RatingType.PASSENGER_TO_DRIVER,
      });
      expect(ratings).toHaveLength(2);
    });

    it('should filter by rating range', async () => {
      const ratings = await service.queryRatings({
        minRating: 4,
        maxRating: 5,
      });
      expect(ratings).toHaveLength(2);
    });

    it('should filter by tags', async () => {
      const ratings = await service.queryRatings({
        hasTags: [RatingTag.PUNCTUAL],
      });
      expect(ratings).toHaveLength(1);
    });

    it('should apply pagination', async () => {
      const page1 = await service.queryRatings({ limit: 2, offset: 0 });
      const page2 = await service.queryRatings({ limit: 2, offset: 2 });
      
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
    });

    it('should sort by date (newest first)', async () => {
      const ratings = await service.queryRatings({});
      
      for (let i = 0; i < ratings.length - 1; i++) {
        expect(ratings[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          ratings[i + 1].createdAt.getTime()
        );
      }
    });
  });

  describe('reportRating', () => {
    it('should create a report', async () => {
      const rating = await service.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 1,
        comment: 'Inappropriate content',
        tags: [],
      });

      const report = await service.reportRating(
        rating.id,
        'user123',
        'inappropriate',
        'Contains offensive language'
      );

      expect(report).toBeDefined();
      expect(report.ratingId).toBe(rating.id);
      expect(report.status).toBe('pending');
    });

    it('should reject report for non-existent rating', async () => {
      await expect(
        service.reportRating('invalid-id', 'user123', 'inappropriate')
      ).rejects.toThrow('Rating not found');
    });
  });

  describe('getRatingTrend', () => {
    it('should calculate trend over different periods', async () => {
      const now = new Date();
      
      // Create ratings with different dates
      const rating1 = await service.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      });
      rating1.createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const rating2 = await service.createRating({
        rideId: 'ride2',
        fromUserId: 'passenger2',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 4,
        tags: [],
      });
      rating2.createdAt = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

      const trend = await service.getRatingTrend('driver1');
      
      expect(trend.last7Days).toBeGreaterThan(0);
      expect(trend.last30Days).toBeGreaterThan(0);
    });
  });

  describe('canRate', () => {
    it('should return true for new rating', async () => {
      const canRate = await service.canRate(
        'ride1',
        'passenger1',
        RatingType.PASSENGER_TO_DRIVER
      );
      expect(canRate).toBe(true);
    });

    it('should return false for existing rating', async () => {
      await service.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      });

      const canRate = await service.canRate(
        'ride1',
        'passenger1',
        RatingType.PASSENGER_TO_DRIVER
      );
      expect(canRate).toBe(false);
    });
  });

  describe('getRideRatings', () => {
    it('should get all ratings for a ride', async () => {
      await service.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      });

      await service.createRating({
        rideId: 'ride1',
        fromUserId: 'driver1',
        toUserId: 'passenger1',
        type: RatingType.DRIVER_TO_PASSENGER,
        rating: 4,
        tags: [],
      });

      const ratings = await service.getRideRatings('ride1');
      expect(ratings).toHaveLength(2);
    });

    it('should exclude deleted ratings', async () => {
      const rating = await service.createRating({
        rideId: 'ride1',
        fromUserId: 'passenger1',
        toUserId: 'driver1',
        type: RatingType.PASSENGER_TO_DRIVER,
        rating: 5,
        tags: [],
      });

      await service.deleteRating(rating.id);

      const ratings = await service.getRideRatings('ride1');
      expect(ratings).toHaveLength(0);
    });
  });

  describe('performance', () => {
    it('should handle large number of ratings efficiently', async () => {
      const start = Date.now();
      
      // Create 1000 ratings
      for (let i = 0; i < 1000; i++) {
        await service.createRating({
          rideId: `ride${i}`,
          fromUserId: `passenger${i}`,
          toUserId: 'driver1',
          type: RatingType.PASSENGER_TO_DRIVER,
          rating: (i % 5) + 1,
          tags: [],
        });
      }

      const createTime = Date.now() - start;
      expect(createTime).toBeLessThan(5000); // Should create 1000 ratings in < 5s

      // Query performance
      const queryStart = Date.now();
      await service.getRatingStats('driver1', 'DRIVER');
      const queryTime = Date.now() - queryStart;
      
      expect(queryTime).toBeLessThan(500); // Should calculate stats in < 500ms
    });
  });
});
