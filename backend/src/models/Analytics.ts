/**
 * Analytics Models
 * Tipos e interfaces para analytics avançado, métricas, KPIs e relatórios
 */

// ==================== Time Periods ====================

export enum TimePeriod {
  LAST_HOUR = 'last_hour',
  LAST_24H = 'last_24h',
  LAST_7D = 'last_7d',
  LAST_30D = 'last_30d',
  LAST_90D = 'last_90d',
  CUSTOM = 'custom',
}

export enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

// ==================== Metrics & KPIs ====================

export enum MetricCategory {
  BUSINESS = 'business',
  OPERATIONAL = 'operational',
  TECHNICAL = 'technical',
  FINANCIAL = 'financial',
  USER_ENGAGEMENT = 'user_engagement',
}

export interface KPI {
  id: string;
  name: string;
  category: MetricCategory;
  value: number;
  unit: string;
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
  trend: TrendDirection;
  changePercent: number;
  timestamp: Date;
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

// ==================== Business Metrics ====================

export interface BusinessMetrics {
  // Revenue
  totalRevenue: number;
  revenuePerRide: number;
  revenueGrowth: number;
  
  // Rides
  totalRides: number;
  completedRides: number;
  canceledRides: number;
  rideCompletionRate: number;
  
  // Users
  activePassengers: number;
  activeDrivers: number;
  newPassengers: number;
  newDrivers: number;
  userRetentionRate: number;
  
  // Efficiency
  averageWaitTime: number;
  averageRideTime: number;
  averageMatchingTime: number;
  driverUtilizationRate: number;
  
  // Satisfaction
  averageRating: number;
  npsScore: number;
  complaintsCount: number;
  
  timestamp: Date;
}

// ==================== Operational Metrics ====================

export interface OperationalMetrics {
  // System Performance
  uptime: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  
  // Queue & Matching
  queueLength: number;
  matchingSuccessRate: number;
  averageMatchingTime: number;
  timeoutRate: number;
  
  // Resources
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  
  // Drivers
  driversOnline: number;
  driversAvailable: number;
  driverAcceptanceRate: number;
  averageDriverResponseTime: number;
  
  timestamp: Date;
}

// ==================== Financial Analytics ====================

export interface FinancialAnalytics {
  period: TimePeriod;
  startDate: Date;
  endDate: Date;
  
  // Revenue
  grossRevenue: number;
  netRevenue: number;
  commissionEarned: number;
  
  // Costs
  driverPayments: number;
  refunds: number;
  operationalCosts: number;
  
  // Breakdown by Type
  revenueByPaymentMethod: Record<string, number>;
  revenueByRideType: Record<string, number>;
  revenueByRegion: Record<string, number>;
  
  // Growth
  revenueGrowth: number;
  transactionGrowth: number;
  
  // Projections
  projectedRevenue: number;
  projectedGrowth: number;
}

// ==================== User Engagement ====================

export interface UserEngagementMetrics {
  period: TimePeriod;
  
  // Passengers
  dailyActivePassengers: number;
  weeklyActivePassengers: number;
  monthlyActivePassengers: number;
  passengerChurnRate: number;
  
  // Drivers
  dailyActiveDrivers: number;
  weeklyActiveDrivers: number;
  monthlyActiveDrivers: number;
  driverChurnRate: number;
  
  // Engagement
  averageRidesPerPassenger: number;
  averageRidesPerDriver: number;
  averageSessionDuration: number;
  appOpenRate: number;
  
