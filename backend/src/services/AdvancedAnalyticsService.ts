/**
 * Advanced Analytics Service
 * Análise avançada de métricas, tendências, previsões e insights
 */

import { Logger } from '../utils/Logger';
import {
  BusinessMetrics,
  OperationalMetrics,
  FinancialAnalytics,
  UserEngagementMetrics,
  TrendAnalysis,
  TrendDirection,
  DataPoint,
  PredictionData,
  CohortAnalysis,
  CohortMetrics,
  FunnelAnalysis,
  FunnelStep,
  FunnelStepData,
  SegmentAnalysis,
  UserSegment,
  GeographicMetrics,
  HeatmapData,
  RealTimeMetrics,
  TimePeriod,
  TimeGranularity,
  AnomalyDetection,
  AnomalyType,
  MLInsight,
  KPI,
  MetricCategory,
} from '../models/Analytics';

export class AdvancedAnalyticsService {
  private logger = new Logger('AdvancedAnalyticsService');
  
  // In-memory storage (use database in production)
  private metricsHistory: Map<string, DataPoint[]> = new Map();
  private cohorts: Map<string, CohortAnalysis> = new Map();
  private anomalies: AnomalyDetection[] = [];
  private insights: MLInsight[] = [];

  constructor() {
    this.logger.info('AdvancedAnalyticsService initialized');
  }

  // ==================== Business Metrics ====================

  /**
   * Get business metrics for a period
   */
  async getBusinessMetrics(period: TimePeriod): Promise<BusinessMetrics> {
    const { startDate, endDate } = this.getPeriodDates(period);

    // In production, query from database
    // For now, return mock data
    const metrics: BusinessMetrics = {
      // Revenue
      totalRevenue: this.randomValue(50000, 200000),
      revenuePerRide: this.randomValue(15, 35),
      revenueGrowth: this.randomValue(5, 25),
      
      // Rides
      totalRides: this.randomValue(5000, 15000),
      completedRides: this.randomValue(4500, 14000),
      canceledRides: this.randomValue(100, 500),
      rideCompletionRate: this.randomValue(90, 98),
      
      // Users
      activePassengers: this.randomValue(2000, 8000),
      activeDrivers: this.randomValue(500, 2000),
      newPassengers: this.randomValue(200, 800),
      newDrivers: this.randomValue(50, 200),
      userRetentionRate: this.randomValue(70, 90),
      
      // Efficiency
      averageWaitTime: this.randomValue(3, 8),
      averageRideTime: this.randomValue(15, 30),
      averageMatchingTime: this.randomValue(10, 45),
      driverUtilizationRate: this.randomValue(60, 85),
      
      // Satisfaction
      averageRating: this.randomValue(4.2, 4.9),
      npsScore: this.randomValue(40, 75),
      complaintsCount: this.randomValue(10, 50),
      
      timestamp: new Date(),
    };

    this.logger.info('Business metrics calculated', { period });
    return metrics;
  }

  // ==================== Operational Metrics ====================

  /**
   * Get operational metrics
   */
  async getOperationalMetrics(): Promise<OperationalMetrics> {
    const metrics: OperationalMetrics = {
      // System Performance
      uptime: this.randomValue(99, 99.99),
      requestsPerMinute: this.randomValue(1000, 5000),
      averageResponseTime: this.randomValue(50, 200),
      errorRate: this.randomValue(0.1, 2),
      
      // Queue & Matching
      queueLength: this.randomValue(0, 50),
      matchingSuccessRate: this.randomValue(85, 98),
      averageMatchingTime: this.randomValue(15, 45),
      timeoutRate: this.randomValue(1, 5),
      
      // Resources
      activeConnections: this.randomValue(500, 2000),
      cpuUsage: this.randomValue(30, 70),
      memoryUsage: this.randomValue(40, 80),
      diskUsage: this.randomValue(50, 85),
      
      // Drivers
      driversOnline: this.randomValue(200, 800),
      driversAvailable: this.randomValue(150, 600),
      driverAcceptanceRate: this.randomValue(75, 95),
      averageDriverResponseTime: this.randomValue(5, 20),
      
      timestamp: new Date(),
    };

    this.logger.info('Operational metrics calculated');
    return metrics;
  }

  // ==================== Financial Analytics ====================

  /**
   * Get financial analytics
   */
  async getFinancialAnalytics(period: TimePeriod): Promise<FinancialAnalytics> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const grossRevenue = this.randomValue(50000, 200000);
    const commissionRate = 0.25;
    
