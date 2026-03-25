/**
 * Admin Models & Types
 * 
 * Data models for admin dashboard and management operations
 */

/**
 * Admin User Interface
 */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Admin Role Types
 */
export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  SUPPORT = 'SUPPORT',
  ANALYST = 'ANALYST',
}

/**
 * Admin Permission Types
 */
export enum AdminPermission {
  // User Management
  VIEW_USERS = 'VIEW_USERS',
  EDIT_USERS = 'EDIT_USERS',
  DELETE_USERS = 'DELETE_USERS',
  BAN_USERS = 'BAN_USERS',
  
  // Ride Management
  VIEW_RIDES = 'VIEW_RIDES',
  CANCEL_RIDES = 'CANCEL_RIDES',
  REFUND_RIDES = 'REFUND_RIDES',
  
  // Payment Management
  VIEW_PAYMENTS = 'VIEW_PAYMENTS',
  PROCESS_REFUNDS = 'PROCESS_REFUNDS',
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  
  // Fraud Detection
  VIEW_FRAUD_ALERTS = 'VIEW_FRAUD_ALERTS',
  INVESTIGATE_FRAUD = 'INVESTIGATE_FRAUD',
  BLOCK_FRAUDULENT_USERS = 'BLOCK_FRAUDULENT_USERS',
  
  // Analytics
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',
  
  // System
  VIEW_LOGS = 'VIEW_LOGS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_ADMINS = 'MANAGE_ADMINS',
}

/**
 * Dashboard Statistics
 */
export interface DashboardStats {
  // Overall Metrics
  totalUsers: number;
  totalDrivers: number;
  totalRides: number;
  totalRevenue: number;
  
  // Today's Metrics
  todayUsers: number;
  todayRides: number;
  todayRevenue: number;
  
  // Active Metrics (Now)
  activeUsers: number;
  activeDrivers: number;
  ongoingRides: number;
  
  // Growth Metrics
  userGrowth: number; // Percentage
  rideGrowth: number; // Percentage
  revenueGrowth: number; // Percentage
  
  // Performance Metrics
  averageRating: number;
  cancellationRate: number;
  completionRate: number;
  
  // Financial Metrics
  averageRideValue: number;
  platformRevenue: number;
  driverEarnings: number;
  
  // Fraud Metrics
  fraudAlerts: number;
  suspiciousTransactions: number;
  blockedUsers: number;
  
  timestamp: Date;
}

/**
 * User Management Data
 */
export interface UserManagement {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'PASSENGER' | 'DRIVER';
    isActive: boolean;
    isVerified: boolean;
    isBanned: boolean;
    createdAt: Date;
  };
  
  stats: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    totalSpent: number; // For passengers
    totalEarned: number; // For drivers
    averageRating: number;
    ratingCount: number;
  };
  
  recentActivity: {
    lastRideAt?: Date;
    lastPaymentAt?: Date;
    lastLoginAt?: Date;
  };
  
  flags: {
    hasFraudAlerts: boolean;
    hasPaymentIssues: boolean;
    hasLowRating: boolean;
  };
}

/**
 * Ride Management Data
 */
export interface RideManagement {
  ride: {
    id: string;
    passengerId: string;
    driverId: string;
    status: string;
    pickupLocation: string;
    dropoffLocation: string;
    fare: number;
    distance: number;
    duration: number;
    createdAt: Date;
    completedAt?: Date;
  };
  
  passenger: {
    id: string;
    name: string;
    rating: number;
  };
  
  driver: {
    id: string;
    name: string;
    rating: number;
    vehicle: string;
  };
  
  payment?: {
    id: string;
    amount: number;
    method: string;
    status: string;
  };
  
  issues?: {
    hasCancellation: boolean;
    hasRefund: boolean;
    hasFraudAlert: boolean;
    hasDispute: boolean;
  };
}

/**
 * Fraud Alert Types
 */
