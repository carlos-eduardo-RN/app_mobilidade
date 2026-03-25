/**
 * Analytics Controller
 * REST API endpoints para analytics, métricas, relatórios e dashboards
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';
import { AdvancedAnalyticsService } from '../services/AdvancedAnalyticsService';
import { ReportGeneratorService } from '../services/ReportGeneratorService';
import { DashboardService } from '../services/DashboardService';
import { 
  TimePeriod, 
  TimeGranularity, 
  MetricCategory,
  ReportType,
  ReportFormat,
  ReportConfig,
  AnalyticsQuery,
} from '../models/Analytics';

export class AnalyticsController {
  private logger = new Logger('AnalyticsController');
  private analyticsService: AdvancedAnalyticsService;
  private reportService: ReportGeneratorService;
  private dashboardService: DashboardService;

  constructor(
    analyticsService: AdvancedAnalyticsService,
    reportService: ReportGeneratorService,
    dashboardService: DashboardService
  ) {
    this.analyticsService = analyticsService;
    this.reportService = reportService;
    this.dashboardService = dashboardService;
  }

  // ==================== Business Metrics ====================

  /**
   * GET /api/analytics/business
   * Get business metrics
   */
  async getBusinessMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as TimePeriod) || TimePeriod.LAST_24H;
      const metrics = await this.analyticsService.getBusinessMetrics(period);
      
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/operational
   * Get operational metrics
   */
  async getOperationalMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await this.analyticsService.getOperationalMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/financial
   * Get financial analytics
   */
  async getFinancialAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as TimePeriod) || TimePeriod.LAST_30D;
      const analytics = await this.analyticsService.getFinancialAnalytics(period);
      
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/engagement
   * Get user engagement metrics
   */
  async getUserEngagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as TimePeriod) || TimePeriod.LAST_30D;
      const metrics = await this.analyticsService.getUserEngagement(period);
      
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  // ==================== KPIs ====================

  /**
   * GET /api/analytics/kpis
   * Get key performance indicators
   */
  async getKPIs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as MetricCategory | undefined;
      const kpis = await this.analyticsService.getKPIs(category);
      
      res.json({ kpis });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Trends ====================

  /**
   * GET /api/analytics/trends/:metric
   * Analyze trend for a metric
   */
  async analyzeTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { metric } = req.params;
      const period = (req.query.period as TimePeriod) || TimePeriod.LAST_7D;
      
      const trend = await this.analyticsService.analyzeTrend(metric, period);
      res.json(trend);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Cohorts ====================

  /**
   * GET /api/analytics/cohorts
   * Get cohort analysis
   */
  async getCohorts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const monthsBack = parseInt(req.query.months as string) || 6;
      const cohorts = await this.analyticsService.getCohortMetrics(monthsBack);
      
      res.json(cohorts);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Funnel ====================

  /**
   * GET /api/analytics/funnel
   * Get funnel analysis
   */
  async getFunnelAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as TimePeriod) || TimePeriod.LAST_7D;
      const funnel = await this.analyticsService.analyzeFunnel(period);
      
      res.json(funnel);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Segmentation ====================

  /**
   * GET /api/analytics/segments
   * Get user segment analysis
   */
  async getSegments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const segments = await this.analyticsService.analyzeSegments();
      res.json({ segments });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Geographic ====================

  /**
   * GET /api/analytics/geographic
   * Get geographic metrics
   */
  async getGeographicMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const regionsParam = req.query.regions as string;
      const regions = regionsParam ? regionsParam.split(',') : [
        'São Paulo', 'Rio de Janeiro', 'Brasília'
      ];
      
      const metrics = await this.analyticsService.getGeographicMetrics(regions);
      res.json({ metrics });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/heatmap
   * Get heatmap data
   */
  async getHeatmap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const granularity = (req.query.granularity as 'city' | 'neighborhood' | 'zone') || 'city';
      const heatmap = await this.analyticsService.getHeatmapData(granularity);
      
      res.json(heatmap);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Real-Time ====================

  /**
   * GET /api/analytics/realtime
   * Get real-time metrics
   */
  async getRealTimeMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await this.analyticsService.getRealTimeMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Anomalies ====================

  /**
   * GET /api/analytics/anomalies
   * Get detected anomalies
   */
  async getAnomalies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const anomalies = await this.analyticsService.getRecentAnomalies(hours);
      
      res.json({ anomalies });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/analytics/anomalies/detect
   * Detect anomalies for a metric
   */
  async detectAnomalies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { metric } = req.body;
      
      if (!metric) {
        res.status(400).json({ error: 'Metric name required' });
        return;
      }
      
      const anomalies = await this.analyticsService.detectAnomalies(metric);
      res.json({ anomalies });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Insights ====================

  /**
   * GET /api/analytics/insights
   * Get ML-generated insights
   */
  async getInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const insights = await this.analyticsService.getRecentInsights(limit);
      
      res.json({ insights });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/analytics/insights/generate
   * Generate new insights
   */
  async generateInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const insights = await this.analyticsService.generateInsights();
      res.json({ insights });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Reports ====================

  /**
   * POST /api/analytics/reports
   * Generate a new report
   */
  async generateReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config: ReportConfig = {
        id: `config_${Date.now()}`,
        name: req.body.name || 'Custom Report',
        type: req.body.type || ReportType.CUSTOM,
        format: req.body.format || ReportFormat.PDF,
        filters: req.body.filters,
        recipients: req.body.recipients,
        isActive: true,
      };
      
      const report = await this.reportService.generateReport(config);
      res.json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/reports/:id
   * Get a generated report
   */
  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const report = await this.reportService.getReport(id);
      
      if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      
      res.json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/reports
   * Get recent reports
   */
  async getRecentReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const reports = await this.reportService.getRecentReports(limit);
      
      res.json({ reports });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/analytics/reports/schedule
   * Schedule a recurring report
   */
  async scheduleReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config: ReportConfig = {
        id: `scheduled_${Date.now()}`,
        name: req.body.name,
        type: req.body.type,
        format: req.body.format,
        schedule: req.body.schedule,
        filters: req.body.filters,
        recipients: req.body.recipients,
        isActive: true,
      };
      
      await this.reportService.scheduleReport(config);
      res.json({ message: 'Report scheduled successfully', config });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/analytics/reports/schedule/:id
   * Cancel a scheduled report
   */
  async cancelScheduledReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.reportService.cancelScheduledReport(id);
      
      res.json({ message: 'Scheduled report canceled' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/reports/scheduled
   * Get all scheduled reports
   */
  async getScheduledReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reports = await this.reportService.getScheduledReports();
      res.json({ reports });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Dashboard ====================

  /**
   * GET /api/analytics/dashboard/summary
   * Get dashboard summary
   */
  async getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = parseInt(req.query.period as string) || 60;
      const summary = this.dashboardService.getSummary(period);
      
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/dashboard/widgets
   * Get dashboard widgets data
   */
  async getDashboardWidgets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In production, fetch user's custom dashboard configuration
      const widgets = {
        kpis: await this.analyticsService.getKPIs(),
        realtime: await this.analyticsService.getRealTimeMetrics(),
        trends: await this.analyticsService.analyzeTrend('total_rides', TimePeriod.LAST_24H),
        alerts: await this.analyticsService.getRecentAnomalies(24),
      };
      
      res.json(widgets);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Query ====================

  /**
   * POST /api/analytics/query
   * Execute custom analytics query
   */
  async executeQuery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: AnalyticsQuery = req.body;
      
      // Validate query
      if (!query.metrics || query.metrics.length === 0) {
        res.status(400).json({ error: 'Metrics required' });
        return;
      }
      
      // In production, execute query against data warehouse
      // For now, return mock result
      const result = {
        query,
        executedAt: new Date(),
        executionTime: 123,
        data: [],
        aggregations: {},
        metadata: {
          totalRows: 0,
          dataQuality: 100,
          missingDataPoints: 0,
          estimatedValues: 0,
        },
      };
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ==================== Export ====================

  /**
   * POST /api/analytics/export
   * Export analytics data
   */
  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, format, filters } = req.body;
      
      // In production, queue export job
      const exportJob = {
        id: `export_${Date.now()}`,
        type,
        format,
        requestedBy: req.user?.id || 'anonymous',
        requestedAt: new Date(),
        status: 'queued',
        progress: 0,
      };
      
      res.json(exportJob);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/export/:id
   * Get export job status
   */
  async getExportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      // In production, fetch export job status
      const exportJob = {
        id,
        status: 'completed',
        progress: 100,
        fileUrl: `https://storage.example.com/exports/${id}.xlsx`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
      
      res.json(exportJob);
    } catch (error) {
      next(error);
    }
  }
}
