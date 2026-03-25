/**
 * Admin Controller
 * Endpoints do painel administrativo
 */

import { Request, Response, NextFunction } from 'express';
import { ApplicationService } from '../services/ApplicationService';
import { AdminService } from '../services/AdminService';
import { Logger } from '../utils/Logger';
import { AdminQueryFilters, ExportOptions } from '../models/Admin';
import prisma from '../db/prisma';
import { recordAdminAudit } from '../utils/AdminAudit';
import { getRequestIp } from '../utils/AdminCookies';

export class AdminController {
  private adminService: AdminService;

  constructor(private appService: ApplicationService) {
    this.adminService = new AdminService(appService.rideService);
  }

  private async auditAction(
    req: Request,
    action: string,
    entityType: string,
    entityId?: string,
    beforeJson?: unknown,
    afterJson?: unknown
  ): Promise<void> {
    const adminId = req.adminId;
    if (!adminId) return;

    await recordAdminAudit({
      adminId,
      action,
      entityType,
      entityId,
      beforeJson,
      afterJson,
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent'),
    });
  }

  // ==================== Dashboard Statistics ====================

  /**
   * GET /api/admin/stats
   * Get dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      Logger.debug('AdminController', 'GET /api/admin/stats', { traceId });

      const stats = await this.adminService.getDashboardStats();

      await this.auditAction(req, 'admin_stats_view', 'dashboard');

      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // ==================== User Management ====================

  /**
   * GET /api/admin/users
   * List all users with management data
   */
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      Logger.debug('AdminController', 'GET /api/admin/users', { traceId });

