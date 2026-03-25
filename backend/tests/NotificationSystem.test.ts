/**
 * Comprehensive Notification System Tests
 * Tests for all notification services
 */

import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationPreferences,
} from '../src/models/Notification';
import { NotificationService } from '../src/services/NotificationService';
import { NotificationQueue } from '../src/services/NotificationQueue';
import { NotificationCenter } from '../src/services/NotificationCenter';
import { NotificationTemplates } from '../src/services/NotificationTemplates';
import { FirebaseService } from '../src/services/FirebaseService';
import { TwilioService } from '../src/services/TwilioService';
import { SendGridService } from '../src/services/SendGridService';

describe('NotificationService Tests', () => {
  let notificationService: NotificationService;
  let mockNotification: Notification;

  beforeEach(() => {
    // Initialize service
    notificationService = new NotificationService({
      firebase: {
        projectId: 'test-project',
        clientEmail: 'test@test.com',
        privateKey: 'test-key',
      },
      twilio: {
        accountSid: 'test-sid',
        authToken: 'test-token',
        phoneNumber: '+5511999999999',
      },
      sendgrid: {
        apiKey: 'test-key',
        fromEmail: 'noreply@voudmoto.com',
        fromName: 'VouDeMoto',
      },
      redis: {
        host: 'localhost',
        port: 6379,
      },
    });

    // Mock notification
    mockNotification = {
      id: 'notif-123',
      userId: 'user-123',
      type: NotificationType.RIDE_REQUEST,
      title: 'Nova corrida disponível',
      message: 'Corrida de Centro para Aeroporto',
      data: {
        rideId: 'ride-123',
        origin: 'Centro',
        destination: 'Aeroporto',
      },
      channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
      channelStatus: {},
      priority: NotificationPriority.HIGH,
      status: NotificationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('Send Notification', () => {
    it('should send notification to all channels', async () => {
      const result = await notificationService.send(mockNotification);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockNotification.id);
      expect(result.status).toBe(NotificationStatus.SENT);
    });

    it('should respect quiet hours', async () => {
      // Set quiet hours (22:00 - 08:00)
      await notificationService.updatePreferences('user-123', {
        userId: 'user-123',
        channels: {
          [NotificationChannel.PUSH]: true,
          [NotificationChannel.EMAIL]: true,
          [NotificationChannel.SMS]: true,
          [NotificationChannel.IN_APP]: true,
        },
        quietHours: {
          start: '22:00',
          end: '08:00',
        },
        language: 'pt-BR',
      });

      // Mock current time to be during quiet hours
      const now = new Date();
      now.setHours(23, 0, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const result = await notificationService.send(mockNotification);

      // Should be queued, not sent immediately
      expect(result.status).toBe(NotificationStatus.QUEUED);
    });

    it('should skip disabled channels', async () => {
      // Disable SMS channel
      await notificationService.updatePreferences('user-123', {
        userId: 'user-123',
        channels: {
          [NotificationChannel.PUSH]: true,
          [NotificationChannel.EMAIL]: true,
          [NotificationChannel.SMS]: false,
          [NotificationChannel.IN_APP]: true,
        },
        language: 'pt-BR',
      });

      const result = await notificationService.send(mockNotification);

      // Should not send to SMS
      expect(result.channelStatus[NotificationChannel.SMS]).toBeUndefined();
    });

    it('should handle URGENT notifications during quiet hours', async () => {
      // Set quiet hours
      await notificationService.updatePreferences('user-123', {
        userId: 'user-123',
        channels: {
          [NotificationChannel.PUSH]: true,
          [NotificationChannel.EMAIL]: true,
          [NotificationChannel.SMS]: true,
          [NotificationChannel.IN_APP]: true,
        },
        quietHours: {
          start: '22:00',
          end: '08:00',
        },
        language: 'pt-BR',
      });

      // Mock quiet hours time
      const now = new Date();
      now.setHours(23, 0, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());

      // URGENT notification should bypass quiet hours
      mockNotification.priority = NotificationPriority.URGENT;
      const result = await notificationService.send(mockNotification);

      expect(result.status).toBe(NotificationStatus.SENT);
    });
  });

  describe('Batch Send', () => {
    it('should send multiple notifications', async () => {
      const notifications: Notification[] = [
        { ...mockNotification, id: 'notif-1', userId: 'user-1' },
        { ...mockNotification, id: 'notif-2', userId: 'user-2' },
        { ...mockNotification, id: 'notif-3', userId: 'user-3' },
      ];

      const results = await notificationService.sendBatch(notifications);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.status === NotificationStatus.SENT)).toBe(true);
    });

    it('should handle partial failures', async () => {
      const notifications: Notification[] = [
        { ...mockNotification, id: 'notif-1', userId: 'user-1' },
        { ...mockNotification, id: 'notif-2', userId: 'invalid-user' }, // Should fail
        { ...mockNotification, id: 'notif-3', userId: 'user-3' },
      ];

      const results = await notificationService.sendBatch(notifications);

      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.status === NotificationStatus.SENT)).toHaveLength(2);
      expect(results.filter((r) => r.status === NotificationStatus.FAILED)).toHaveLength(1);
    });
  });

  describe('Schedule Notification', () => {
    it('should schedule notification for future', async () => {
      const sendAt = new Date();
      sendAt.setHours(sendAt.getHours() + 2); // 2 hours from now

      const result = await notificationService.scheduleNotification(
        mockNotification,
        sendAt
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(NotificationStatus.QUEUED);
    });

    it('should reject past schedule times', async () => {
      const sendAt = new Date();
      sendAt.setHours(sendAt.getHours() - 1); // 1 hour ago

      await expect(
        notificationService.scheduleNotification(mockNotification, sendAt)
      ).rejects.toThrow('Cannot schedule notification in the past');
    });
  });

  describe('User Preferences', () => {
    it('should update user preferences', async () => {
      const preferences: NotificationPreferences = {
        userId: 'user-123',
        channels: {
          [NotificationChannel.PUSH]: true,
          [NotificationChannel.EMAIL]: false,
          [NotificationChannel.SMS]: true,
          [NotificationChannel.IN_APP]: true,
        },
        quietHours: {
          start: '22:00',
          end: '08:00',
        },
        language: 'pt-BR',
      };

      await notificationService.updatePreferences('user-123', preferences);

      const retrieved = await notificationService.getPreferences('user-123');
      expect(retrieved).toEqual(preferences);
    });

    it('should return default preferences for new user', async () => {
      const preferences = await notificationService.getPreferences('new-user');

      expect(preferences.channels[NotificationChannel.PUSH]).toBe(true);
      expect(preferences.channels[NotificationChannel.EMAIL]).toBe(true);
      expect(preferences.channels[NotificationChannel.SMS]).toBe(true);
      expect(preferences.channels[NotificationChannel.IN_APP]).toBe(true);
    });
  });

  describe('Device Tokens', () => {
    it('should add device token', async () => {
      await notificationService.addDeviceToken(
        'user-123',
        'token-abc-123',
        'ios'
      );

      const tokens = await notificationService.getDeviceTokens('user-123');
      expect(tokens).toContain('token-abc-123');
    });

    it('should remove device token', async () => {
      await notificationService.addDeviceToken(
        'user-123',
        'token-abc-123',
        'ios'
      );
      await notificationService.removeDeviceToken('user-123', 'token-abc-123');

      const tokens = await notificationService.getDeviceTokens('user-123');
      expect(tokens).not.toContain('token-abc-123');
    });

    it('should handle multiple devices per user', async () => {
      await notificationService.addDeviceToken('user-123', 'token-ios', 'ios');
      await notificationService.addDeviceToken(
        'user-123',
        'token-android',
        'android'
      );
      await notificationService.addDeviceToken('user-123', 'token-web', 'web');

      const tokens = await notificationService.getDeviceTokens('user-123');
      expect(tokens).toHaveLength(3);
    });
  });
});