  // Retention
  day1Retention: number;
  day7Retention: number;
  day30Retention: number;
}

// ==================== Trends & Predictions ====================

export interface TrendAnalysis {
  metric: string;
  period: TimePeriod;
  direction: TrendDirection;
  magnitude: number;
  confidence: number;
  dataPoints: DataPoint[];
  prediction?: PredictionData;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface PredictionData {
  nextValue: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  method: 'linear' | 'exponential' | 'moving_average';
}

// ==================== Cohort Analysis ====================

export interface CohortAnalysis {
  cohortDate: Date;
  cohortSize: number;
  retentionByPeriod: Record<string, number>;
  revenueByPeriod: Record<string, number>;
  churnByPeriod: Record<string, number>;
}

export interface CohortMetrics {
  cohorts: CohortAnalysis[];
  averageRetention: Record<string, number>;
  bestPerformingCohort: string;
  worstPerformingCohort: string;
}

// ==================== Funnel Analysis ====================

export enum FunnelStep {
  APP_OPEN = 'app_open',
  SEARCH_RIDE = 'search_ride',
  VIEW_OPTIONS = 'view_options',
  SELECT_DRIVER = 'select_driver',
  CONFIRM_BOOKING = 'confirm_booking',
  RIDE_STARTED = 'ride_started',
  RIDE_COMPLETED = 'ride_completed',
  PAYMENT_COMPLETED = 'payment_completed',
  RATING_SUBMITTED = 'rating_submitted',
}

export interface FunnelAnalysis {
  period: TimePeriod;
  steps: FunnelStepData[];
  conversionRate: number;
  dropoffPoints: string[];
  bottlenecks: string[];
}

export interface FunnelStepData {
  step: FunnelStep;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  averageTime: number;
}

// ==================== Segmentation ====================

export enum UserSegment {
  NEW_USERS = 'new_users',
  ACTIVE_USERS = 'active_users',
  POWER_USERS = 'power_users',
  AT_RISK = 'at_risk',
  CHURNED = 'churned',
  VIP = 'vip',
}

export interface SegmentAnalysis {
  segment: UserSegment;
  userCount: number;
  percentage: number;
  averageRevenue: number;
  averageRides: number;
  retentionRate: number;
  characteristics: Record<string, any>;
}

// ==================== Geographic Analytics ====================

export interface GeographicMetrics {
  region: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Volume
  totalRides: number;
  activeUsers: number;
  activeDrivers: number;
  
  // Performance
  averageWaitTime: number;
  averageRideDistance: number;
  completionRate: number;
  
  // Financial
  revenue: number;
  averageRideValue: number;
  
  // Heatmap data
  demand: number;
  supply: number;
  demandSupplyRatio: number;
}

export interface HeatmapData {
  timestamp: Date;
  regions: GeographicMetrics[];
  granularity: 'city' | 'neighborhood' | 'zone';
}

// ==================== Real-Time Analytics ====================

export interface RealTimeMetrics {
  timestamp: Date;
  
  // Current State
  activeRides: number;
  queuedRequests: number;
  onlineDrivers: number;
  availableDrivers: number;
  
  // Last Minute
  ridesStarted: number;
  ridesCompleted: number;
  ridesCanceled: number;
  matchesMade: number;
  
  // Performance
  averageMatchingTime: number;
  averageWaitTime: number;
  systemLoad: number;
  errorRate: number;
  
