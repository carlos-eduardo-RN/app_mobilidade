/**
 * Notification Service
 * Multi-channel notification delivery system
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationData,
  PushNotificationPayload,
  EmailNotificationPayload,
  SMSNotificationPayload,
  NotificationPreferences,
  DeviceToken,
} from '../models/Notification';
import { Logger } from '../utils/Logger';

export class NotificationService {
  private logger = new Logger('NotificationService');
  
  // In-memory storage (replace with database in production)
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private deviceTokens: Map<string, DeviceToken[]> = new Map();
  
  /**
   * Create and send notification
   */
  async send(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    channels?: NotificationChannel[];
    priority?: NotificationPriority;
    data?: NotificationData;
    scheduledFor?: Date;
  }): Promise<Notification> {
    const {
      userId,
      type,
      title,
      message,
      channels = [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority = NotificationPriority.NORMAL,
      data,
      scheduledFor,
    } = params;

    // Check user preferences
    const userPreferences = this.preferences.get(userId);
    const allowedChannels = this.filterChannelsByPreferences(
      channels,
      userPreferences,
      type
    );

    if (allowedChannels.length === 0) {
      this.logger.info('No channels allowed for notification', { userId, type });
      throw new Error('All notification channels blocked by user preferences');
    }

    // Check quiet hours
    if (this.isQuietHours(userPreferences)) {
      this.logger.info('Quiet hours active, scheduling for later', { userId });
      // Schedule for end of quiet hours
      scheduledFor = this.getQuietHoursEnd(userPreferences);
    }

    // Create notification
    const notification: Notification = {
      id: uuidv4(),
      userId,
      type,
      priority,
      title,
      message,
      channels: allowedChannels,
      data,
      status: scheduledFor ? NotificationStatus.PENDING : NotificationStatus.QUEUED,
      attempts: 0,
      maxAttempts: 3,
      channelStatus: {},
      scheduledFor,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate channel-specific payloads
    if (allowedChannels.includes(NotificationChannel.PUSH)) {
      notification.pushPayload = this.createPushPayload(notification);
    }
    if (allowedChannels.includes(NotificationChannel.EMAIL)) {
      notification.emailPayload = this.createEmailPayload(notification);
    }
    if (allowedChannels.includes(NotificationChannel.SMS)) {
      notification.smsPayload = this.createSMSPayload(notification);
    }

    // Store notification
    this.notifications.set(notification.id, notification);

    // Send immediately if not scheduled
    if (!scheduledFor) {
      await this.deliver(notification.id);
    }

    this.logger.info('Notification created', {
      id: notification.id,
      type,
      channels: allowedChannels,
    });

    return notification;
  }

  /**
   * Send notification to multiple users
   */
  async sendBatch(params: {
    userIds: string[];
    type: NotificationType;
    title: string;
    message: string;
    channels?: NotificationChannel[];
    priority?: NotificationPriority;
    data?: NotificationData;
  }): Promise<{
    total: number;
    success: number;
    failed: number;
    results: Array<{ userId: string; notificationId?: string; error?: string }>;
  }> {
    const results: Array<{ userId: string; notificationId?: string; error?: string }> = [];
    let success = 0;
    let failed = 0;

    for (const userId of params.userIds) {
      try {
        const notification = await this.send({
          ...params,
          userId,
        });
        
        results.push({ userId, notificationId: notification.id });
        success++;
      } catch (error) {
        results.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return {
      total: params.userIds.length,
      success,
      failed,
      results,
    };
  }

  /**
   * Deliver notification to all channels
   */
  async deliver(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.status = NotificationStatus.SENDING;
    notification.attempts++;
    notification.updatedAt = new Date();

    const deliveryPromises: Promise<void>[] = [];

    // Deliver to each channel
    for (const channel of notification.channels) {
      deliveryPromises.push(
        this.deliverToChannel(notification, channel)
          .catch(error => {
            this.logger.error('Channel delivery failed', {
              notificationId,
              channel,
              error,
            });
          })
      );
    }

    await Promise.allSettled(deliveryPromises);

    // Update overall status
    const allSent = notification.channels.every(
      channel => notification.channelStatus[channel]?.status === NotificationStatus.SENT
    );
    const allFailed = notification.channels.every(
      channel => notification.channelStatus[channel]?.status === NotificationStatus.FAILED
    );

    if (allSent) {
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } else if (allFailed) {
      notification.status = NotificationStatus.FAILED;
    } else {
      notification.status = NotificationStatus.SENT; // Partially sent
      notification.sentAt = new Date();
    }

    notification.updatedAt = new Date();
    this.notifications.set(notificationId, notification);
  }

  /**
   * Deliver to specific channel
   */
  private async deliverToChannel(
    notification: Notification,
    channel: NotificationChannel
  ): Promise<void> {
    notification.channelStatus[channel] = {
      status: NotificationStatus.SENDING,
    };

    try {
      switch (channel) {
        case NotificationChannel.PUSH:
          await this.sendPushNotification(notification);
          break;
        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSMSNotification(notification);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInAppNotification(notification);
          break;
      }

      notification.channelStatus[channel] = {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      };

      this.logger.info('Channel delivery successful', {
        notificationId: notification.id,
        channel,
      });
    } catch (error) {
      notification.channelStatus[channel] = {
        status: NotificationStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      throw error;
    }
  }

  /**
   * Send push notification via Firebase/FCM
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    const tokens = this.deviceTokens.get(notification.userId) || [];
    const activeTokens = tokens.filter(t => t.isActive);

    if (activeTokens.length === 0) {
      throw new Error('No active device tokens found');
    }

    // In production, use Firebase Admin SDK
    // const admin = require('firebase-admin');
    // await admin.messaging().sendMulticast({
    //   tokens: activeTokens.map(t => t.token),
    //   notification: notification.pushPayload,
    //   data: notification.data,
    // });

    // Mock implementation
    this.logger.info('Push notification sent', {
      notificationId: notification.id,
      tokens: activeTokens.length,
    });

    // Simulate async delivery
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send email notification via SendGrid
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    // In production, use SendGrid
    // const sgMail = require('@sendgrid/mail');
    // await sgMail.send({
    //   to: userEmail,
    //   from: 'noreply@voudemoto.com',
    //   subject: notification.emailPayload?.subject,
    //   html: notification.emailPayload?.html,
    // });

    // Mock implementation
    this.logger.info('Email notification sent', {
      notificationId: notification.id,
      userId: notification.userId,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send SMS notification via Twilio
   */
  private async sendSMSNotification(notification: Notification): Promise<void> {
    // In production, use Twilio
    // const twilio = require('twilio');
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({
    //   to: userPhone,
    //   from: twilioPhone,
    //   body: notification.smsPayload?.message,
    // });

    // Mock implementation
    this.logger.info('SMS notification sent', {
      notificationId: notification.id,
      userId: notification.userId,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send in-app notification (stored in notification center)
   */
  private async sendInAppNotification(notification: Notification): Promise<void> {
    // In-app notifications are already stored in database
    // Just mark as delivered
    this.logger.info('In-app notification delivered', {
      notificationId: notification.id,
      userId: notification.userId,
    });
  }

  /**
   * Get notification by ID
   */
  getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Get user notifications
   */
  getUserNotifications(
    userId: string,
    filters?: {
      status?: NotificationStatus;
      type?: NotificationType;
      unreadOnly?: boolean;
      limit?: number;
    }
  ): Notification[] {
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId);

    if (filters?.status) {
      notifications = notifications.filter(n => n.status === filters.status);
    }

    if (filters?.type) {
      notifications = notifications.filter(n => n.type === filters.type);
    }

    if (filters?.unreadOnly) {
      notifications = notifications.filter(n => !n.readAt);
    }

    // Sort by creation date (newest first)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      notifications = notifications.slice(0, filters.limit);
    }

    return notifications;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    notification.updatedAt = new Date();

    this.notifications.set(notificationId, notification);

    return notification;
  }

  /**
   * Mark multiple notifications as read
   */
  markManyAsRead(notificationIds: string[]): number {
    let count = 0;

    for (const id of notificationIds) {
      try {
        this.markAsRead(id);
        count++;
      } catch (error) {
        this.logger.error('Failed to mark as read', { id, error });
      }
    }

    return count;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  /**
   * Get/Set user preferences
   */
  getUserPreferences(userId: string): NotificationPreferences | undefined {
    return this.preferences.get(userId);
  }

  setUserPreferences(preferences: NotificationPreferences): void {
    preferences.updatedAt = new Date();
    this.preferences.set(preferences.userId, preferences);
  }

  /**
   * Register device token for push notifications
   */
  registerDeviceToken(token: DeviceToken): void {
    const userTokens = this.deviceTokens.get(token.userId) || [];
    
    // Deactivate old tokens for same device
    userTokens.forEach(t => {
      if (t.deviceId === token.deviceId) {
        t.isActive = false;
      }
    });

    userTokens.push(token);
    this.deviceTokens.set(token.userId, userTokens);

    this.logger.info('Device token registered', {
      userId: token.userId,
      platform: token.platform,
    });
  }

  /**
   * Unregister device token
   */
  unregisterDeviceToken(userId: string, deviceId: string): void {
    const userTokens = this.deviceTokens.get(userId) || [];
    const updatedTokens = userTokens.map(t => {
      if (t.deviceId === deviceId) {
        t.isActive = false;
      }
      return t;
    });

    this.deviceTokens.set(userId, updatedTokens);
  }

  /**
   * Helper: Filter channels by user preferences
   */
  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    preferences: NotificationPreferences | undefined,
    type: NotificationType
  ): NotificationChannel[] {
    if (!preferences) {
      return channels;
    }

    // Check if type is enabled
    if (preferences.types[type] === false) {
      return [];
    }

    // Filter by channel preferences
    return channels.filter(channel => preferences.channels[channel] !== false);
  }

  /**
   * Helper: Check if quiet hours are active
   */
  private isQuietHours(preferences: NotificationPreferences | undefined): boolean {
    if (!preferences?.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = preferences.quietHours.start;
    const end = preferences.quietHours.end;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }

    return currentTime >= start && currentTime <= end;
  }

  /**
   * Helper: Get end time of quiet hours
   */
  private getQuietHoursEnd(preferences: NotificationPreferences | undefined): Date {
    if (!preferences?.quietHours) {
      return new Date();
    }

    const [hours, minutes] = preferences.quietHours.end.split(':').map(Number);
    const end = new Date();
    end.setHours(hours, minutes, 0, 0);

    // If end time is before current time, add a day
    if (end < new Date()) {
      end.setDate(end.getDate() + 1);
    }

    return end;
  }

  /**
   * Helper: Create push notification payload
   */
  private createPushPayload(notification: Notification): PushNotificationPayload {
    return {
      title: notification.title,
      body: notification.message,
      icon: '/icon.png',
      badge: 1,
      sound: notification.priority === NotificationPriority.URGENT ? 'urgent.mp3' : 'default.mp3',
      clickAction: notification.data?.deepLink,
      data: notification.data,
    };
  }

  /**
   * Helper: Create email payload
   */
  private createEmailPayload(notification: Notification): EmailNotificationPayload {
    // In production, use template engine (Handlebars)
    return {
      subject: notification.title,
      html: `
        <html>
          <body>
            <h1>${notification.title}</h1>
            <p>${notification.message}</p>
          </body>
        </html>
      `,
      text: notification.message,
    };
  }

  /**
   * Helper: Create SMS payload
   */
  private createSMSPayload(notification: Notification): SMSNotificationPayload {
    // SMS should be short (160 chars)
    const message = notification.message.length > 140 
      ? notification.message.substring(0, 140) + '...'
      : notification.message;

    return {
      message: `${notification.title}: ${message}`,
    };
  }

  /**
   * Get notification statistics
   */
  getStats(userId: string, periodDays: number = 30): {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    readRate: number;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    const notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId && n.createdAt >= cutoffDate);

    const total = notifications.length;
    const sent = notifications.filter(n => n.status === NotificationStatus.SENT || n.status === NotificationStatus.DELIVERED || n.status === NotificationStatus.READ).length;
    const delivered = notifications.filter(n => n.status === NotificationStatus.DELIVERED || n.status === NotificationStatus.READ).length;
    const read = notifications.filter(n => n.status === NotificationStatus.READ).length;
    const failed = notifications.filter(n => n.status === NotificationStatus.FAILED).length;

    return {
      total,
      sent,
      delivered,
      read,
      failed,
      readRate: sent > 0 ? (read / sent) * 100 : 0,
    };
  }

  /**
   * Export all data (for testing)
   */
  export() {
    return {
      notifications: Array.from(this.notifications.values()),
      preferences: Array.from(this.preferences.values()),
      deviceTokens: Array.from(this.deviceTokens.entries()),
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.notifications.clear();
    this.preferences.clear();
    this.deviceTokens.clear();
  }
}
