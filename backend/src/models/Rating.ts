/**
 * Rating System Models
 * Models for rating, reputation, badges, and moderation
 */

/**
 * Rating Types
 */
export enum RatingType {
  PASSENGER_TO_DRIVER = 'PASSENGER_TO_DRIVER',
  DRIVER_TO_PASSENGER = 'DRIVER_TO_PASSENGER',
}

/**
 * Rating Status
 */
export enum RatingStatus {
  ACTIVE = 'ACTIVE',
  MODERATED = 'MODERATED',
  DELETED = 'DELETED',
}

/**
 * Badge Types
 */
export enum BadgeType {
  // Driver Badges
  TOP_RATED = 'TOP_RATED', // 4.8+ rating
  VETERAN = 'VETERAN', // 1000+ rides
  PUNCTUAL = 'PUNCTUAL', // 95% on-time
  FRIENDLY = 'FRIENDLY', // Most "Friendly" tags
  CLEAN_VEHICLE = 'CLEAN_VEHICLE', // Most "Clean" tags
  SAFE_DRIVER = 'SAFE_DRIVER', // 0 incidents
  
  // Passenger Badges
  RESPECTFUL = 'RESPECTFUL', // 4.8+ rating
  FREQUENT_RIDER = 'FREQUENT_RIDER', // 100+ rides
  PERFECT_PASSENGER = 'PERFECT_PASSENGER', // 5.0 rating
  
  // Special Badges
  EARLY_ADOPTER = 'EARLY_ADOPTER',
  REFERRAL_CHAMPION = 'REFERRAL_CHAMPION',
}

/**
 * Rating Tags (predefined categories)
 */
export enum RatingTag {
  // Positive Tags
  PUNCTUAL = 'Pontual',
  FRIENDLY = 'Educado',
  CLEAN = 'Veículo limpo',
  SAFE_DRIVING = 'Direção segura',
  GOOD_CONVERSATION = 'Boa conversa',
  HELPFUL = 'Prestativo',
  PROFESSIONAL = 'Profissional',
  
  // Negative Tags
  LATE = 'Atrasado',
  RUDE = 'Mal educado',
  DIRTY_VEHICLE = 'Veículo sujo',
  UNSAFE_DRIVING = 'Direção perigosa',
  TALKED_TOO_MUCH = 'Falou demais',
  ROUTE_DEVIATION = 'Desviou da rota',
  INAPPROPRIATE = 'Comportamento inadequado',
}

/**
 * Rating Model
 */
export interface Rating {
  id: string;
  rideId: string;
  fromUserId: string;
  toUserId: string;
  type: RatingType;
  rating: number; // 1-5
  comment?: string;
  tags: RatingTag[];
  status: RatingStatus;
  
  // Moderation
  isModerated: boolean;
  moderationReason?: string;
  moderatedAt?: Date;
  moderatedBy?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rating Input (for creation)
 */
export interface RatingInput {
  rideId: string;
  fromUserId: string;
  toUserId: string;
  type: RatingType;
  rating: number;
  comment?: string;
  tags: RatingTag[];
}

/**
 * Rating Statistics
 */
export interface RatingStats {
  userId: string;
  totalRatings: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  tagCounts: Record<string, number>;
  recentRatings: Rating[];
}

/**
 * Reputation Model
 */
export interface Reputation {
  userId: string;
  userType: 'DRIVER' | 'PASSENGER';
  
  // Overall Score
  overallScore: number; // 0-100
  averageRating: number; // 1-5
  totalRatings: number;
  
  // Component Scores
  punctualityScore: number;
  friendlinessScore: number;
  cleanlinessScore: number;
  safetyScore: number;
  
  // Activity
  totalRides: number;
  acceptanceRate?: number; // Drivers only
  cancellationRate: number;
  completionRate: number;
  
  // Badges
  badges: BadgeType[];
  
  // Level
  level: number; // 1-10
  experiencePoints: number;
  
  // Status
  isVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  
  // Timestamps
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Badge Model
 */
export interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  requirements: BadgeRequirements;
}

/**
 * Badge Requirements
 */
export interface BadgeRequirements {
  minRating?: number;
  minRides?: number;
  minTagCount?: Record<RatingTag, number>;
  specialCondition?: string;
}

/**
 * User Badge (awarded badge)
 */
export interface UserBadge {
  userId: string;
  badgeType: BadgeType;
  awardedAt: Date;
  progress?: number; // 0-100 for badges in progress
}

/**
 * Moderation Action
 */
export interface ModerationAction {
  id: string;
  ratingId: string;
  action: 'APPROVE' | 'HIDE' | 'DELETE' | 'WARN_USER';
  reason: string;
  moderatorId: string;
  notes?: string;
  createdAt: Date;
}

/**
 * Moderation Queue Item
 */
export interface ModerationQueueItem {
  rating: Rating;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reason: string; // Why flagged
  reportCount: number;
  addedAt: Date;
}

/**
 * Rating Report (user reports inappropriate rating/comment)
 */
export interface RatingReport {
  id: string;
  ratingId: string;
  reporterId: string;
  reason: 'INAPPROPRIATE' | 'FALSE_INFO' | 'HARASSMENT' | 'SPAM' | 'OTHER';
  description?: string;
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

/**
 * Rating Filter
 */
export interface RatingFilter {
  userId?: string;
  rideId?: string;
  type?: RatingType;
  minRating?: number;
  maxRating?: number;
  tags?: RatingTag[];
  status?: RatingStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Reputation Update Event
 */
export interface ReputationUpdateEvent {
  userId: string;
  previousScore: number;
  newScore: number;
  previousLevel: number;
  newLevel: number;
  badgesEarned: BadgeType[];
  timestamp: Date;
}
