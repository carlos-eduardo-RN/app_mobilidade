import prisma from '../db/prisma';
import { Logger } from '../utils/Logger';
import { RideStatus } from '../../../shared/contracts/ride-status';
import { RideService } from './RideService';
import { AdminQueryFilters, AdminNotification, ExportOptions, SystemHealth } from '../models/Admin';
import { PaymentProvider, Refund, RefundReason, RefundStatus } from '../models/Payment';

export class AdminService {
  constructor(private rideService: RideService) {}

  async getDashboardStats() {
    const totalUsers = await prisma.user.count();
    const totalDrivers = await prisma.driver.count();
    const totalRides = await prisma.ride.count();
    const activeDrivers = await prisma.driver.count({
      where: { active: true, isBlocked: false },
    });

    const ongoingRides = await prisma.ride.count({
      where: {
        status: {
          notIn: [
            RideStatus.Completed,
            RideStatus.Cancelled,
          ] as any,
        },
      },
    });

    return {
      totalUsers,
      totalDrivers,
      totalRides,
      activeDrivers,
      ongoingRides,
      timestamp: new Date(),
    };
  }

  async getUsers(filters: AdminQueryFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.status && filters.status.length > 0) {
      where.role = { in: filters.status };
    }

    const [total, data] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
    ]);

    return {
      data,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserManagement(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  async updateUser(userId: string, updates: any, adminId: string) {
    return prisma.user.update({ where: { id: userId }, data: updates });
  }

  async banUser(userId: string, reason: string, adminId: string) {
    const driver = await prisma.driver.findUnique({ where: { id: userId } });
    if (driver) {
      await prisma.driver.update({
        where: { id: userId },
        data: { isBlocked: true, active: false },
      });
    }
  }

  async unbanUser(userId: string, adminId: string) {
    const driver = await prisma.driver.findUnique({ where: { id: userId } });
    if (driver) {
      await prisma.driver.update({
        where: { id: userId },
        data: { isBlocked: false, active: true },
      });
    }
  }

  async getRides(filters: AdminQueryFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }
    if (filters.userId) {
      where.passengerId = filters.userId;
    }
    if (filters.driverId) {
      where.driverId = filters.driverId;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [total, data] = await Promise.all([
      prisma.ride.count({ where }),
      prisma.ride.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
    ]);

    return {
      data,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRideManagement(rideId: string) {
    return prisma.ride.findUnique({ where: { id: rideId } });
  }

  async cancelRide(rideId: string, reason: string, _refund: boolean, adminId: string) {
    const result = await this.rideService.cancelRide({
      rideId,
      cancelledBy: 'system',
      reason,
    });
    return result.ride;
  }

  // ==================== Payment Management ====================

  async getPayments(filters: AdminQueryFilters) {
    Logger.info('AdminService', 'Listing payments (mock)', { filters });

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    return {
      data: [],
      page,
      total: 0,
      totalPages: 0,
    };
  }

  async processRefund(
    paymentId: string,
    amount: number,
    reason: string,
    adminId: string
  ): Promise<Refund> {
    const normalizedReason = this.normalizeRefundReason(reason);

    const refund: Refund = {
      id: this.generateId('ref'),
      paymentId,
      userId: adminId,
      amount,
      currency: 'BRL',
      reason: normalizedReason,
      status: RefundStatus.COMPLETED,
      provider: PaymentProvider.INTERNAL,
      requestedBy: adminId,
      approvedBy: adminId,
      requestedAt: new Date(),
      approvedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    Logger.info('AdminService', 'Processed refund (mock)', {
      paymentId,
      refundId: refund.id,
      amount,
      reason: refund.reason,
    });

    return refund;
  }

  // ==================== Exports & Reports ====================

  async exportData(options: ExportOptions) {
    Logger.info('AdminService', 'Export requested (mock)', { options });

    return {
      id: this.generateId('export'),
      format: options.format,
      status: 'queued',
      progress: 0,
      requestedAt: new Date(),
      fileName: options.fileName || `export_${Date.now()}`,
    };
  }

  // ==================== System Health & Monitoring ====================

  async getSystemHealth(): Promise<SystemHealth> {
    return {
      status: 'HEALTHY',
      services: {
        api: { status: 'ok', responseTime: 5 },
        database: { status: 'ok', responseTime: 12 },
        cache: { status: 'ok', responseTime: 3 },
        queue: { status: 'ok', messageCount: 0 },
      },
      metrics: {
        cpu: 5,
        memory: 35,
        disk: 40,
        network: 1,
      },
      uptime: process.uptime(),
      lastChecked: new Date(),
    };
  }

  // ==================== Logs & Auditing ====================

  async getActionLogs(filters: AdminQueryFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.type && filters.type.length > 0) {
      where.action = { in: filters.type };
    }
    if (filters.userId) {
      where.adminId = filters.userId;
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [total, data] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: filters.sortOrder === 'asc' ? 'asc' : 'desc' },
      }),
    ]);

    return {
      data,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== Notifications ====================

  async getNotifications(_adminId: string, _unreadOnly: boolean): Promise<AdminNotification[]> {
    return [];
  }

  async markNotificationRead(_notificationId: string): Promise<void> {
    return;
  }

  private normalizeRefundReason(reason: string): RefundReason {
    const value = (reason || '').toUpperCase();
    const known = Object.values(RefundReason);
    if (known.includes(value as RefundReason)) {
      return value as RefundReason;
    }
    return RefundReason.OTHER;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