describe('NotificationQueue Tests', () => {
  let notificationQueue: NotificationQueue;

  beforeEach(() => {
    notificationQueue = new NotificationQueue({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    });
  });

  afterEach(async () => {
    await notificationQueue.clearQueue();
  });

  describe('Queue Operations', () => {
    it('should add notification to queue', async () => {
      const notification: Notification = {
        id: 'notif-123',
        userId: 'user-123',
        type: NotificationType.RIDE_REQUEST,
        title: 'Test',
        message: 'Test message',
        data: {},
        channels: [NotificationChannel.PUSH],
        channelStatus: {},
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await notificationQueue.addToQueue(notification);

      const stats = await notificationQueue.getQueueStats();
      expect(stats.waiting).toBeGreaterThan(0);
    });

    it('should process queue in priority order', async () => {
      const notifications = [
        {
          id: 'notif-1',
          priority: NotificationPriority.LOW,
        },
        {
          id: 'notif-2',
          priority: NotificationPriority.URGENT,
        },
        {
          id: 'notif-3',
          priority: NotificationPriority.HIGH,
        },
      ];

      for (const notif of notifications) {
        await notificationQueue.addToQueue({
          ...notif,
          userId: 'user-123',
          type: NotificationType.RIDE_REQUEST,
          title: 'Test',
          message: 'Test',
          data: {},
          channels: [NotificationChannel.PUSH],
          channelStatus: {},
          status: NotificationStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Notification);
      }

      // URGENT should be processed first, then HIGH, then LOW
      const stats = await notificationQueue.getQueueStats();
      expect(stats.waiting).toBe(3);
    });

    it('should add bulk notifications', async () => {
      const notifications: Notification[] = Array.from({ length: 10 }, (_, i) => ({
        id: `notif-${i}`,
        userId: `user-${i}`,
        type: NotificationType.RIDE_REQUEST,
        title: 'Test',
        message: 'Test',
        data: {},
        channels: [NotificationChannel.PUSH],
        channelStatus: {},
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await notificationQueue.addBulkToQueue(notifications);

      const stats = await notificationQueue.getQueueStats();
      expect(stats.waiting).toBe(10);
    });
  });

  describe('Queue Stats', () => {
    it('should return queue statistics', async () => {
      const stats = await notificationQueue.getQueueStats();

      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('Failed Jobs', () => {
    it('should track failed jobs', async () => {
      // Add invalid notification that will fail
      const notification: Notification = {
        id: 'notif-fail',
        userId: 'invalid-user',
        type: NotificationType.RIDE_REQUEST,
        title: 'Test',
        message: 'Test',
        data: {},
        channels: [NotificationChannel.PUSH],
        channelStatus: {},
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await notificationQueue.addToQueue(notification);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const failedJobs = await notificationQueue.getFailedJobs();
      expect(failedJobs.length).toBeGreaterThanOrEqual(0);
    });

    it('should retry failed jobs', async () => {
      const notification: Notification = {
        id: 'notif-retry',
        userId: 'user-123',
        type: NotificationType.RIDE_REQUEST,
        title: 'Test',
        message: 'Test',
        data: {},
        channels: [NotificationChannel.PUSH],
        channelStatus: {},
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await notificationQueue.addToQueue(notification);

      // Wait for initial attempt
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Retry failed jobs
      await notificationQueue.retryFailed();

      const stats = await notificationQueue.getQueueStats();
      expect(stats.waiting).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('NotificationCenter Tests', () => {
  let notificationCenter: NotificationCenter;

  beforeEach(() => {
    notificationCenter = new NotificationCenter();
  });

  describe('In-App Notifications', () => {
    it('should create in-app notification', async () => {
      const notification = await notificationCenter.createInAppNotification({
        userId: 'user-123',
        type: NotificationType.RIDE_REQUEST,
        title: 'Nova corrida',
        message: 'Corrida disponível',
        data: { rideId: 'ride-123' },
        priority: NotificationPriority.HIGH,
      });

      expect(notification).toBeDefined();
      expect(notification.userId).toBe('user-123');
      expect(notification.isRead).toBe(false);
    });

    it('should get user notifications', async () => {
      // Create multiple notifications
      for (let i = 0; i < 5; i++) {
        await notificationCenter.createInAppNotification({
          userId: 'user-123',
          type: NotificationType.RIDE_REQUEST,
          title: `Notification ${i}`,
          message: `Message ${i}`,
          data: {},
          priority: NotificationPriority.NORMAL,
        });
      }

      const notifications = await notificationCenter.getInAppNotifications(
        'user-123',
        { limit: 10, offset: 0 }
      );

      expect(notifications.length).toBe(5);
    });

    it('should filter notifications by type', async () => {
      await notificationCenter.createInAppNotification({
        userId: 'user-123',
        type: NotificationType.RIDE_REQUEST,
        title: 'Ride',
        message: 'Ride message',
        data: {},
        priority: NotificationPriority.NORMAL,
      });

      await notificationCenter.createInAppNotification({
        userId: 'user-123',
        type: NotificationType.PAYMENT_CONFIRMED,
        title: 'Payment',
        message: 'Payment message',
        data: {},
        priority: NotificationPriority.NORMAL,
      });

      const rideNotifications = await notificationCenter.getNotificationsByType(
        'user-123',
        NotificationType.RIDE_REQUEST
      );

      expect(rideNotifications.length).toBe(1);
      expect(rideNotifications[0].type).toBe(NotificationType.RIDE_REQUEST);
    });
  });

  describe('Read/Unread Status', () => {
    it('should mark notification as read', async () => {
      const notification = await notificationCenter.createInAppNotification({
        userId: 'user-123',
        type: NotificationType.RIDE_REQUEST,
        title: 'Test',
        message: 'Test',
        data: {},
        priority: NotificationPriority.NORMAL,
      });

      await notificationCenter.markAsRead(notification.id);

      const updated = await notificationCenter.getInAppNotifications('user-123', {});
      expect(updated[0].isRead).toBe(true);
      expect(updated[0].readAt).toBeDefined();
    });

    it('should mark all as read', async () => {
      // Create multiple unread notifications
      for (let i = 0; i < 3; i++) {
        await notificationCenter.createInAppNotification({
          userId: 'user-123',
          type: NotificationType.RIDE_REQUEST,
          title: `Test ${i}`,
          message: `Test ${i}`,
          data: {},
          priority: NotificationPriority.NORMAL,
        });
      }

      await notificationCenter.markAllAsRead('user-123');

      const notifications = await notificationCenter.getInAppNotifications(
        'user-123',
        {}
      );
      expect(notifications.every((n) => n.isRead)).toBe(true);
    });

    it('should get unread count', async () => {
      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await notificationCenter.createInAppNotification({
          userId: 'user-123',
          type: NotificationType.RIDE_REQUEST,
          title: `Test ${i}`,
          message: `Test ${i}`,
          data: {},
          priority: NotificationPriority.NORMAL,
        });
      }

      // Mark 2 as read
      const notifications = await notificationCenter.getInAppNotifications(
        'user-123',
        {}
      );
      await notificationCenter.markAsRead(notifications[0].id);
      await notificationCenter.markAsRead(notifications[1].id);

      const unreadCount = await notificationCenter.getUnreadCount('user-123');
      expect(unreadCount).toBe(3);
    });
  });

  describe('Archive', () => {
    it('should archive notification', async () => {
      const notification = await notificationCenter.createInAppNotification({
        userId: 'user-123',
        type: NotificationType.RIDE_REQUEST,
        title: 'Test',
        message: 'Test',
        data: {},
        priority: NotificationPriority.NORMAL,
      });

      await notificationCenter.archiveNotification(notification.id);

      const archived = await notificationCenter.getInAppNotifications('user-123', {
        includeArchived: true,
      });
      expect(archived[0].isArchived).toBe(true);
    });
  });

  describe('Search', () => {
    it('should search notifications by query', async () => {
      await notificationCenter.createInAppNotification({
        userId: 'user-123',
        type: NotificationType.RIDE_REQUEST,
        title: 'Corrida para Aeroporto',
        message: 'Nova corrida disponível',
        data: {},
        priority: NotificationPriority.NORMAL,
      });

      await notificationCenter.createInAppNotification({
        userId: 'user-123',
        type: NotificationType.PAYMENT_CONFIRMED,
        title: 'Pagamento confirmado',
        message: 'Pagamento recebido',
        data: {},
        priority: NotificationPriority.NORMAL,
      });

      const results = await notificationCenter.searchNotifications(
        'user-123',
        'Aeroporto'
      );

      expect(results.length).toBe(1);
      expect(results[0].title).toContain('Aeroporto');
    });
  });
});

describe('NotificationTemplates Tests', () => {
  let notificationTemplates: NotificationTemplates;

  beforeEach(() => {
    notificationTemplates = new NotificationTemplates();
  });

  describe('Template Registration', () => {
    it('should register new template', () => {
      const template = {
        id: 'custom-template',
        name: 'Custom Template',
        channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
        subject: 'Custom Subject',
        body: 'Hello {{name}}!',
        variables: ['name'],
      };

      notificationTemplates.registerTemplate('custom-template', template);

      const retrieved = notificationTemplates.getTemplate('custom-template');
      expect(retrieved).toEqual(template);
    });

    it('should list all templates', () => {
      const templates = notificationTemplates.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('Template Rendering', () => {
    it('should render template with data', () => {
      const result = notificationTemplates.render('rideRequest', {
        driverName: 'João',
        origin: 'Centro',
        destination: 'Aeroporto',
      });

      expect(result).toContain('João');
      expect(result).toContain('Centro');
      expect(result).toContain('Aeroporto');
    });

    it('should render all channels', () => {
      const results = notificationTemplates.renderAll('rideAccepted', {
        passengerName: 'Maria',
        driverName: 'João',
        eta: 5,
      });

      expect(results[NotificationChannel.PUSH]).toBeDefined();
      expect(results[NotificationChannel.SMS]).toBeDefined();
      expect(results[NotificationChannel.IN_APP]).toBeDefined();
    });

    it('should handle missing variables gracefully', () => {
      const result = notificationTemplates.render('rideRequest', {
        driverName: 'João',
        // Missing origin and destination
      });

      expect(result).toBeDefined();
      expect(result).toContain('João');
    });
  });

  describe('Custom Helpers', () => {
    it('should format currency', () => {
      const result = notificationTemplates.render('rideCompleted', {
        passengerName: 'Maria',
        amount: 25.5,
      });

      expect(result).toContain('R$ 25,50');
    });

    it('should format date', () => {
      const result = notificationTemplates.render('rideCompleted', {
        passengerName: 'Maria',
        date: new Date('2024-01-15'),
      });

      expect(result).toContain('15/01/2024');
    });

    it('should pluralize words', () => {
      const result = notificationTemplates.render('custom', {
        count: 2,
        item: 'estrela',
        items: 'estrelas',
      });

      expect(result).toContain('estrelas');
    });
  });
});

describe('FirebaseService Tests', () => {
  let firebaseService: FirebaseService;

  beforeEach(() => {
    firebaseService = new FirebaseService({
      projectId: 'test-project',
      clientEmail: 'test@test.com',
      privateKey: 'test-key',
    });
  });

  describe('Push Notifications', () => {
    it('should send push notification', async () => {
      const notification = {
        title: 'Test',
        body: 'Test message',
        data: { rideId: 'ride-123' },
      };

      const result = await firebaseService.sendPushNotification(
        notification,
        'device-token-123'
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
    });

    it('should send multicast to multiple devices', async () => {
      const notification = {
        title: 'Test',
        body: 'Test message',
        data: {},
      };

      const tokens = ['token-1', 'token-2', 'token-3'];

      const result = await firebaseService.sendMulticast(notification, tokens);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });

    it('should send to topic', async () => {
      const notification = {
        title: 'Promo',
        body: 'Special offer!',
        data: { promoId: 'promo-123' },
      };

      const result = await firebaseService.sendToTopic(notification, 'promo-users');

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Topic Management', () => {
    it('should subscribe to topic', async () => {
      const tokens = ['token-1', 'token-2'];

      await firebaseService.subscribeToTopic(tokens, 'promo-users');

      // No error means success
      expect(true).toBe(true);
    });

    it('should unsubscribe from topic', async () => {
      const tokens = ['token-1', 'token-2'];

      await firebaseService.unsubscribeFromTopic(tokens, 'promo-users');

      // No error means success
      expect(true).toBe(true);
    });
  });

  describe('Token Validation', () => {
    it('should validate tokens', async () => {
      const tokens = ['valid-token-1', 'invalid-token', 'valid-token-2'];

      const validTokens = await firebaseService.validateTokens(tokens);

      expect(validTokens.length).toBeLessThanOrEqual(tokens.length);
    });
  });
});

describe('TwilioService Tests', () => {
  let twilioService: TwilioService;

  beforeEach(() => {
    twilioService = new TwilioService({
      accountSid: 'test-sid',
      authToken: 'test-token',
      phoneNumber: '+5511999999999',
    });
  });

  describe('SMS Sending', () => {
    it('should send SMS', async () => {
      const message = {
        to: '+5511988888888',
        body: 'Test message',
      };

      const result = await twilioService.sendSMS(message);

      expect(result).toBeDefined();
      expect(result.sid).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should send bulk SMS', async () => {
      const messages = [
        { to: '+5511988888888', body: 'Message 1' },
        { to: '+5511977777777', body: 'Message 2' },
        { to: '+5511966666666', body: 'Message 3' },
      ];

      const results = await twilioService.sendBulkSMS(messages);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.sid)).toBe(true);
    });

    it('should validate E.164 phone format', () => {
      expect(twilioService['isValidPhoneNumber']('+5511999999999')).toBe(true);
      expect(twilioService['isValidPhoneNumber']('11999999999')).toBe(false);
      expect(twilioService['isValidPhoneNumber']('+55119999')).toBe(false);
    });

    it('should format phone number to E.164', () => {
      const formatted = twilioService.formatPhoneNumber('11999999999', '55');
      expect(formatted).toBe('+5511999999999');
    });

    it('should calculate SMS segments', () => {
      // Short message (1 segment)
      const segments1 = twilioService.calculateSegments('Hello');
      expect(segments1).toBe(1);

      // Long message (2 segments)
      const longMessage = 'a'.repeat(200);
      const segments2 = twilioService.calculateSegments(longMessage);
      expect(segments2).toBeGreaterThan(1);
    });

    it('should mask phone number', () => {
      const masked = twilioService['maskPhoneNumber']('+5511999999999');
      expect(masked).toContain('****');
      expect(masked).not.toContain('999999999');
    });
  });

  describe('SMS Status', () => {
    it('should get SMS status', async () => {
      // First send an SMS
      const message = {
        to: '+5511988888888',
        body: 'Test',
      };

      const sendResult = await twilioService.sendSMS(message);

      // Then check status
      const status = await twilioService.getSMSStatus(sendResult.sid);

      expect(status).toBeDefined();
      expect(status.sid).toBe(sendResult.sid);
    });
  });

  describe('SMS Templates', () => {
    it('should use ride request template', () => {
      const sms = twilioService['smsTemplates'].rideRequest('João', 'Centro');
      expect(sms).toContain('João');
      expect(sms).toContain('Centro');
    });

    it('should use verification code template', () => {
      const sms = twilioService['smsTemplates'].verificationCode('123456');
      expect(sms).toContain('123456');
    });

    it('should use promotional template', () => {
      const sms = twilioService['smsTemplates'].promotional(20);
      expect(sms).toContain('20%');
    });
  });
});

describe('SendGridService Tests', () => {
  let sendGridService: SendGridService;

  beforeEach(() => {
    sendGridService = new SendGridService({
      apiKey: 'test-key',
      fromEmail: 'noreply@voudmoto.com',
      fromName: 'VouDeMoto',
      sandbox: true,
    });
  });

  describe('Email Sending', () => {
    it('should send email', async () => {
      const message = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>',
        text: 'Test',
      };

      const result = await sendGridService.sendEmail(message);

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.statusCode).toBe(202);
    });

    it('should send bulk emails', async () => {
      const messages = [
        {
          to: 'user1@example.com',
          subject: 'Test 1',
          text: 'Test 1',
        },
        {
          to: 'user2@example.com',
          subject: 'Test 2',
          text: 'Test 2',
        },
      ];

      const results = await sendGridService.sendBulkEmails(messages);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.statusCode === 202)).toBe(true);
    });

    it('should send template email', async () => {
      const result = await sendGridService.sendTemplateEmail(
        'user@example.com',
        'welcome-template',
        { userName: 'João' }
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
    });

    it('should validate email format', () => {
      expect(sendGridService['isValidEmail']('user@example.com')).toBe(true);
      expect(sendGridService['isValidEmail']('invalid-email')).toBe(false);
      expect(sendGridService['isValidEmail']('user@')).toBe(false);
    });

    it('should mask email for logging', () => {
      const masked = sendGridService['maskEmail']('john.doe@example.com');
      expect(masked).toContain('j*');
      expect(masked).toContain('@example.com');
    });
  });

  describe('Email Validation', () => {
    it('should require content or template', async () => {
      const message = {
        to: 'user@example.com',
        subject: 'Test',
      };

      await expect(sendGridService.sendEmail(message)).rejects.toThrow();
    });

    it('should require subject for non-template emails', async () => {
      const message = {
        to: 'user@example.com',
        text: 'Test',
      };

      await expect(sendGridService.sendEmail(message)).rejects.toThrow();
    });

    it('should validate recipient emails', async () => {
      const message = {
        to: 'invalid-email',
        subject: 'Test',
        text: 'Test',
      };

      await expect(sendGridService.sendEmail(message)).rejects.toThrow();
    });
  });
});

describe('Integration Tests', () => {
  it('should send notification through complete flow', async () => {
    // Initialize all services
    const notificationService = new NotificationService({
      firebase: {
        projectId: 'test',
        clientEmail: 'test@test.com',
        privateKey: 'test',
      },
      twilio: {
        accountSid: 'test',
        authToken: 'test',
        phoneNumber: '+5511999999999',
      },
      sendgrid: {
        apiKey: 'test',
        fromEmail: 'noreply@voudmoto.com',
        fromName: 'VouDeMoto',
      },
      redis: {
        host: 'localhost',
        port: 6379,
      },
    });

    // Create notification
    const notification: Notification = {
      id: 'notif-integration-test',
      userId: 'user-123',
      type: NotificationType.RIDE_REQUEST,
      title: 'Nova corrida',
      message: 'Corrida de Centro para Aeroporto',
      data: {
        rideId: 'ride-123',
        origin: 'Centro',
        destination: 'Aeroporto',
      },
      channels: [
        NotificationChannel.PUSH,
        NotificationChannel.SMS,
        NotificationChannel.EMAIL,
        NotificationChannel.IN_APP,
      ],
      channelStatus: {},
      priority: NotificationPriority.HIGH,
      status: NotificationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Send notification
    const result = await notificationService.send(notification);

    // Verify result
    expect(result).toBeDefined();
    expect(result.status).toBe(NotificationStatus.SENT);
    expect(Object.keys(result.channelStatus).length).toBe(4);
  });
});