export enum FraudAlertType {
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  MULTIPLE_CANCELLATIONS = 'MULTIPLE_CANCELLATIONS',
  PAYMENT_FRAUD = 'PAYMENT_FRAUD',
  LOCATION_SPOOFING = 'LOCATION_SPOOFING',
  FAKE_GPS = 'FAKE_GPS',
  RATING_MANIPULATION = 'RATING_MANIPULATION',
  ACCOUNT_TAKEOVER = 'ACCOUNT_TAKEOVER',
  VELOCITY_CHECK = 'VELOCITY_CHECK',
  UNUSUAL_BEHAVIOR = 'UNUSUAL_BEHAVIOR',
  STOLEN_CARD = 'STOLEN_CARD',
}

/**
 * Fraud Alert Severity
 */
export enum FraudAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Fraud Alert Status
 */
export enum FraudAlertStatus {
  PENDING = 'PENDING',
  INVESTIGATING = 'INVESTIGATING',
  CONFIRMED = 'CONFIRMED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  RESOLVED = 'RESOLVED',
}

/**
 * Fraud Alert Interface
 */
export interface FraudAlert {
  id: string;
  type: FraudAlertType;
  severity: FraudAlertSeverity;
  status: FraudAlertStatus;
  
  userId: string;
  userName: string;
  userRole: 'PASSENGER' | 'DRIVER';
  
  description: string;
  details: Record<string, any>;
  evidence: string[];
  
  riskScore: number; // 0-100
  
  relatedEntities: {
    rideIds?: string[];
    paymentIds?: string[];
    transactionIds?: string[];
  };
  
  actions: {
    userBlocked?: boolean;
    accountFrozen?: boolean;
    paymentsHeld?: boolean;
    notificationSent?: boolean;
  };
  
  investigator?: {
    adminId: string;
    adminName: string;
    notes: string;
    investigatedAt: Date;
  };
  
  resolution?: {
    resolvedBy: string;
    resolvedAt: Date;
    outcome: string;
    actionsTaken: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Financial Report Types
 */
export enum ReportType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

/**
 * Financial Report Interface
 */
export interface FinancialReport {
  id: string;
  type: ReportType;
  period: {
    startDate: Date;
    endDate: Date;
  };
  
  revenue: {
    totalRevenue: number;
    platformRevenue: number;
    driverEarnings: number;
    paymentFees: number;
  };
  
  transactions: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    refundedTransactions: number;
    totalRefunds: number;
  };
  
  rides: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    averageFare: number;
  };
  
  payments: {
    byMethod: Record<string, { count: number; amount: number }>;
    byStatus: Record<string, { count: number; amount: number }>;
  };
  
  growth: {
    revenueGrowth: number; // Percentage vs previous period
    rideGrowth: number;
    userGrowth: number;
  };
  
  topMetrics: {
    topDrivers: Array<{ driverId: string; name: string; earnings: number }>;
    topRoutes: Array<{ route: string; count: number; revenue: number }>;
    peakHours: Array<{ hour: number; rides: number; revenue: number }>;
  };
  
  generatedAt: Date;
  generatedBy: string;
}

/**
 * Analytics Time Range
 */
export interface AnalyticsTimeRange {
  startDate: Date;
  endDate: Date;
  granularity: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
}

/**
 * User Analytics
 */
export interface UserAnalytics {
  period: AnalyticsTimeRange;
  
  acquisition: {
    newUsers: number;
    newDrivers: number;
    growth: number;
  };
  
  retention: {
    activeUsers: number;
    returningUsers: number;
    retentionRate: number;
    churnRate: number;
  };
  
  engagement: {
    averageRidesPerUser: number;
    averageSessionDuration: number;
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  
  segmentation: {
    byCity: Record<string, number>;
    byAge: Record<string, number>;
    byGender: Record<string, number>;
  };
  
  trends: Array<{
    date: Date;
    newUsers: number;
    activeUsers: number;
    rides: number;
  }>;
}

/**
 * Revenue Analytics
 */
export interface RevenueAnalytics {
  period: AnalyticsTimeRange;
  
