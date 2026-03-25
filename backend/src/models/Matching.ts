/**
 * Matching Domain
 * Discovery and orchestration contracts for ride dispatch.
 */

export interface MatchingCriteria {
  passengerLatitude: number;
  passengerLongitude: number;
  maxRadiusKm: number;
  minDriverRating?: number;
  excludedDriverIds?: string[];
  maxLocationAgeSeconds?: number;
}

export interface DriverMatch {
  driverId: string;
  distance: number;
  eta: number;
  rating: number;
  score: number;
}

export interface MatchingResult {
  matchedDriverId: string;
  distance: number;
  eta: number;
  score: number;
  timestamp: Date;
}

export interface MatchingAttempt {
  rideId: string;
  attemptNumber: number;
  timestamp: Date;
  candidateCount: number;
  selectedDriver?: string;
  reason?: string;
}

export interface AutomationConfig {
  enabled: boolean;
  backoffMs: number[];
  maxAttempts: number;
  offerTimeoutMs: number;
  matchingTimeoutMs: number;
  initialRadiusKm: number;
  expandRadiusKmPerAttempt: number;
  maxRadiusKm: number;
  candidateBatchSize: number;
  maxLocationAgeMs: number;
}

export interface MatchingAutomationState {
  rideId: string;
  passengerId: string;
  currentAttempt: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  currentRadiusKm: number;
  offeredDriverId?: string;
  offeredDriverIds: Set<string>;
  rejectedDriverIds: Set<string>;
  pendingCandidateIds: string[];
  searchDeadline: Date;
  status:
    | 'SEARCHING'
    | 'WAITING_DRIVER'
    | 'MATCHED'
    | 'TIMED_OUT'
    | 'CANCELLED'
    | 'FAILED';
  createdAt: Date;
}

export interface MatchingAutomationResult {
  matched: boolean;
  driverId?: string;
  attemptCount: number;
  totalDurationSeconds: number;
  failureReason?: string;
}