      const filters: AdminQueryFilters = {
        search: req.query.search as string,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await this.adminService.getUsers(filters);

      await this.auditAction(req, 'admin_users_list', 'user');

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:userId
   * Get user management data
   */
  async getUserManagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { userId } = req.params;
      Logger.debug('AdminController', `GET /api/admin/users/${userId}`, { traceId });

      const user = await this.adminService.getUserManagement(userId);

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      await this.auditAction(req, 'admin_user_view', 'user', userId);

      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:userId
   * Update user
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { userId } = req.params;
      const updates = req.body;
      const adminId = req.adminId;
      if (!adminId) {
        res.status(403).json({ success: false, error: 'FORBIDDEN' });
        return;
      }

      Logger.debug('AdminController', `PUT /api/admin/users/${userId}`, { traceId, updates });

      const beforeUser = await this.adminService.getUserManagement(userId);
      const updatedUser = await this.adminService.updateUser(userId, updates, adminId);

      await this.auditAction(req, 'admin_user_update', 'user', userId, beforeUser, updatedUser);

      res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:userId/ban
   * Ban user
   */
  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = req.adminId;
      if (!adminId) {
        res.status(403).json({ success: false, error: 'FORBIDDEN' });
        return;
      }

      Logger.debug('AdminController', `POST /api/admin/users/${userId}/ban`, { traceId, reason });

      const beforeDriver = await prisma.driver.findUnique({ where: { id: userId } });
      await this.adminService.banUser(userId, reason, adminId);
      const afterDriver = await prisma.driver.findUnique({ where: { id: userId } });

      await this.auditAction(req, 'admin_user_ban', 'driver', userId, beforeDriver, afterDriver);

      res.status(200).json({ success: true, message: 'User banned successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users/:userId/unban
   * Unban user
   */
  async unbanUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { userId } = req.params;
      const adminId = req.adminId;
      if (!adminId) {
        res.status(403).json({ success: false, error: 'FORBIDDEN' });
        return;
      }

      Logger.debug('AdminController', `POST /api/admin/users/${userId}/unban`, { traceId });

      const beforeDriver = await prisma.driver.findUnique({ where: { id: userId } });
      await this.adminService.unbanUser(userId, adminId);
      const afterDriver = await prisma.driver.findUnique({ where: { id: userId } });

      await this.auditAction(req, 'admin_user_unban', 'driver', userId, beforeDriver, afterDriver);

      res.status(200).json({ success: true, message: 'User unbanned successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Ride Management ====================

  /**
   * GET /api/admin/rides
   * List all rides with management data
   */
  async listRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      Logger.debug('AdminController', 'GET /api/admin/rides', { traceId });

      const filters: AdminQueryFilters = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        userId: req.query.userId as string,
        driverId: req.query.driverId as string,
        city: req.query.city as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await this.adminService.getRides(filters);

      await this.auditAction(req, 'admin_rides_list', 'ride');

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/rides/active
   * List active rides (legacy endpoint)
   */
  async listActiveRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      Logger.debug('AdminController', 'GET /api/admin/rides/active', { traceId });

      const filters: AdminQueryFilters = {
        status: ['requested', 'searching', 'driver_assigned', 'in_progress'],
      };

      const result = await this.adminService.getRides(filters);

      await this.auditAction(req, 'admin_rides_active_list', 'ride');

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/rides/:rideId
   * Get ride management data
   */
  async getRideManagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      Logger.debug('AdminController', `GET /api/admin/rides/${rideId}`, { traceId });

      const ride = await this.adminService.getRideManagement(rideId);

      if (!ride) {
        res.status(404).json({ success: false, error: 'Ride not found' });
        return;
      }

      await this.auditAction(req, 'admin_ride_view', 'ride', rideId);

      res.status(200).json({ success: true, data: ride });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/rides/:rideId/cancel
   * Cancel ride
   */
  async cancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { rideId } = req.params;
      const { reason, refund } = req.body;
      const adminId = req.adminId;
      if (!adminId) {
        res.status(403).json({ success: false, error: 'FORBIDDEN' });
        return;
      }

      Logger.debug('AdminController', `POST /api/admin/rides/${rideId}/cancel`, {
        traceId,
        reason,
        refund,
      });

      const beforeRide = await this.adminService.getRideManagement(rideId);
      await this.adminService.cancelRide(rideId, reason, refund, adminId);
      const afterRide = await this.adminService.getRideManagement(rideId);

      await this.auditAction(req, 'admin_ride_cancel', 'ride', rideId, beforeRide, afterRide);

      res.status(200).json({ success: true, message: 'Ride cancelled successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Payment Management ====================

  /**
   * GET /api/admin/payments
   * List all payments
   */
  async listPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      Logger.debug('AdminController', 'GET /api/admin/payments', { traceId });

      const filters: AdminQueryFilters = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        userId: req.query.userId as string,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await this.adminService.getPayments(filters);

      await this.auditAction(req, 'admin_payments_list', 'payment');

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/payments/:paymentId/refund
   * Process refund
   */
  async processRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { paymentId } = req.params;
      const { amount, reason } = req.body;
      const adminId = req.adminId;
      if (!adminId) {
        res.status(403).json({ success: false, error: 'FORBIDDEN' });
        return;
      }

      Logger.debug('AdminController', `POST /api/admin/payments/${paymentId}/refund`, {
        traceId,
        amount,
        reason,
      });

      const refund = await this.adminService.processRefund(paymentId, amount, reason, adminId);

      await this.auditAction(req, 'admin_payment_refund', 'payment', paymentId, undefined, refund);

      res.status(200).json({ success: true, data: refund });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Exports & Reports ====================

  /**
   * POST /api/admin/export
   * Export data
   */
  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const options: ExportOptions = req.body;

      Logger.debug('AdminController', 'POST /api/admin/export', { traceId, options });

      const exportJob = await this.adminService.exportData(options);

      await this.auditAction(req, 'admin_export', 'export');

      res.status(200).json({ success: true, data: exportJob });
    } catch (error) {
      next(error);
    }
  }

  // ==================== System Health & Monitoring ====================

  /**
   * GET /api/admin/health
   * Get system health
   */
  async getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      Logger.debug('AdminController', 'GET /api/admin/health', { traceId });

      const health = await this.adminService.getSystemHealth();

      await this.auditAction(req, 'admin_system_health', 'system');

      res.status(200).json({ success: true, data: health });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/health/simple
   * Simple health check (legacy endpoint)
   */
  async health(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.auditAction(req, 'admin_system_health_simple', 'system');

      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Logs & Auditing ====================

  /**
   * GET /api/admin/logs
   * Get action logs
   */
  async getActionLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      Logger.debug('AdminController', 'GET /api/admin/logs', { traceId });

      const filters: AdminQueryFilters = {
        type: req.query.type ? (req.query.type as string).split(',') : undefined,
        userId: req.query.userId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };

      const result = await this.adminService.getActionLogs(filters);

      await this.auditAction(req, 'admin_audit_list', 'audit_log');

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/events
   * List system events (legacy endpoint - redirects to logs)
   */
  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      Logger.debug('AdminController', 'GET /api/admin/events', { traceId });

      // Redirect to action logs
      const result = await this.adminService.getActionLogs({ page: 1, limit: 50 });

      await this.auditAction(req, 'admin_events_list', 'event');

      res.status(200).json({ success: true, data: result.data });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Notifications ====================

  /**
   * GET /api/admin/notifications
   * Get admin notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const adminId = req.adminId;
      if (!adminId) {
        res.status(403).json({ success: false, error: 'FORBIDDEN' });
        return;
      }
      const unreadOnly = req.query.unreadOnly === 'true';

      Logger.debug('AdminController', 'GET /api/admin/notifications', { traceId, unreadOnly });

      const notifications = await this.adminService.getNotifications(adminId, unreadOnly);

      await this.auditAction(req, 'admin_notifications_list', 'notification');

      res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/notifications/:notificationId/read
   * Mark notification as read
   */
  async markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const traceId = (req as any).traceId;
      const { notificationId } = req.params;

      Logger.debug('AdminController', `PUT /api/admin/notifications/${notificationId}/read`, {
        traceId,
      });

      await this.adminService.markNotificationRead(notificationId);

      await this.auditAction(req, 'admin_notification_read', 'notification', notificationId);

      res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      next(error);
    }
  }
}