  overview: {
    totalRevenue: number;
    platformRevenue: number;
    driverEarnings: number;
    averageRevenuePerRide: number;
  };
  
  breakdown: {
    byPaymentMethod: Record<string, number>;
    byCity: Record<string, number>;
    byHour: Record<number, number>;
    byDayOfWeek: Record<string, number>;
  };
  
  trends: Array<{
    date: Date;
    revenue: number;
    platformRevenue: number;
    rides: number;
  }>;
  
  projections: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number; // 0-1
  };
}

/**
 * Performance Analytics
 */
export interface PerformanceAnalytics {
  period: AnalyticsTimeRange;
  
  rides: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    completionRate: number;
    cancellationRate: number;
    
    averageWaitTime: number;
    averageRideDuration: number;
    averageDistance: number;
  };
  
  matching: {
    averageMatchTime: number;
    matchSuccessRate: number;
    firstMatchAcceptanceRate: number;
    averageAttemptsPerMatch: number;
  };
  
  ratings: {
    averagePassengerRating: number;
    averageDriverRating: number;
    totalRatings: number;
    ratingDistribution: Record<number, number>;
  };
  
  issues: {
    totalComplaints: number;
    resolvedComplaints: number;
    averageResolutionTime: number;
    commonIssues: Array<{ issue: string; count: number }>;
  };
}

/**
 * Admin Action Log
 */
export interface AdminActionLog {
  id: string;
  adminId: string;
  adminName: string;
  action: AdminActionType;
  
  targetType: 'USER' | 'RIDE' | 'PAYMENT' | 'FRAUD_ALERT' | 'SYSTEM';
  targetId: string;
  
  description: string;
  changes?: Record<string, { before: any; after: any }>;
  
  metadata: {
    ipAddress: string;
    userAgent: string;
    location?: string;
  };
  
  timestamp: Date;
}

/**
 * Admin Action Types
 */
export enum AdminActionType {
  // User Actions
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  
  // Ride Actions
  RIDE_CANCELLED = 'RIDE_CANCELLED',
  RIDE_REFUNDED = 'RIDE_REFUNDED',
  
  // Payment Actions
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_DISPUTED = 'PAYMENT_DISPUTED',
  
  // Fraud Actions
  FRAUD_INVESTIGATED = 'FRAUD_INVESTIGATED',
  FRAUD_CONFIRMED = 'FRAUD_CONFIRMED',
  FRAUD_DISMISSED = 'FRAUD_DISMISSED',
  
  // System Actions
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  ADMIN_CREATED = 'ADMIN_CREATED',
  REPORT_GENERATED = 'REPORT_GENERATED',
}

/**
 * Filter Options for Admin Queries
 */
export interface AdminQueryFilters {
  // Pagination
  page?: number;
  limit?: number;
  
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  
  // Date Range
  startDate?: Date;
  endDate?: Date;
  
  // Search
  search?: string;
  
  // Status Filters
  status?: string[];
  
  // Type Filters
  type?: string[];
  
  // Specific Filters
  userId?: string;
  driverId?: string;
  city?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * System Health Metrics
 */
export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  
  services: {
    api: { status: string; responseTime: number };
    database: { status: string; responseTime: number };
    cache: { status: string; responseTime: number };
    queue: { status: string; messageCount: number };
  };
  
  metrics: {
    cpu: number; // Percentage
    memory: number; // Percentage
    disk: number; // Percentage
    network: number; // Mbps
  };
  
  uptime: number; // Seconds
  lastChecked: Date;
}

/**
 * Export Data Options
 */
export interface ExportOptions {
  format: 'CSV' | 'JSON' | 'PDF' | 'EXCEL';
  filters?: AdminQueryFilters;
  fields?: string[];
  fileName?: string;
}

/**
 * Notification for Admins
 */
export interface AdminNotification {
  id: string;
  type: 'FRAUD_ALERT' | 'SYSTEM_ALERT' | 'USER_REPORT' | 'PERFORMANCE_ALERT';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}
