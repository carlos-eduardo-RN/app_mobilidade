/**
 * Firebase Service
 * Firebase Cloud Messaging (FCM) integration for push notifications
 */

import * as admin from 'firebase-admin';
import {
  PushNotificationPayload,
  DeviceToken,
  NotificationPriority,
} from '../models/Notification';
import { Logger } from '../utils/Logger';

interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export class FirebaseService {
  private logger = new Logger('FirebaseService');
  private initialized = false;
  private app: admin.app.App | null = null;

  /**
   * Initialize Firebase Admin SDK
   */
  initialize(config?: FirebaseConfig): void {
    if (this.initialized) {
      this.logger.warn('Firebase already initialized');
      return;
    }

    try {
      // Use provided config or environment variables
      const firebaseConfig = config || {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      };

      // Initialize Firebase Admin
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          privateKey: firebaseConfig.privateKey,
          clientEmail: firebaseConfig.clientEmail,
        }),
      });

      this.initialized = true;
      this.logger.info('Firebase initialized successfully', {
        projectId: firebaseConfig.projectId,
      });
    } catch (error) {
      this.logger.error('Firebase initialization failed', { error });
      throw error;
    }
  }

  /**
   * Send push notification to single device
   */
  async sendToDevice(
    deviceToken: string,
    payload: PushNotificationPayload,
    options: {
      priority?: NotificationPriority;
      ttl?: number; // Time to live in seconds
      collapseKey?: string;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.ensureInitialized();

    const { priority = NotificationPriority.NORMAL, ttl = 3600, collapseKey } = options;

    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.icon,
        },
        data: payload.data ? this.stringifyData(payload.data) : undefined,
        android: {
          priority: this.getAndroidPriority(priority),
          ttl: ttl * 1000, // Convert to milliseconds
          collapseKey,
          notification: {
            sound: payload.sound || 'default',
            clickAction: payload.clickAction,
            channelId: this.getChannelId(priority),
            priority: this.getAndroidNotificationPriority(priority),
          },
        },
        apns: {
          headers: {
            'apns-priority': this.getApnsPriority(priority),
            'apns-expiration': String(Math.floor(Date.now() / 1000) + ttl),
          },
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: payload.sound || 'default',
              badge: payload.badge,
              category: payload.clickAction,
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            badge: payload.icon,
            data: payload.data,
          },
          fcmOptions: {
            link: payload.clickAction,
          },
        },
      };

      const messageId = await admin.messaging().send(message);

      this.logger.info('Push notification sent', {
        messageId,
        deviceToken: this.maskToken(deviceToken),
      });

      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error('Push notification failed', {
        deviceToken: this.maskToken(deviceToken),
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToDevices(
    deviceTokens: string[],
    payload: PushNotificationPayload,
    options: {
      priority?: NotificationPriority;
      ttl?: number;
    } = {}
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{ token: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    this.ensureInitialized();

    if (deviceTokens.length === 0) {
      return { successCount: 0, failureCount: 0, results: [] };
    }

    // FCM supports max 500 tokens per request
    const batches = this.chunkArray(deviceTokens, 500);
    let successCount = 0;
    let failureCount = 0;
    const results: Array<{ token: string; success: boolean; messageId?: string; error?: string }> = [];

    for (const batch of batches) {
      const batchResults = await this.sendMulticast(batch, payload, options);
      successCount += batchResults.successCount;
      failureCount += batchResults.failureCount;
      results.push(...batchResults.results);
    }

    this.logger.info('Batch push notifications sent', {
      total: deviceTokens.length,
      success: successCount,
      failed: failureCount,
    });

    return { successCount, failureCount, results };
  }

  /**
   * Send multicast message (internal helper)
   */
  private async sendMulticast(
    tokens: string[],
    payload: PushNotificationPayload,
    options: {
      priority?: NotificationPriority;
      ttl?: number;
    } = {}
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{ token: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const { priority = NotificationPriority.NORMAL, ttl = 3600 } = options;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.icon,
        },
        data: payload.data ? this.stringifyData(payload.data) : undefined,
        android: {
          priority: this.getAndroidPriority(priority),
          ttl: ttl * 1000,
          notification: {
            sound: payload.sound || 'default',
            clickAction: payload.clickAction,
            channelId: this.getChannelId(priority),
            priority: this.getAndroidNotificationPriority(priority),
          },
        },
        apns: {
          headers: {
            'apns-priority': this.getApnsPriority(priority),
            'apns-expiration': String(Math.floor(Date.now() / 1000) + ttl),
          },
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: payload.sound || 'default',
              badge: payload.badge,
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);

      const results = response.responses.map((resp, index) => ({
        token: tokens[index],
        success: resp.success,
        messageId: resp.messageId,
        error: resp.error?.message,
      }));

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        results,
      };
    } catch (error: any) {
      this.logger.error('Multicast send failed', { error: error.message });
      
      return {
        successCount: 0,
        failureCount: tokens.length,
        results: tokens.map(token => ({
          token,
          success: false,
          error: error.message,
        })),
      };
    }
  }

  /**
   * Send to topic
   */
  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
    options: {
      priority?: NotificationPriority;
      ttl?: number;
    } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.ensureInitialized();

    const { priority = NotificationPriority.NORMAL, ttl = 3600 } = options;

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.icon,
        },
        data: payload.data ? this.stringifyData(payload.data) : undefined,
        android: {
          priority: this.getAndroidPriority(priority),
          ttl: ttl * 1000,
        },
        apns: {
          headers: {
            'apns-priority': this.getApnsPriority(priority),
            'apns-expiration': String(Math.floor(Date.now() / 1000) + ttl),
          },
        },
      };

      const messageId = await admin.messaging().send(message);

      this.logger.info('Topic notification sent', { topic, messageId });

      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error('Topic notification failed', {
        topic,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe devices to topic
   */
  async subscribeToTopic(
    deviceTokens: string | string[],
    topic: string
  ): Promise<{ successCount: number; failureCount: number }> {
    this.ensureInitialized();

    const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);

      this.logger.info('Devices subscribed to topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      this.logger.error('Topic subscription failed', {
        topic,
        error: error.message,
      });

      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Unsubscribe devices from topic
   */
  async unsubscribeFromTopic(
    deviceTokens: string | string[],
    topic: string
  ): Promise<{ successCount: number; failureCount: number }> {
    this.ensureInitialized();

    const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);

      this.logger.info('Devices unsubscribed from topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      this.logger.error('Topic unsubscription failed', {
        topic,
        error: error.message,
      });

      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Validate device token
   */
  async validateToken(deviceToken: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      // Try to send a dry run message
      await admin.messaging().send(
        {
          token: deviceToken,
          notification: {
            title: 'Test',
            body: 'Test',
          },
        },
        true // dry run
      );

      return true;
    } catch (error: any) {
      this.logger.warn('Token validation failed', {
        token: this.maskToken(deviceToken),
        error: error.message,
      });

      return false;
    }
  }

  /**
   * Helper: Ensure Firebase is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.app) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
  }

  /**
   * Helper: Convert data to string format (FCM requirement)
   */
  private stringifyData(data: Record<string, any>): Record<string, string> {
    const stringData: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }

    return stringData;
  }

  /**
   * Helper: Get Android priority
   */
  private getAndroidPriority(priority: NotificationPriority): 'high' | 'normal' {
    return priority === NotificationPriority.URGENT || priority === NotificationPriority.HIGH
      ? 'high'
      : 'normal';
  }

  /**
   * Helper: Get Android notification priority
   */
  private getAndroidNotificationPriority(priority: NotificationPriority): 'max' | 'high' | 'default' | 'low' | 'min' {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'max';
      case NotificationPriority.HIGH:
        return 'high';
      case NotificationPriority.NORMAL:
        return 'default';
      case NotificationPriority.LOW:
        return 'low';
      default:
        return 'default';
    }
  }

  /**
   * Helper: Get APNS priority
   */
  private getApnsPriority(priority: NotificationPriority): '10' | '5' {
    return priority === NotificationPriority.URGENT || priority === NotificationPriority.HIGH
      ? '10'
      : '5';
  }

  /**
   * Helper: Get Android channel ID
   */
  private getChannelId(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'urgent_notifications';
      case NotificationPriority.HIGH:
        return 'high_priority_notifications';
      case NotificationPriority.LOW:
        return 'low_priority_notifications';
      default:
        return 'default_notifications';
    }
  }

  /**
   * Helper: Mask device token for logging
   */
  private maskToken(token: string): string {
    if (token.length <= 10) return '***';
    return `${token.substring(0, 5)}...${token.substring(token.length - 5)}`;
  }

  /**
   * Helper: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Close Firebase connection
   */
  async close(): Promise<void> {
    if (this.app) {
      await this.app.delete();
      this.initialized = false;
      this.app = null;
      this.logger.info('Firebase connection closed');
    }
  }
}
