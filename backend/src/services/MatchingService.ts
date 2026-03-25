import { DriverStatusType } from '../models/DriverStatus';
import { DriverMatch, MatchingCriteria, MatchingResult } from '../models/Matching';
import { IDriverRepository, ILocationRepository } from '../repositories/IRepository';
import { DistanceCalculator } from '../utils/DistanceCalculator';
import { Logger } from '../utils/Logger';

const DEFAULT_MAX_LOCATION_AGE_SECONDS = 30;

export class MatchingService {
  constructor(
    private driverRepository: IDriverRepository,
    private locationRepository: ILocationRepository
  ) {}

  async findBestDriver(criteria: MatchingCriteria): Promise<MatchingResult | null> {
    const candidates = await this.findCandidates(criteria, 1);
    const best = candidates[0];

    if (!best) {
      Logger.warn('MatchingService', 'No driver found for ride search', {
        maxRadiusKm: criteria.maxRadiusKm,
        excludedDriverIds: criteria.excludedDriverIds ?? [],
      });
      return null;
    }

    Logger.info('MatchingService', 'Best driver selected', {
      driverId: best.driverId,
      distanceKm: best.distance,
      etaSeconds: best.eta,
      score: best.score,
    });

    return {
      matchedDriverId: best.driverId,
      distance: best.distance,
      eta: best.eta,
      score: best.score,
      timestamp: new Date(),
    };
  }

  async findCandidates(
    criteria: MatchingCriteria,
    limit: number = 5
  ): Promise<DriverMatch[]> {
    const excludedDriverIds = new Set(criteria.excludedDriverIds ?? []);
    const maxLocationAgeMs =
      (criteria.maxLocationAgeSeconds ?? DEFAULT_MAX_LOCATION_AGE_SECONDS) * 1000;

    Logger.info('MatchingService', 'Starting driver search', {
      passengerLatitude: criteria.passengerLatitude,
      passengerLongitude: criteria.passengerLongitude,
      maxRadiusKm: criteria.maxRadiusKm,
      limit,
      excludedDriverIds: Array.from(excludedDriverIds),
    });

    const drivers = await this.driverRepository.findActiveDrivers();
    const candidates: DriverMatch[] = [];
    const now = Date.now();
    const stats = {
      totalDrivers: drivers.length,
      skippedExcluded: 0,
      skippedOffline: 0,
      skippedBusy: 0,
      skippedRating: 0,
      skippedLocationMissing: 0,
      skippedLocationStale: 0,
      skippedDistance: 0,
      candidateCount: 0,
    };

    for (const driver of drivers) {
      try {
        if (excludedDriverIds.has(driver.id)) {
          stats.skippedExcluded++;
          continue;
        }

        if (driver.status !== DriverStatusType.ONLINE) {
          stats.skippedOffline++;
          continue;
        }

        if (driver.currentRideId) {
          stats.skippedBusy++;
          continue;
        }

        if (
          criteria.minDriverRating !== undefined &&
          (driver.rating ?? 0) < criteria.minDriverRating
        ) {
          stats.skippedRating++;
          continue;
        }

        const driverLocation = await this.locationRepository.getLatestDriverLocation(driver.id);
        if (!driverLocation) {
          stats.skippedLocationMissing++;
          continue;
        }

        const locationAgeMs = now - new Date(driverLocation.timestamp).getTime();
        if (locationAgeMs > maxLocationAgeMs) {
          stats.skippedLocationStale++;
          continue;
        }

        const distanceKm = DistanceCalculator.calculateDistanceKm(
          criteria.passengerLatitude,
          criteria.passengerLongitude,
          driverLocation.latitude,
          driverLocation.longitude
        );

        if (distanceKm > criteria.maxRadiusKm) {
          stats.skippedDistance++;
          continue;
        }

        const etaSeconds = DistanceCalculator.estimateETA(distanceKm);
        candidates.push({
          driverId: driver.id,
          distance: distanceKm,
          eta: etaSeconds,
          rating: driver.rating || 0,
          score: this.calculateScore(distanceKm, etaSeconds, driver.rating || 0),
        });
      } catch (error) {
        Logger.error('MatchingService', 'Error while evaluating driver candidate', {
          driverId: driver.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    candidates.sort((left, right) => {
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      if (left.rating !== right.rating) {
        return right.rating - left.rating;
      }
      return left.eta - right.eta;
    });

    stats.candidateCount = candidates.length;

    Logger.info('MatchingService', 'Driver search completed', {
      ...stats,
      selectedDriverIds: candidates.slice(0, limit).map((candidate) => candidate.driverId),
    });

    return candidates.slice(0, limit);
  }

  private calculateScore(distanceKm: number, etaSeconds: number, rating: number): number {
    const distanceScore = Math.max(0, 100 - distanceKm * 12);
    const etaScore = Math.max(0, 40 - etaSeconds / 60);
    const ratingScore = Math.max(0, rating * 10);
    return Math.round((distanceScore + etaScore + ratingScore) * 100) / 100;
  }
}