  // Alerts
  activeAlerts: number;
  criticalAlerts: number;
}

// ==================== Reports ====================

export enum ReportType {
  DAILY_SUMMARY = 'daily_summary',
  WEEKLY_SUMMARY = 'weekly_summary',
  MONTHLY_SUMMARY = 'monthly_summary',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  USER_ACTIVITY = 'user_activity',
  DRIVER_PERFORMANCE = 'driver_performance',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

export interface ReportConfig {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  schedule?: ReportSchedule;
  filters?: ReportFilters;
  recipients?: string[];
  isActive: boolean;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string; // HH:mm format
  timezone: string;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  regions?: string[];
  userSegments?: UserSegment[];
  metrics?: string[];
}

export interface GeneratedReport {
  id: string;
  config: ReportConfig;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  data: ReportData;
  fileUrl?: string;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface ReportData {
  summary: ReportSummary;
  metrics: Record<string, any>;
  charts: ChartData[];
  tables: TableData[];
  insights: string[];
}

export interface ReportSummary {
  title: string;
  period: string;
  highlights: string[];
  keyMetrics: KPI[];
}

// ==================== Visualization ====================

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge',
}

export interface ChartData {
  id: string;
  title: string;
  type: ChartType;
  data: any[];
  options?: ChartOptions;
}

export interface ChartOptions {
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  legend?: boolean;
  animation?: boolean;
}

export interface TableData {
  id: string;
  title: string;
  columns: TableColumn[];
  rows: any[][];
  footer?: string[];
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'percentage' | 'date';
  align?: 'left' | 'center' | 'right';
}

// ==================== Dashboard ====================

export enum WidgetType {
  KPI_CARD = 'kpi_card',
  CHART = 'chart',
  TABLE = 'table',
  MAP = 'map',
  ALERT_LIST = 'alert_list',
  REAL_TIME_FEED = 'real_time_feed',
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: WidgetConfig;
  refreshInterval?: number; // seconds
}

export interface WidgetConfig {
  metric?: string;
  chartType?: ChartType;
  dataSource?: string;
  filters?: Record<string, any>;
  options?: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'flow';
  isPublic: boolean;
  owner: string;
  sharedWith?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Alerts & Anomalies ====================

export enum AnomalyType {
  SPIKE = 'spike',
  DROP = 'drop',
  TREND_CHANGE = 'trend_change',
  OUTLIER = 'outlier',
  PATTERN_BREAK = 'pattern_break',
}

export interface AnomalyDetection {
  id: string;
  metric: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  confidence: number;
  description: string;
  relatedMetrics?: string[];
}

export interface MetricAlert {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  severity: 'warning' | 'critical';
  isActive: boolean;
  lastTriggered?: Date;
  recipients: string[];
}

export interface AlertCondition {
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  duration?: number; // minutes
}

// ==================== Analytics Query ====================

export interface AnalyticsQuery {
  metrics: string[];
  period: TimePeriod;
  startDate?: Date;
  endDate?: Date;
  granularity: TimeGranularity;
  filters?: QueryFilters;
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export interface QueryFilters {
  regions?: string[];
  userTypes?: string[];
  paymentMethods?: string[];
  rideStatuses?: string[];
  customFilters?: Record<string, any>;
}

export interface AnalyticsQueryResult {
  query: AnalyticsQuery;
  executedAt: Date;
  executionTime: number;
  data: QueryResultData[];
  aggregations?: Record<string, any>;
  metadata: QueryMetadata;
}

export interface QueryResultData {
  timestamp: Date;
  values: Record<string, number>;
  dimensions?: Record<string, string>;
}

export interface QueryMetadata {
  totalRows: number;
  dataQuality: number;
  missingDataPoints: number;
  estimatedValues: number;
}

// ==================== A/B Testing ====================

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  variants: ABTestVariant[];
  metrics: string[];
  targetAudience: {
    percentage: number;
    segments?: UserSegment[];
  };
  results?: ABTestResults;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  allocation: number; // percentage
  config: Record<string, any>;
}

export interface ABTestResults {
  variant: string;
  users: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  isWinner: boolean;
  metrics: Record<string, number>;
}

// ==================== ML Insights ====================

export interface MLInsight {
  id: string;
  type: 'prediction' | 'recommendation' | 'anomaly' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions?: string[];
  data: Record<string, any>;
  createdAt: Date;
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'demand_forecast' | 'churn_prediction' | 'revenue_forecast' | 'surge_pricing';
  accuracy: number;
  lastTrained: Date;
  features: string[];
  predictions: ModelPrediction[];
}

export interface ModelPrediction {
  timestamp: Date;
  value: number;
  confidence: number;
  factors: Record<string, number>;
}

// ==================== Export ====================

export interface AnalyticsExport {
  id: string;
  type: 'metrics' | 'report' | 'dashboard';
  format: ReportFormat;
  requestedBy: string;
  requestedAt: Date;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  fileUrl?: string;
  expiresAt?: Date;
  error?: string;
}