    const analytics: FinancialAnalytics = {
      period,
      startDate,
      endDate,
      
      // Revenue
      grossRevenue,
      netRevenue: grossRevenue * (1 - commissionRate - 0.15),
      commissionEarned: grossRevenue * commissionRate,
      
      // Costs
      driverPayments: grossRevenue * 0.75,
      refunds: grossRevenue * 0.02,
      operationalCosts: grossRevenue * 0.15,
      
      // Breakdown
      revenueByPaymentMethod: {
        'credit_card': grossRevenue * 0.60,
        'debit_card': grossRevenue * 0.25,
        'pix': grossRevenue * 0.10,
        'cash': grossRevenue * 0.05,
      },
      revenueByRideType: {
        'economy': grossRevenue * 0.50,
        'comfort': grossRevenue * 0.30,
        'premium': grossRevenue * 0.20,
      },
      revenueByRegion: {
        'São Paulo': grossRevenue * 0.40,
        'Rio de Janeiro': grossRevenue * 0.25,
        'Brasília': grossRevenue * 0.15,
        'Other': grossRevenue * 0.20,
      },
      
      // Growth
      revenueGrowth: this.randomValue(10, 30),
      transactionGrowth: this.randomValue(8, 25),
      
      // Projections
      projectedRevenue: grossRevenue * 1.15,
      projectedGrowth: this.randomValue(12, 25),
    };

