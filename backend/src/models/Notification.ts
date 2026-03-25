/**
 * Notification Models
 * Data models for multi-channel notification system
 */

/**
 * Notification Types
 */
export enum NotificationType {
  // Ride-related
  RIDE_REQUESTED = 'RIDE_REQUESTED',
  RIDE_ACCEPTED = 'RIDE_ACCEPTED',
  RIDE_CANCELLED = 'RIDE_CANCELLED',
  RIDE_STARTED = 'RIDE_STARTED',
  RIDE_COMPLETED = 'RIDE_COMPLETED',
  DRIVER_ARRIVING = 'DRIVER_ARRIVING',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  
  // Payment-related
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  
  // Rating-related
  RATING_RECEIVED = 'RATING_RECEIVED',
  BADGE_EARNED = 'BADGE_EARNED',
  LEVEL_UP = 'LEVEL_UP',
  
  // Account-related
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Promotional
  PROMOTION_AVAILABLE = 'PROMOTION_AVAILABLE',
  REFERRAL_BONUS = 'REFERRAL_BONUS',
  
  // System
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  MAINTENANCE_SCHEDULED = 'MAINTENANCE_SCHEDULED',
}

/**
 * Notification Channels
 */
export enum NotificationChannel {
  PUSH = 'PUSH',       // Firebase/FCM
  EMAIL = 'EMAIL',     // SendGrid
  SMS = 'SMS',         // Twilio
  IN_APP = 'IN_APP',   // Internal notification center
}

/**
 * Notification Priority
 */
export enum NotificationPriority {
  LOW = 'LOW',         // Can be batched
  NORMAL = 'NORMAL',   // Send normally
  HIGH = 'HIGH',       // Send immediately
  URGENT = 'URGENT',   // Send immediately with sound/vibration
}

/**
 * Notification Status
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ',
}

/**
 * Notification Data
 */
export interface NotificationData {
  // Ride info
  rideId?: string;
  driverId?: string;
  passengerId?: string;
  
  // Payment info
  amount?: number;
  currency?: string;
  transactionId?: string;
  
  // Rating info
  rating?: number;
  badgeName?: string;
  level?: number;
  
  // Deep link
  deepLink?: string;
  
  // Custom data
  [key: string]: any;
}

/**
 * Push Notification Payload
 */
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  data?: NotificationData;
}

/**
 * Email Notification Payload
 */
export interface EmailNotificationPayload {
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

/**
 * SMS Notification Payload
 */
export interface SMSNotificationPayload {
  message: string;
  from?: string;
}

/**
 * Notification Preferences
 */
export interface NotificationPreferences {
  userId: string;
  channels: {
    [NotificationChannel.PUSH]: boolean;
    [NotificationChannel.EMAIL]: boolean;
    [NotificationChannel.SMS]: boolean;
    [NotificationChannel.IN_APP]: boolean;
  };
  types: {
    [key in NotificationType]?: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  language: string;
  updatedAt: Date;
}

/**
 * Notification Model
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  
  // Content
  title: string;
  message: string;
  imageUrl?: string;
  
  // Channels and payloads
  channels: NotificationChannel[];
  pushPayload?: PushNotificationPayload;
  emailPayload?: EmailNotificationPayload;
  smsPayload?: SMSNotificationPayload;
  
  // Metadata
  data?: NotificationData;
  
  // Status tracking
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  
  // Channel-specific status
  channelStatus: {
    [key in NotificationChannel]?: {
      status: NotificationStatus;
      sentAt?: Date;
      deliveredAt?: Date;
      error?: string;
    };
  };
  
  // Timestamps
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Template
 */
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  language: string;
  
  // Template content (Handlebars)
  subject?: string;      // For email
  title?: string;        // For push/in-app
  body: string;          // Main content
  html?: string;         // For email
  
  // Variables available in template
  variables: string[];
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Batch
 */
export interface NotificationBatch {
  id: string;
  type: NotificationType;
  userIds: string[];
  
  // Common content
  title: string;
  message: string;
  data?: NotificationData;
  
  // Settings
  channels: NotificationChannel[];
  priority: NotificationPriority;
  scheduledFor?: Date;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalUsers: number;
  successCount: number;
  failureCount: number;
  
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Notification Stats
 */
export interface NotificationStats {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  
  // Totals
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  
  // By channel
  byChannel: {
    [key in NotificationChannel]?: {
      sent: number;
      delivered: number;
      failed: number;
    };
  };
  
  // By type
  byType: {
    [key in NotificationType]?: number;
  };
  
  // Engagement
  readRate: number;
  averageTimeToRead?: number; // in minutes
}

/**
 * Device Token (for push notifications)
 */
export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  appVersion?: string;
  
  // Status
  isActive: boolean;
  lastUsedAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Center Entry
 */
export interface NotificationCenterEntry {
  id: string;
  userId: string;
  notificationId: string;
  
  // Display info
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
  
  // Action
  actionUrl?: string;
  actionLabel?: string;
  
  // Status
  isRead: boolean;
  isArchived: boolean;
  
  // Timestamps
  readAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
}
