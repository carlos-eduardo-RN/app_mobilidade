/**
 * Advanced Analytics Test Suite
 * Tests for analytics services, metrics, reports, and insights
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdvancedAnalyticsService } from '../src/services/AdvancedAnalyticsService';
import { ReportGeneratorService } from '../src/services/ReportGeneratorService';
import {
  TimePeriod,
  TrendDirection,
  UserSegment,
  ReportType,
  ReportFormat,
  ReportConfig,
  AnomalyType,
  MetricCategory,
} from '../src/models/Analytics';

describe('Advanced Analytics Service', () => {
  let service: AdvancedAnalyticsService;

  beforeEach(() => {
    service = new AdvancedAnalyticsService();
  });

  describe('Business Metrics', () => {
    it('should get business metrics for last 24 hours', async () => {
      const metrics = await service.getBusinessMetrics(TimePeriod.LAST_24H);

      expect(metrics).toHaveProperty('totalRevenue');
      expect(metrics).toHaveProperty('totalRides');
      expect(metrics).toHaveProperty('completedRides');
      expect(metrics).toHaveProperty('averageRating');
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should get business metrics for last 7 days', async () => {
      const metrics = await service.getBusinessMetrics(TimePeriod.LAST_7D);

      expect(metrics.totalRevenue).toBeGreaterThan(0);
      expect(metrics.totalRides).toBeGreaterThan(0);
      expect(metrics.rideCompletionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.rideCompletionRate).toBeLessThanOrEqual(100);
    });

    it('should get business metrics for last 30 days', async () => {
      const metrics = await service.getBusinessMetrics(TimePeriod.LAST_30D);

      expect(metrics.activePassengers).toBeGreaterThan(0);
      expect(metrics.activeDrivers).toBeGreaterThan(0);
      expect(metrics.newPassengers).toBeGreaterThanOrEqual(0);
      expect(metrics.newDrivers).toBeGreaterThanOrEqual(0);
    });

    it('should calculate revenue per ride', async () => {
      const metrics = await service.getBusinessMetrics(TimePeriod.LAST_24H);

      expect(metrics.revenuePerRide).toBeGreaterThan(0);
      expect(metrics.revenuePerRide).toBeLessThan(100);
    });

    it('should track user retention rate', async () => {
      const metrics = await service.getBusinessMetrics(TimePeriod.LAST_30D);

      expect(metrics.userRetentionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.userRetentionRate).toBeLessThanOrEqual(100);
    });

    it('should track driver utilization', async () => {
      const metrics = await service.getBusinessMetrics(TimePeriod.LAST_7D);

      expect(metrics.driverUtilizationRate).toBeGreaterThanOrEqual(0);
      expect(metrics.driverUtilizationRate).toBeLessThanOrEqual(100);
    });

    it('should include NPS score', async () => {
      const metrics = await service.getBusinessMetrics(TimePeriod.LAST_30D);

      expect(metrics.npsScore).toBeGreaterThanOrEqual(-100);
      expect(metrics.npsScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Operational Metrics', () => {
    it('should get operational metrics', async () => {
      const metrics = await service.getOperationalMetrics();

      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('requestsPerMinute');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should track system uptime', async () => {
      const metrics = await service.getOperationalMetrics();

      expect(metrics.uptime).toBeGreaterThanOrEqual(99);
      expect(metrics.uptime).toBeLessThanOrEqual(100);
    });

    it('should track matching success rate', async () => {
      const metrics = await service.getOperationalMetrics();

      expect(metrics.matchingSuccessRate).toBeGreaterThanOrEqual(0);
      expect(metrics.matchingSuccessRate).toBeLessThanOrEqual(100);
    });

    it('should track driver metrics', async () => {
      const metrics = await service.getOperationalMetrics();

      expect(metrics.driversOnline).toBeGreaterThanOrEqual(0);
      expect(metrics.driversAvailable).toBeGreaterThanOrEqual(0);
      expect(metrics.driversAvailable).toBeLessThanOrEqual(metrics.driversOnline);
    });

    it('should track resource usage', async () => {
      const metrics = await service.getOperationalMetrics();

      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(100);
    });

    it('should track queue length', async () => {
      const metrics = await service.getOperationalMetrics();

      expect(metrics.queueLength).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Financial Analytics', () => {
    it('should get financial analytics', async () => {
      const analytics = await service.getFinancialAnalytics(TimePeriod.LAST_30D);

      expect(analytics).toHaveProperty('grossRevenue');
      expect(analytics).toHaveProperty('netRevenue');
      expect(analytics).toHaveProperty('commissionEarned');
      expect(analytics.period).toBe(TimePeriod.LAST_30D);
    });

    it('should calculate net revenue correctly', async () => {
      const analytics = await service.getFinancialAnalytics(TimePeriod.LAST_30D);

      expect(analytics.netRevenue).toBeLessThan(analytics.grossRevenue);
      expect(analytics.netRevenue).toBeGreaterThan(0);
    });

    it('should break down revenue by payment method', async () => {
      const analytics = await service.getFinancialAnalytics(TimePeriod.LAST_30D);

      expect(analytics.revenueByPaymentMethod).toHaveProperty('credit_card');
      expect(analytics.revenueByPaymentMethod).toHaveProperty('debit_card');
      expect(analytics.revenueByPaymentMethod).toHaveProperty('pix');
    });

    it('should break down revenue by ride type', async () => {
      const analytics = await service.getFinancialAnalytics(TimePeriod.LAST_30D);

      expect(analytics.revenueByRideType).toHaveProperty('economy');
      expect(analytics.revenueByRideType).toHaveProperty('comfort');
      expect(analytics.revenueByRideType).toHaveProperty('premium');
    });

    it('should break down revenue by region', async () => {
      const analytics = await service.getFinancialAnalytics(TimePeriod.LAST_30D);

      expect(analytics.revenueByRegion).toBeDefined();
      expect(Object.keys(analytics.revenueByRegion).length).toBeGreaterThan(0);
    });

    it('should provide revenue growth metrics', async () => {
      const analytics = await service.getFinancialAnalytics(TimePeriod.LAST_30D);

      expect(analytics.revenueGrowth).toBeDefined();
      expect(analytics.projectedRevenue).toBeGreaterThanOrEqual(0);
    });

    it('should track costs', async () => {
      const analytics = await service.getFinancialAnalytics(TimePeriod.LAST_30D);

      expect(analytics.driverPayments).toBeGreaterThan(0);
      expect(analytics.refunds).toBeGreaterThanOrEqual(0);
      expect(analytics.operationalCosts).toBeGreaterThan(0);
    });
  });

  describe('User Engagement', () => {
    it('should get user engagement metrics', async () => {
      const metrics = await service.getUserEngagement(TimePeriod.LAST_30D);

      expect(metrics).toHaveProperty('dailyActivePassengers');
      expect(metrics).toHaveProperty('monthlyActivePassengers');
      expect(metrics).toHaveProperty('passengerChurnRate');
    });

    it('should track active users at different intervals', async () => {
      const metrics = await service.getUserEngagement(TimePeriod.LAST_30D);

      expect(metrics.dailyActivePassengers).toBeLessThan(metrics.weeklyActivePassengers);
      expect(metrics.weeklyActivePassengers).toBeLessThan(metrics.monthlyActivePassengers);
    });

    it('should track driver engagement', async () => {
      const metrics = await service.getUserEngagement(TimePeriod.LAST_30D);

      expect(metrics.dailyActiveDrivers).toBeGreaterThan(0);
      expect(metrics.weeklyActiveDrivers).toBeGreaterThan(0);
      expect(metrics.monthlyActiveDrivers).toBeGreaterThan(0);
    });

    it('should calculate retention rates', async () => {
      const metrics = await service.getUserEngagement(TimePeriod.LAST_30D);

      expect(metrics.day1Retention).toBeGreaterThanOrEqual(metrics.day7Retention);
      expect(metrics.day7Retention).toBeGreaterThanOrEqual(metrics.day30Retention);
    });

    it('should track engagement metrics', async () => {
      const metrics = await service.getUserEngagement(TimePeriod.LAST_30D);

      expect(metrics.averageRidesPerPassenger).toBeGreaterThan(0);
      expect(metrics.averageRidesPerDriver).toBeGreaterThan(0);
      expect(metrics.averageSessionDuration).toBeGreaterThan(0);
    });
  });

  describe('Trend Analysis', () => {
    it('should analyze trend for a metric', async () => {
      const trend = await service.analyzeTrend('total_rides', TimePeriod.LAST_7D);

      expect(trend).toHaveProperty('metric');
      expect(trend).toHaveProperty('direction');
      expect(trend).toHaveProperty('magnitude');
      expect(trend).toHaveProperty('dataPoints');
      expect(trend.metric).toBe('total_rides');
    });

    it('should generate data points', async () => {
      const trend = await service.analyzeTrend('revenue', TimePeriod.LAST_24H);

      expect(trend.dataPoints.length).toBeGreaterThan(0);
      trend.dataPoints.forEach(point => {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('value');
        expect(point.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should determine trend direction', async () => {
      const trend = await service.analyzeTrend('users', TimePeriod.LAST_7D);

      expect([TrendDirection.UP, TrendDirection.DOWN, TrendDirection.STABLE]).toContain(
        trend.direction
      );
    });

    it('should provide prediction', async () => {
      const trend = await service.analyzeTrend('rides', TimePeriod.LAST_7D);

      expect(trend.prediction).toBeDefined();
      expect(trend.prediction?.nextValue).toBeGreaterThanOrEqual(0);
      expect(trend.prediction?.confidence).toBeGreaterThanOrEqual(0);
      expect(trend.prediction?.confidence).toBeLessThanOrEqual(100);
    });

    it('should provide confidence bounds', async () => {
      const trend = await service.analyzeTrend('revenue', TimePeriod.LAST_7D);

      if (trend.prediction) {
        expect(trend.prediction.upperBound).toBeGreaterThanOrEqual(trend.prediction.nextValue);
        expect(trend.prediction.lowerBound).toBeLessThanOrEqual(trend.prediction.nextValue);
      }
    });
  });

  describe('Cohort Analysis', () => {
    it('should get cohort metrics', async () => {
      const cohorts = await service.getCohortMetrics(6);

      expect(cohorts).toHaveProperty('cohorts');
      expect(cohorts).toHaveProperty('averageRetention');
      expect(cohorts.cohorts.length).toBeGreaterThan(0);
    });

    it('should track retention by period', async () => {
      const cohorts = await service.getCohortMetrics(3);

      cohorts.cohorts.forEach(cohort => {
        expect(cohort.retentionByPeriod['Month 0']).toBe(100);
        expect(cohort.retentionByPeriod['Month 1']).toBeLessThan(100);
      });
    });

    it('should track revenue by period', async () => {
      const cohorts = await service.getCohortMetrics(3);

      cohorts.cohorts.forEach(cohort => {
        expect(cohort.revenueByPeriod).toBeDefined();
        expect(Object.keys(cohort.revenueByPeriod).length).toBeGreaterThan(0);
      });
    });

    it('should identify best and worst performing cohorts', async () => {
      const cohorts = await service.getCohortMetrics(6);

      expect(cohorts.bestPerformingCohort).toBeDefined();
      expect(cohorts.worstPerformingCohort).toBeDefined();
    });
  });

  describe('Funnel Analysis', () => {
    it('should analyze conversion funnel', async () => {
      const funnel = await service.analyzeFunnel(TimePeriod.LAST_7D);

      expect(funnel).toHaveProperty('steps');
      expect(funnel).toHaveProperty('conversionRate');
      expect(funnel.steps.length).toBeGreaterThan(0);
    });

    it('should show decreasing user count through funnel', async () => {
      const funnel = await service.analyzeFunnel(TimePeriod.LAST_7D);

      for (let i = 1; i < funnel.steps.length; i++) {
        expect(funnel.steps[i].users).toBeLessThanOrEqual(funnel.steps[i - 1].users);
      }
    });

    it('should calculate conversion rates', async () => {
      const funnel = await service.analyzeFunnel(TimePeriod.LAST_7D);

      funnel.steps.forEach(step => {
        expect(step.conversionRate).toBeGreaterThanOrEqual(0);
        expect(step.conversionRate).toBeLessThanOrEqual(100);
      });
    });

    it('should identify dropoff points', async () => {
      const funnel = await service.analyzeFunnel(TimePeriod.LAST_7D);

      expect(Array.isArray(funnel.dropoffPoints)).toBe(true);
    });

    it('should identify bottlenecks', async () => {
      const funnel = await service.analyzeFunnel(TimePeriod.LAST_7D);

      expect(Array.isArray(funnel.bottlenecks)).toBe(true);
    });
  });

  describe('Segmentation', () => {
    it('should analyze user segments', async () => {
      const segments = await service.analyzeSegments();

      expect(Array.isArray(segments)).toBe(true);
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should include all standard segments', async () => {
      const segments = await service.analyzeSegments();
      const segmentTypes = segments.map(s => s.segment);

      expect(segmentTypes).toContain(UserSegment.NEW_USERS);
      expect(segmentTypes).toContain(UserSegment.ACTIVE_USERS);
      expect(segmentTypes).toContain(UserSegment.POWER_USERS);
      expect(segmentTypes).toContain(UserSegment.CHURNED);
    });

    it('should calculate segment percentages', async () => {
      const segments = await service.analyzeSegments();

      const totalPercentage = segments.reduce((sum, s) => sum + s.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it('should track segment metrics', async () => {
      const segments = await service.analyzeSegments();

      segments.forEach(segment => {
        expect(segment.userCount).toBeGreaterThanOrEqual(0);
        expect(segment.averageRevenue).toBeGreaterThanOrEqual(0);
        expect(segment.retentionRate).toBeGreaterThanOrEqual(0);
        expect(segment.retentionRate).toBeLessThanOrEqual(100);
      });
    });

    it('should show power users with highest metrics', async () => {
      const segments = await service.analyzeSegments();
      const powerUsers = segments.find(s => s.segment === UserSegment.POWER_USERS);

      expect(powerUsers).toBeDefined();
      if (powerUsers) {
        expect(powerUsers.averageRevenue).toBeGreaterThan(0);
        expect(powerUsers.averageRides).toBeGreaterThan(0);
      }
    });
  });

  describe('Geographic Analytics', () => {
    it('should get geographic metrics', async () => {
      const regions = ['São Paulo', 'Rio de Janeiro'];
      const metrics = await service.getGeographicMetrics(regions);

      expect(metrics.length).toBe(2);
      expect(metrics[0].region).toBe('São Paulo');
    });

    it('should include volume metrics', async () => {
      const metrics = await service.getGeographicMetrics(['São Paulo']);

      expect(metrics[0].totalRides).toBeGreaterThan(0);
      expect(metrics[0].activeUsers).toBeGreaterThan(0);
      expect(metrics[0].activeDrivers).toBeGreaterThan(0);
    });

    it('should include performance metrics', async () => {
      const metrics = await service.getGeographicMetrics(['São Paulo']);

      expect(metrics[0].averageWaitTime).toBeGreaterThan(0);
      expect(metrics[0].completionRate).toBeGreaterThanOrEqual(0);
      expect(metrics[0].completionRate).toBeLessThanOrEqual(100);
    });

    it('should include demand-supply ratio', async () => {
      const metrics = await service.getGeographicMetrics(['São Paulo']);

      expect(metrics[0].demand).toBeGreaterThan(0);
      expect(metrics[0].supply).toBeGreaterThan(0);
      expect(metrics[0].demandSupplyRatio).toBeGreaterThan(0);
    });

    it('should get heatmap data', async () => {
      const heatmap = await service.getHeatmapData('city');

      expect(heatmap).toHaveProperty('timestamp');
      expect(heatmap).toHaveProperty('regions');
      expect(heatmap).toHaveProperty('granularity');
      expect(heatmap.granularity).toBe('city');
    });
  });

  describe('Real-Time Metrics', () => {
    it('should get real-time metrics', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('activeRides');
      expect(metrics).toHaveProperty('onlineDrivers');
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should track current state', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics.activeRides).toBeGreaterThanOrEqual(0);
      expect(metrics.queuedRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.onlineDrivers).toBeGreaterThanOrEqual(0);
      expect(metrics.availableDrivers).toBeLessThanOrEqual(metrics.onlineDrivers);
    });

    it('should track last minute activity', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics.ridesStarted).toBeGreaterThanOrEqual(0);
      expect(metrics.ridesCompleted).toBeGreaterThanOrEqual(0);
      expect(metrics.matchesMade).toBeGreaterThanOrEqual(0);
    });

    it('should track performance', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics.averageMatchingTime).toBeGreaterThan(0);
      expect(metrics.systemLoad).toBeGreaterThanOrEqual(0);
      expect(metrics.systemLoad).toBeLessThanOrEqual(100);
    });

    it('should track alerts', async () => {
      const metrics = await service.getRealTimeMetrics();

      expect(metrics.activeAlerts).toBeGreaterThanOrEqual(0);
      expect(metrics.criticalAlerts).toBeLessThanOrEqual(metrics.activeAlerts);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect anomalies', async () => {
      const anomalies = await service.detectAnomalies('rides');

      expect(Array.isArray(anomalies)).toBe(true);
    });

    it('should provide anomaly details when detected', async () => {
      let foundAnomaly = false;
      
      for (let i = 0; i < 10; i++) {
        const anomalies = await service.detectAnomalies('test_metric');
        if (anomalies.length > 0) {
          foundAnomaly = true;
          expect(anomalies[0]).toHaveProperty('metric');
          expect(anomalies[0]).toHaveProperty('type');
          expect(anomalies[0]).toHaveProperty('severity');
          expect(anomalies[0]).toHaveProperty('confidence');
          break;
        }
      }
    });

    it('should get recent anomalies', async () => {
      const anomalies = await service.getRecentAnomalies(24);

      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  describe('ML Insights', () => {
    it('should generate insights', async () => {
      const insights = await service.generateInsights();

      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should include different insight types', async () => {
      const insights = await service.generateInsights();
      const types = insights.map(i => i.type);

      expect(types.length).toBeGreaterThan(0);
    });

    it('should provide actionable insights', async () => {
      const insights = await service.generateInsights();

      insights.forEach(insight => {
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('confidence');
        expect(insight).toHaveProperty('impact');
      });
    });

    it('should include suggested actions', async () => {
      const insights = await service.generateInsights();

      const actionableInsights = insights.filter(i => i.actionable);
      expect(actionableInsights.length).toBeGreaterThan(0);

      actionableInsights.forEach(insight => {
        if (insight.suggestedActions) {
          expect(insight.suggestedActions.length).toBeGreaterThan(0);
        }
      });
    });

    it('should get recent insights', async () => {
      await service.generateInsights();
      const recent = await service.getRecentInsights(5);

      expect(Array.isArray(recent)).toBe(true);
      expect(recent.length).toBeLessThanOrEqual(5);
    });
  });

  describe('KPI Tracking', () => {
    it('should get all KPIs', async () => {
      const kpis = await service.getKPIs();

      expect(Array.isArray(kpis)).toBe(true);
      expect(kpis.length).toBeGreaterThan(0);
    });

    it('should filter KPIs by category', async () => {
      const financial = await service.getKPIs(MetricCategory.FINANCIAL);
      const operational = await service.getKPIs(MetricCategory.OPERATIONAL);

      expect(financial.every(k => k.category === MetricCategory.FINANCIAL)).toBe(true);
      expect(operational.every(k => k.category === MetricCategory.OPERATIONAL)).toBe(true);
    });

    it('should include KPI metadata', async () => {
      const kpis = await service.getKPIs();

      kpis.forEach(kpi => {
        expect(kpi).toHaveProperty('id');
        expect(kpi).toHaveProperty('name');
        expect(kpi).toHaveProperty('value');
        expect(kpi).toHaveProperty('unit');
        expect(kpi).toHaveProperty('trend');
        expect(kpi).toHaveProperty('changePercent');
      });
    });

    it('should include targets and thresholds', async () => {
      const kpis = await service.getKPIs();

      kpis.forEach(kpi => {
        if (kpi.target) {
          expect(kpi.target).toBeGreaterThan(0);
        }
        if (kpi.threshold) {
          expect(kpi.threshold.warning).toBeDefined();
          expect(kpi.threshold.critical).toBeDefined();
        }
      });
    });
  });

  describe('Data Cleanup', () => {
    it('should cleanup old data', async () => {
      await service.cleanup();
      // Should not throw
    });
  });
});

describe('Report Generator Service', () => {
  let analyticsService: AdvancedAnalyticsService;
  let reportService: ReportGeneratorService;

  beforeEach(() => {
    analyticsService = new AdvancedAnalyticsService();
    reportService = new ReportGeneratorService(analyticsService);
  });

  describe('Report Generation', () => {
    it('should generate daily summary report', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Daily Summary',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('config');
      expect(report).toHaveProperty('data');
      expect(report.config.type).toBe(ReportType.DAILY_SUMMARY);
    });

    it('should generate weekly summary report', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Weekly Summary',
        type: ReportType.WEEKLY_SUMMARY,
        format: ReportFormat.EXCEL,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(report.config.type).toBe(ReportType.WEEKLY_SUMMARY);
      expect(report.config.format).toBe(ReportFormat.EXCEL);
    });

    it('should generate monthly summary report', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Monthly Summary',
        type: ReportType.MONTHLY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(report.config.type).toBe(ReportType.MONTHLY_SUMMARY);
    });

    it('should generate financial report', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Financial Report',
        type: ReportType.FINANCIAL,
        format: ReportFormat.EXCEL,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(report.data.summary.title).toContain('Financial');
    });

    it('should generate operational report', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Operational Report',
        type: ReportType.OPERATIONAL,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(report.data.summary.title).toContain('Operational');
    });

    it('should generate user activity report', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'User Activity',
        type: ReportType.USER_ACTIVITY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(report.data.summary.title).toContain('User Activity');
    });

    it('should generate driver performance report', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Driver Performance',
        type: ReportType.DRIVER_PERFORMANCE,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(report.data.summary.title).toContain('Driver');
    });
  });

  describe('Report Data', () => {
    it('should include summary', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Test Report',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(report.data.summary).toHaveProperty('title');
      expect(report.data.summary).toHaveProperty('highlights');
      expect(report.data.summary.highlights.length).toBeGreaterThan(0);
    });

    it('should include charts', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Test Report',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(Array.isArray(report.data.charts)).toBe(true);
    });

    it('should include tables', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Test Report',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(Array.isArray(report.data.tables)).toBe(true);
    });

    it('should include insights', async () => {
      const config: ReportConfig = {
        id: 'test_report',
        name: 'Test Report',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      expect(Array.isArray(report.data.insights)).toBe(true);
    });
  });

  describe('Report Scheduling', () => {
    it('should schedule a report', async () => {
      const config: ReportConfig = {
        id: 'scheduled_report',
        name: 'Scheduled Report',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        schedule: {
          frequency: 'daily',
          time: '09:00',
          timezone: 'America/Sao_Paulo',
        },
        isActive: true,
      };

      await reportService.scheduleReport(config);

      const scheduled = await reportService.getScheduledReports();
      expect(scheduled.length).toBeGreaterThan(0);
      expect(scheduled.some(r => r.id === config.id)).toBe(true);
    });

    it('should cancel scheduled report', async () => {
      const config: ReportConfig = {
        id: 'scheduled_report_2',
        name: 'Scheduled Report 2',
        type: ReportType.WEEKLY_SUMMARY,
        format: ReportFormat.EXCEL,
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 1,
          time: '10:00',
          timezone: 'America/Sao_Paulo',
        },
        isActive: true,
      };

      await reportService.scheduleReport(config);
      await reportService.cancelScheduledReport(config.id);

      const scheduled = await reportService.getScheduledReports();
      expect(scheduled.some(r => r.id === config.id)).toBe(false);
    });

    it('should get all scheduled reports', async () => {
      const scheduled = await reportService.getScheduledReports();
      expect(Array.isArray(scheduled)).toBe(true);
    });
  });

  describe('Report Retrieval', () => {
    it('should get generated report by ID', async () => {
      const config: ReportConfig = {
        id: 'test_report_3',
        name: 'Test Report 3',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const generated = await reportService.generateReport(config);
      const retrieved = await reportService.getReport(generated.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(generated.id);
    });

    it('should return undefined for non-existent report', async () => {
      const report = await reportService.getReport('non_existent_id');
      expect(report).toBeUndefined();
    });

    it('should get recent reports', async () => {
      const recent = await reportService.getRecentReports(5);

      expect(Array.isArray(recent)).toBe(true);
      expect(recent.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Report Status', () => {
    it('should start with generating status', async () => {
      const config: ReportConfig = {
        id: 'test_report_4',
        name: 'Test Report 4',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);
      expect(report.status).toBe('generating');
    });

    it('should complete after generation', async () => {
      const config: ReportConfig = {
        id: 'test_report_5',
        name: 'Test Report 5',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1100));

      const completed = await reportService.getReport(report.id);
      expect(completed?.status).toBe('completed');
    });

    it('should have file URL when completed', async () => {
      const config: ReportConfig = {
        id: 'test_report_6',
        name: 'Test Report 6',
        type: ReportType.DAILY_SUMMARY,
        format: ReportFormat.PDF,
        isActive: true,
      };

      const report = await reportService.generateReport(config);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1100));

      const completed = await reportService.getReport(report.id);
      expect(completed?.fileUrl).toBeDefined();
    });
  });
});
