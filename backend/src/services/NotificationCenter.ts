/**
 * Notification Center
 * In-app notification management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  NotificationCenterEntry,
  NotificationType,
  Notification,
} from '../models/Notification';
import { Logger } from '../utils/Logger';

export class NotificationCenter {
  private logger = new Logger('NotificationCenter');
  
  // In-memory storage (replace with database in production)
  private entries: Map<string, NotificationCenterEntry> = new Map();
  
  /**
   * Add notification to user's notification center
   */
  add(params: {
    userId: string;
    notification: Notification;
    actionUrl?: string;
    actionLabel?: string;
  }): NotificationCenterEntry {
    const { userId, notification, actionUrl, actionLabel } = params;

    const entry: NotificationCenterEntry = {
      id: uuidv4(),
      userId,
      notificationId: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      imageUrl: notification.imageUrl,
      actionUrl,
      actionLabel,
      isRead: false,
      isArchived: false,
      createdAt: new Date(),
    };

    this.entries.set(entry.id, entry);

    this.logger.info('Notification added to center', {
      entryId: entry.id,
      userId,
      type: notification.type,
    });

    return entry;
  }

  /**
   * Get user's notifications
   */
  getNotifications(
    userId: string,
    options: {
      includeRead?: boolean;
      includeArchived?: boolean;
      types?: NotificationType[];
      limit?: number;
      offset?: number;
    } = {}
  ): {
    notifications: NotificationCenterEntry[];
    total: number;
    unreadCount: number;
  } {
    const {
      includeRead = true,
      includeArchived = false,
      types,
      limit = 50,
      offset = 0,
    } = options;

    let notifications = Array.from(this.entries.values())
      .filter(entry => entry.userId === userId);

    // Filter by read status
    if (!includeRead) {
      notifications = notifications.filter(n => !n.isRead);
    }

    // Filter by archived status
    if (!includeArchived) {
      notifications = notifications.filter(n => !n.isArchived);
    }

    // Filter by type
    if (types && types.length > 0) {
      notifications = notifications.filter(n => types.includes(n.type));
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = notifications.length;
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Pagination
    notifications = notifications.slice(offset, offset + limit);

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Get notification by ID
   */
  getNotification(entryId: string): NotificationCenterEntry | undefined {
    return this.entries.get(entryId);
  }

  /**
   * Mark notification as read
   */
  markAsRead(entryId: string): NotificationCenterEntry {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error('Notification not found');
    }

    if (!entry.isRead) {
      entry.isRead = true;
      entry.readAt = new Date();
      this.entries.set(entryId, entry);

      this.logger.info('Notification marked as read', {
        entryId,
        userId: entry.userId,
      });
    }

    return entry;
  }

  /**
   * Mark multiple notifications as read
   */
  markManyAsRead(entryIds: string[]): number {
    let count = 0;

    for (const entryId of entryIds) {
      try {
        this.markAsRead(entryId);
        count++;
      } catch (error) {
        this.logger.error('Failed to mark as read', { entryId, error });
      }
    }

    return count;
  }

  /**
   * Mark all user notifications as read
   */
  markAllAsRead(userId: string): number {
    const entries = Array.from(this.entries.values())
      .filter(entry => entry.userId === userId && !entry.isRead);

    let count = 0;
    for (const entry of entries) {
      try {
        this.markAsRead(entry.id);
        count++;
      } catch (error) {
        this.logger.error('Failed to mark as read', { entryId: entry.id, error });
      }
    }

    this.logger.info('All notifications marked as read', {
      userId,
      count,
    });

    return count;
  }

  /**
   * Archive notification
   */
  archive(entryId: string): NotificationCenterEntry {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error('Notification not found');
    }

    if (!entry.isArchived) {
      entry.isArchived = true;
      entry.archivedAt = new Date();
      
      // Auto-mark as read when archiving
      if (!entry.isRead) {
        entry.isRead = true;
        entry.readAt = new Date();
      }

      this.entries.set(entryId, entry);

      this.logger.info('Notification archived', {
        entryId,
        userId: entry.userId,
      });
    }

    return entry;
  }

  /**
   * Unarchive notification
   */
  unarchive(entryId: string): NotificationCenterEntry {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error('Notification not found');
    }

    if (entry.isArchived) {
      entry.isArchived = false;
      entry.archivedAt = undefined;
      this.entries.set(entryId, entry);

      this.logger.info('Notification unarchived', {
        entryId,
        userId: entry.userId,
      });
    }

    return entry;
  }

  /**
   * Delete notification
   */
  delete(entryId: string): boolean {
    const entry = this.entries.get(entryId);
    if (!entry) {
      return false;
    }

    this.entries.delete(entryId);

    this.logger.info('Notification deleted', {
      entryId,
      userId: entry.userId,
    });

    return true;
  }

  /**
   * Delete multiple notifications
   */
  deleteMany(entryIds: string[]): number {
    let count = 0;

    for (const entryId of entryIds) {
      if (this.delete(entryId)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Delete all user notifications
   */
  deleteAll(userId: string, options: { onlyArchived?: boolean } = {}): number {
    let entries = Array.from(this.entries.values())
      .filter(entry => entry.userId === userId);

    if (options.onlyArchived) {
      entries = entries.filter(entry => entry.isArchived);
    }

    let count = 0;
    for (const entry of entries) {
      if (this.delete(entry.id)) {
        count++;
      }
    }

    this.logger.info('User notifications deleted', {
      userId,
      count,
      onlyArchived: options.onlyArchived,
    });

    return count;
  }

  /**
   * Get unread count for user
   */
  getUnreadCount(userId: string): number {
    return Array.from(this.entries.values())
      .filter(entry => entry.userId === userId && !entry.isRead && !entry.isArchived)
      .length;
  }

  /**
   * Get unread counts by type
   */
  getUnreadCountsByType(userId: string): Record<NotificationType, number> {
    const entries = Array.from(this.entries.values())
      .filter(entry => entry.userId === userId && !entry.isRead && !entry.isArchived);

    const counts: Record<string, number> = {};

    for (const entry of entries) {
      counts[entry.type] = (counts[entry.type] || 0) + 1;
    }

    return counts as Record<NotificationType, number>;
  }

  /**
   * Search notifications
   */
  search(userId: string, query: string, options: {
    includeArchived?: boolean;
    limit?: number;
  } = {}): NotificationCenterEntry[] {
    const { includeArchived = false, limit = 20 } = options;

    const lowerQuery = query.toLowerCase();

    let entries = Array.from(this.entries.values())
      .filter(entry => {
        if (entry.userId !== userId) return false;
        if (!includeArchived && entry.isArchived) return false;

        // Search in title and message
        return (
          entry.title.toLowerCase().includes(lowerQuery) ||
          entry.message.toLowerCase().includes(lowerQuery)
        );
      });

    // Sort by relevance (exact matches first, then creation date)
    entries.sort((a, b) => {
      const aExact = a.title.toLowerCase() === lowerQuery || a.message.toLowerCase() === lowerQuery;
      const bExact = b.title.toLowerCase() === lowerQuery || b.message.toLowerCase() === lowerQuery;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return entries.slice(0, limit);
  }

  /**
   * Get statistics for user
   */
  getStats(userId: string, periodDays: number = 30): {
    total: number;
    unread: number;
    archived: number;
    byType: Record<string, number>;
    readRate: number;
    recentActivity: {
      date: string;
      count: number;
    }[];
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const entries = Array.from(this.entries.values())
      .filter(entry => entry.userId === userId && entry.createdAt >= cutoffDate);

    const total = entries.length;
    const unread = entries.filter(e => !e.isRead).length;
    const archived = entries.filter(e => e.isArchived).length;

    // Count by type
    const byType: Record<string, number> = {};
    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }

    // Calculate read rate
    const readRate = total > 0 ? ((total - unread) / total) * 100 : 0;

    // Recent activity (last 7 days)
    const recentActivity: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = entries.filter(
        e => e.createdAt >= date && e.createdAt < nextDate
      ).length;

      recentActivity.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    return {
      total,
      unread,
      archived,
      byType,
      readRate,
      recentActivity,
    };
  }

  /**
   * Cleanup old notifications
   */
  cleanup(options: {
    olderThanDays?: number;
    onlyArchived?: boolean;
    onlyRead?: boolean;
  } = {}): number {
    const {
      olderThanDays = 90,
      onlyArchived = false,
      onlyRead = false,
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const entriesToDelete = Array.from(this.entries.values())
      .filter(entry => {
        if (entry.createdAt >= cutoffDate) return false;
        if (onlyArchived && !entry.isArchived) return false;
        if (onlyRead && !entry.isRead) return false;
        return true;
      });

    let count = 0;
    for (const entry of entriesToDelete) {
      if (this.delete(entry.id)) {
        count++;
      }
    }

    this.logger.info('Cleanup completed', {
      count,
      olderThanDays,
      onlyArchived,
      onlyRead,
    });

    return count;
  }

  /**
   * Export all data (for testing)
   */
  export() {
    return {
      entries: Array.from(this.entries.values()),
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.entries.clear();
  }
}