    this.logger.info('Financial analytics calculated', { period });
    return analytics;
  }

  // ==================== User Engagement ====================

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(period: TimePeriod): Promise<UserEngagementMetrics> {
    const totalPassengers = this.randomValue(10000, 50000);
    const totalDrivers = this.randomValue(2000, 10000);

    const metrics: UserEngagementMetrics = {
      period,
      
      // Passengers
      dailyActivePassengers: Math.round(totalPassengers * 0.15),
      weeklyActivePassengers: Math.round(totalPassengers * 0.40),
      monthlyActivePassengers: Math.round(totalPassengers * 0.70),
      passengerChurnRate: this.randomValue(5, 15),
      
      // Drivers
      dailyActiveDrivers: Math.round(totalDrivers * 0.20),
      weeklyActiveDrivers: Math.round(totalDrivers * 0.50),
      monthlyActiveDrivers: Math.round(totalDrivers * 0.80),
      driverChurnRate: this.randomValue(8, 20),
      
      // Engagement
      averageRidesPerPassenger: this.randomValue(2, 8),
      averageRidesPerDriver: this.randomValue(15, 40),
      averageSessionDuration: this.randomValue(5, 15),
      appOpenRate: this.randomValue(60, 90),
      
      // Retention
      day1Retention: this.randomValue(70, 90),
      day7Retention: this.randomValue(40, 70),
      day30Retention: this.randomValue(20, 50),
    };

    this.logger.info('User engagement calculated', { period });
    return metrics;
  }

  // ==================== Trend Analysis ====================

  /**
   * Analyze trends for a metric
   */
  async analyzeTrend(
    metric: string,
    period: TimePeriod
  ): Promise<TrendAnalysis> {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    // Generate sample data points
    const dataPoints = this.generateDataPoints(metric, startDate, endDate);
    
    // Calculate trend direction
    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    let direction: TrendDirection;
    if (Math.abs(change) < 5) {
      direction = TrendDirection.STABLE;
    } else if (change > 0) {
      direction = TrendDirection.UP;
    } else {
      direction = TrendDirection.DOWN;
    }

    // Calculate prediction
    const prediction = this.predictNextValue(dataPoints);

    const analysis: TrendAnalysis = {
      metric,
      period,
      direction,
      magnitude: Math.abs(change),
      confidence: this.randomValue(70, 95),
      dataPoints,
      prediction,
    };

    this.logger.info('Trend analysis completed', { metric, direction });
    return analysis;
  }

  /**
   * Generate data points for a metric
   */
  private generateDataPoints(
    metric: string,
    startDate: Date,
    endDate: Date
  ): DataPoint[] {
    const points: DataPoint[] = [];
    const duration = endDate.getTime() - startDate.getTime();
    const numPoints = Math.min(Math.floor(duration / (1000 * 60 * 60)), 168); // Max 1 week of hourly data

    let baseValue = this.randomValue(100, 1000);
    const trend = (Math.random() - 0.5) * 0.02; // -1% to +1% per point

    for (let i = 0; i < numPoints; i++) {
      const timestamp = new Date(startDate.getTime() + (duration / numPoints) * i);
      const noise = (Math.random() - 0.5) * 0.1 * baseValue;
      const value = Math.max(0, baseValue + noise);
      
      points.push({ timestamp, value });
      baseValue = baseValue * (1 + trend);
    }

    return points;
  }

  /**
   * Predict next value using linear regression
   */
  private predictNextValue(dataPoints: DataPoint[]): PredictionData {
    if (dataPoints.length < 2) {
      return {
        nextValue: dataPoints[0].value,
        confidence: 50,
        upperBound: dataPoints[0].value * 1.1,
        lowerBound: dataPoints[0].value * 0.9,
        method: 'linear',
      };
    }

    // Simple linear regression
    const n = dataPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    dataPoints.forEach((point, i) => {
      sumX += i;
      sumY += point.value;
      sumXY += i * point.value;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const nextValue = slope * n + intercept;
    const variance = this.calculateVariance(dataPoints.map(p => p.value));
    const margin = Math.sqrt(variance) * 1.96; // 95% confidence

    return {
      nextValue: Math.max(0, nextValue),
      confidence: this.randomValue(70, 90),
      upperBound: nextValue + margin,
      lowerBound: Math.max(0, nextValue - margin),
      method: 'linear',
    };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  // ==================== Cohort Analysis ====================

  /**
   * Get cohort metrics
   */
  async getCohortMetrics(monthsBack: number = 6): Promise<CohortMetrics> {
    const cohorts: CohortAnalysis[] = [];
    const now = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortSize = this.randomValue(500, 2000);

      const cohort: CohortAnalysis = {
        cohortDate,
        cohortSize,
        retentionByPeriod: {
          'Month 0': 100,
          'Month 1': this.randomValue(40, 70),
          'Month 2': this.randomValue(30, 50),
          'Month 3': this.randomValue(20, 40),
          'Month 6': this.randomValue(10, 25),
        },
        revenueByPeriod: {
          'Month 0': cohortSize * this.randomValue(20, 40),
          'Month 1': cohortSize * this.randomValue(15, 30) * 0.6,
          'Month 2': cohortSize * this.randomValue(12, 25) * 0.5,
          'Month 3': cohortSize * this.randomValue(10, 20) * 0.4,
        },
        churnByPeriod: {
          'Month 1': this.randomValue(30, 60),
          'Month 2': this.randomValue(20, 40),
          'Month 3': this.randomValue(10, 30),
        },
      };

      cohorts.push(cohort);
    }

    // Calculate averages
    const averageRetention: Record<string, number> = {};
    const periods = ['Month 0', 'Month 1', 'Month 2', 'Month 3', 'Month 6'];
    
    periods.forEach(period => {
      const values = cohorts
        .map(c => c.retentionByPeriod[period])
        .filter(v => v !== undefined);
      
      if (values.length > 0) {
        averageRetention[period] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });

    return {
      cohorts,
      averageRetention,
      bestPerformingCohort: cohorts[0].cohortDate.toISOString().slice(0, 7),
      worstPerformingCohort: cohorts[cohorts.length - 1].cohortDate.toISOString().slice(0, 7),
    };
  }

  // ==================== Funnel Analysis ====================

  /**
   * Analyze conversion funnel
   */
  async analyzeFunnel(period: TimePeriod): Promise<FunnelAnalysis> {
    const totalUsers = 10000;
    
    const steps: FunnelStepData[] = [
      {
        step: FunnelStep.APP_OPEN,
        users: totalUsers,
        conversionRate: 100,
        dropoffRate: 0,
        averageTime: 0,
      },
      {
        step: FunnelStep.SEARCH_RIDE,
        users: Math.round(totalUsers * 0.80),
        conversionRate: 80,
        dropoffRate: 20,
        averageTime: 10,
      },
      {
        step: FunnelStep.VIEW_OPTIONS,
        users: Math.round(totalUsers * 0.70),
        conversionRate: 70,
        dropoffRate: 10,
        averageTime: 15,
      },
      {
        step: FunnelStep.SELECT_DRIVER,
        users: Math.round(totalUsers * 0.60),
        conversionRate: 60,
        dropoffRate: 10,
        averageTime: 20,
      },
      {
        step: FunnelStep.CONFIRM_BOOKING,
        users: Math.round(totalUsers * 0.55),
        conversionRate: 55,
        dropoffRate: 5,
        averageTime: 25,
      },
      {
        step: FunnelStep.RIDE_STARTED,
        users: Math.round(totalUsers * 0.50),
        conversionRate: 50,
        dropoffRate: 5,
        averageTime: 30,
      },
      {
        step: FunnelStep.RIDE_COMPLETED,
        users: Math.round(totalUsers * 0.48),
        conversionRate: 48,
        dropoffRate: 2,
        averageTime: 50,
      },
      {
        step: FunnelStep.PAYMENT_COMPLETED,
        users: Math.round(totalUsers * 0.47),
        conversionRate: 47,
        dropoffRate: 1,
        averageTime: 52,
      },
      {
        step: FunnelStep.RATING_SUBMITTED,
        users: Math.round(totalUsers * 0.35),
        conversionRate: 35,
        dropoffRate: 12,
        averageTime: 55,
      },
    ];

    const dropoffPoints = steps
      .filter(s => s.dropoffRate > 10)
      .map(s => s.step);

    const bottlenecks = [FunnelStep.VIEW_OPTIONS, FunnelStep.RATING_SUBMITTED];

    return {
      period,
      steps,
      conversionRate: 35,
      dropoffPoints,
      bottlenecks,
    };
  }

  // ==================== Segmentation ====================

  /**
   * Analyze user segments
   */
  async analyzeSegments(): Promise<SegmentAnalysis[]> {
    const totalUsers = 50000;
    
    const segments: SegmentAnalysis[] = [
      {
        segment: UserSegment.NEW_USERS,
        userCount: Math.round(totalUsers * 0.15),
        percentage: 15,
        averageRevenue: 25,
        averageRides: 1.5,
        retentionRate: 60,
        characteristics: {
          signupPeriod: 'Last 30 days',
          engagementLevel: 'Low',
        },
      },
      {
        segment: UserSegment.ACTIVE_USERS,
        userCount: Math.round(totalUsers * 0.45),
        percentage: 45,
        averageRevenue: 150,
        averageRides: 8,
        retentionRate: 85,
        characteristics: {
          ridesPerMonth: '5-15',
          engagementLevel: 'Medium',
        },
      },
      {
        segment: UserSegment.POWER_USERS,
        userCount: Math.round(totalUsers * 0.10),
        percentage: 10,
        averageRevenue: 450,
        averageRides: 25,
        retentionRate: 95,
        characteristics: {
          ridesPerMonth: '20+',
          engagementLevel: 'High',
        },
      },
      {
        segment: UserSegment.AT_RISK,
        userCount: Math.round(totalUsers * 0.15),
        percentage: 15,
        averageRevenue: 50,
        averageRides: 2,
        retentionRate: 30,
        characteristics: {
          lastRide: '30-60 days ago',
          engagementLevel: 'Declining',
        },
      },
      {
        segment: UserSegment.CHURNED,
        userCount: Math.round(totalUsers * 0.10),
        percentage: 10,
        averageRevenue: 0,
        averageRides: 0,
        retentionRate: 0,
        characteristics: {
          lastRide: '60+ days ago',
          engagementLevel: 'None',
        },
      },
      {
        segment: UserSegment.VIP,
        userCount: Math.round(totalUsers * 0.05),
        percentage: 5,
        averageRevenue: 800,
        averageRides: 40,
        retentionRate: 98,
        characteristics: {
          ridesPerMonth: '30+',
          engagementLevel: 'Very High',
          specialBenefits: true,
        },
      },
    ];

    this.logger.info('Segment analysis completed', { 
      segmentCount: segments.length 
    });

    return segments;
  }

  // ==================== Geographic Analytics ====================

  /**
   * Get geographic metrics
   */
  async getGeographicMetrics(regions: string[]): Promise<GeographicMetrics[]> {
    return regions.map(region => ({
      region,
      coordinates: this.getRegionCoordinates(region),
      
      // Volume
      totalRides: this.randomValue(1000, 5000),
      activeUsers: this.randomValue(500, 2000),
      activeDrivers: this.randomValue(100, 500),
      
      // Performance
      averageWaitTime: this.randomValue(3, 10),
      averageRideDistance: this.randomValue(5, 15),
      completionRate: this.randomValue(90, 98),
      
      // Financial
      revenue: this.randomValue(20000, 100000),
      averageRideValue: this.randomValue(15, 35),
      
      // Heatmap data
      demand: this.randomValue(50, 100),
      supply: this.randomValue(40, 90),
      demandSupplyRatio: this.randomValue(0.8, 1.5),
    }));
  }

  /**
   * Get heatmap data
   */
  async getHeatmapData(
    granularity: 'city' | 'neighborhood' | 'zone'
  ): Promise<HeatmapData> {
    const regions = this.getRegionsByGranularity(granularity);
    const metrics = await this.getGeographicMetrics(regions);

    return {
      timestamp: new Date(),
      regions: metrics,
      granularity,
    };
  }

  // ==================== Real-Time Analytics ====================

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    return {
      timestamp: new Date(),
      
      // Current State
      activeRides: this.randomValue(100, 500),
      queuedRequests: this.randomValue(0, 50),
      onlineDrivers: this.randomValue(200, 800),
      availableDrivers: this.randomValue(150, 600),
      
      // Last Minute
      ridesStarted: this.randomValue(5, 20),
      ridesCompleted: this.randomValue(5, 20),
      ridesCanceled: this.randomValue(0, 3),
      matchesMade: this.randomValue(5, 25),
      
      // Performance
      averageMatchingTime: this.randomValue(15, 45),
      averageWaitTime: this.randomValue(3, 8),
      systemLoad: this.randomValue(40, 80),
      errorRate: this.randomValue(0.1, 2),
      
      // Alerts
      activeAlerts: this.randomValue(0, 5),
      criticalAlerts: this.randomValue(0, 2),
    };
  }

  // ==================== Anomaly Detection ====================

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(metric: string): Promise<AnomalyDetection[]> {
    // In production, use ML models for anomaly detection
    // For now, return mock anomalies
    
    if (Math.random() > 0.7) {
      const anomaly: AnomalyDetection = {
        id: `anomaly_${Date.now()}`,
        metric,
        type: this.getRandomAnomalyType(),
        severity: 'medium',
        detectedAt: new Date(),
        value: this.randomValue(100, 1000),
        expectedValue: this.randomValue(80, 900),
        deviation: this.randomValue(10, 50),
        confidence: this.randomValue(75, 95),
        description: `Anomaly detected in ${metric}`,
        relatedMetrics: [],
      };

      this.anomalies.push(anomaly);
      this.logger.warn('Anomaly detected', { metric, type: anomaly.type });
      
      return [anomaly];
    }

    return [];
  }

  /**
   * Get recent anomalies
   */
  async getRecentAnomalies(hours: number = 24): Promise<AnomalyDetection[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.anomalies.filter(a => a.detectedAt >= cutoff);
  }

  // ==================== ML Insights ====================

  /**
   * Generate ML insights
   */
  async generateInsights(): Promise<MLInsight[]> {
    const insights: MLInsight[] = [
      {
        id: `insight_${Date.now()}_1`,
        type: 'prediction',
        title: 'Demand Spike Predicted',
        description: 'Expected 30% increase in ride requests during evening rush hour',
        confidence: 85,
        impact: 'high',
        actionable: true,
        suggestedActions: [
          'Increase driver incentives for evening slots',
          'Send push notifications to drivers',
          'Activate surge pricing in high-demand areas',
        ],
        data: {
          predictedIncrease: 30,
          timeFrame: '17:00-19:00',
          affectedRegions: ['Downtown', 'Business District'],
        },
        createdAt: new Date(),
      },
      {
        id: `insight_${Date.now()}_2`,
        type: 'anomaly',
        title: 'Unusual Cancellation Rate',
        description: 'Cancellation rate 45% higher than normal in West Zone',
        confidence: 92,
        impact: 'medium',
        actionable: true,
        suggestedActions: [
          'Investigate driver behavior in West Zone',
          'Check for technical issues',
          'Survey affected users',
        ],
        data: {
          currentRate: 8.7,
          normalRate: 6.0,
          affectedRegion: 'West Zone',
        },
        createdAt: new Date(),
      },
      {
        id: `insight_${Date.now()}_3`,
        type: 'recommendation',
        title: 'Retention Opportunity',
        description: '500 at-risk users could be retained with targeted promotions',
        confidence: 78,
        impact: 'medium',
        actionable: true,
        suggestedActions: [
          'Send 20% discount coupon',
          'Offer free ride after 3 paid rides',
          'Personalized re-engagement campaign',
        ],
        data: {
          atRiskUsers: 500,
          potentialRevenue: 15000,
          campaignCost: 3000,
        },
        createdAt: new Date(),
      },
    ];

    this.insights.push(...insights);
    this.logger.info('ML insights generated', { count: insights.length });

    return insights;
  }

  /**
   * Get recent insights
   */
  async getRecentInsights(limit: number = 10): Promise<MLInsight[]> {
    return this.insights
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ==================== KPI Tracking ====================

  /**
   * Get key performance indicators
   */
  async getKPIs(category?: MetricCategory): Promise<KPI[]> {
    const allKPIs: KPI[] = [
      {
        id: 'revenue_growth',
        name: 'Revenue Growth',
        category: MetricCategory.FINANCIAL,
        value: 23.5,
        unit: '%',
        target: 25,
        threshold: { warning: 15, critical: 10 },
        trend: TrendDirection.UP,
        changePercent: 5.2,
        timestamp: new Date(),
      },
      {
        id: 'ride_completion_rate',
        name: 'Ride Completion Rate',
        category: MetricCategory.OPERATIONAL,
        value: 94.2,
        unit: '%',
        target: 95,
        threshold: { warning: 90, critical: 85 },
        trend: TrendDirection.STABLE,
        changePercent: 0.8,
        timestamp: new Date(),
      },
      {
        id: 'driver_acceptance_rate',
        name: 'Driver Acceptance Rate',
        category: MetricCategory.OPERATIONAL,
        value: 87.5,
        unit: '%',
        target: 90,
        threshold: { warning: 80, critical: 70 },
        trend: TrendDirection.UP,
        changePercent: 3.2,
        timestamp: new Date(),
      },
      {
        id: 'average_wait_time',
        name: 'Average Wait Time',
        category: MetricCategory.OPERATIONAL,
        value: 4.2,
        unit: 'min',
        target: 3.5,
        threshold: { warning: 5, critical: 7 },
        trend: TrendDirection.DOWN,
        changePercent: -8.5,
        timestamp: new Date(),
      },
      {
        id: 'user_retention',
        name: 'User Retention Rate',
        category: MetricCategory.USER_ENGAGEMENT,
        value: 82.0,
        unit: '%',
        target: 85,
        threshold: { warning: 75, critical: 70 },
        trend: TrendDirection.UP,
        changePercent: 2.5,
        timestamp: new Date(),
      },
    ];

    if (category) {
      return allKPIs.filter(kpi => kpi.category === category);
    }

    return allKPIs;
  }

  // ==================== Helper Methods ====================

  /**
   * Get period dates
   */
  private getPeriodDates(period: TimePeriod): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case TimePeriod.LAST_HOUR:
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case TimePeriod.LAST_24H:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case TimePeriod.LAST_7D:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case TimePeriod.LAST_30D:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case TimePeriod.LAST_90D:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
  }

  /**
   * Generate random value
   */
  private randomValue(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Get random anomaly type
   */
  private getRandomAnomalyType(): AnomalyType {
    const types = Object.values(AnomalyType);
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Get region coordinates (mock)
   */
  private getRegionCoordinates(region: string): { latitude: number; longitude: number } {
    // Mock coordinates for major Brazilian cities
    const coordinates: Record<string, { latitude: number; longitude: number }> = {
      'São Paulo': { latitude: -23.5505, longitude: -46.6333 },
      'Rio de Janeiro': { latitude: -22.9068, longitude: -43.1729 },
      'Brasília': { latitude: -15.8267, longitude: -47.9218 },
      'Salvador': { latitude: -12.9714, longitude: -38.5014 },
      'Fortaleza': { latitude: -3.7172, longitude: -38.5433 },
    };

    return coordinates[region] || { latitude: 0, longitude: 0 };
  }

  /**
   * Get regions by granularity
   */
  private getRegionsByGranularity(granularity: 'city' | 'neighborhood' | 'zone'): string[] {
    if (granularity === 'city') {
      return ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza'];
    } else if (granularity === 'neighborhood') {
      return ['Downtown', 'West Zone', 'East Zone', 'North Zone', 'South Zone'];
    } else {
      return ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
    }
  }

  /**
   * Clean up old data
   */
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

    // Clean anomalies
    this.anomalies = this.anomalies.filter(a => a.detectedAt >= cutoff);

    // Clean insights
    this.insights = this.insights.filter(i => i.createdAt >= cutoff);

    this.logger.info('Analytics data cleaned up');
  }
}
