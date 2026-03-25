/**
 * Payment Models
 * Data models for payment system, wallet, and transactions
 */

/**
 * Payment Method Types
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PIX = 'PIX',
  WALLET = 'WALLET',
  CASH = 'CASH',
  PAYPAL = 'PAYPAL',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
}

/**
 * Payment Status
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

/**
 * Payment Provider
 */
export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  MERCADO_PAGO = 'MERCADO_PAGO',
  INTERNAL = 'INTERNAL', // For wallet payments
}

/**
 * Transaction Type
 */
export enum TransactionType {
  RIDE_PAYMENT = 'RIDE_PAYMENT',
  WALLET_TOPUP = 'WALLET_TOPUP',
  WALLET_WITHDRAWAL = 'WALLET_WITHDRAWAL',
  REFUND = 'REFUND',
  TRANSFER = 'TRANSFER',
  FEE = 'FEE',
  COMMISSION = 'COMMISSION',
  TIP = 'TIP',
  BONUS = 'BONUS',
  PENALTY = 'PENALTY',
}

/**
 * Refund Status
 */
export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Refund Reason
 */
export enum RefundReason {
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  RIDE_CANCELLED = 'RIDE_CANCELLED',
  SERVICE_ISSUE = 'SERVICE_ISSUE',
  DRIVER_NO_SHOW = 'DRIVER_NO_SHOW',
  OVERCHARGE = 'OVERCHARGE',
  FRAUD = 'FRAUD',
  DUPLICATE_CHARGE = 'DUPLICATE_CHARGE',
  OTHER = 'OTHER',
}

/**
 * Card Brand
 */
export enum CardBrand {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  ELO = 'ELO',
  HIPERCARD = 'HIPERCARD',
  DISCOVER = 'DISCOVER',
  DINERS = 'DINERS',
  JCB = 'JCB',
}

/**
 * Wallet Transaction Status
 */
export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

/**
 * Payment Method Interface
 */
export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
  providerMethodId?: string; // External provider's method ID (Stripe, PayPal)
  isDefault: boolean;
  isActive: boolean;

  // Card details (if applicable)
  cardLast4?: string;
  cardBrand?: CardBrand;
  cardExpMonth?: number;
  cardExpYear?: number;
  cardholderName?: string;

  // PIX details (if applicable)
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';

  // PayPal details (if applicable)
  paypalEmail?: string;

  // Metadata
  billingAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Payment Interface
 */
export interface Payment {
  id: string;
  rideId?: string;
  userId: string;
  driverId?: string;
  
  amount: number; // Total amount in cents
  currency: string; // BRL, USD, etc.
  
  // Breakdown
  baseAmount: number; // Base ride fare
  tipAmount?: number; // Tip for driver
  feeAmount: number; // Platform fee
  taxAmount?: number; // Taxes
  discountAmount?: number; // Discounts applied
  
  paymentMethodId: string;
  paymentMethod: PaymentMethodType;
  provider: PaymentProvider;
  
  status: PaymentStatus;
  
  // Provider details
  providerPaymentId?: string; // Stripe payment_intent_id, PayPal transaction_id
  providerCustomerId?: string;
  providerResponse?: Record<string, any>;
  
  // Metadata
  metadata?: Record<string, any>;
  description?: string;
  statementDescriptor?: string;
  
  // Timestamps
  authorizedAt?: Date;
  capturedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  
  // Error handling
  errorCode?: string;
  errorMessage?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Wallet Interface
 */
export interface Wallet {
  id: string;
  userId: string;
  
  balance: number; // Available balance in cents
  pendingBalance: number; // Pending/locked balance
  totalBalance: number; // balance + pendingBalance
  
  currency: string;
  
  // Limits
  dailyLimit: number;
  monthlyLimit: number;
  dailySpent: number;
  monthlySpent: number;
  
  // Status
  isActive: boolean;
  isVerified: boolean;
  
  // Metadata
  lastTransactionAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Wallet Transaction Interface
 */
export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  
  type: TransactionType;
  amount: number; // Positive for credit, negative for debit
  balanceBefore: number;
  balanceAfter: number;
  
  status: WalletTransactionStatus;
  
  // Related entities
  paymentId?: string;
  rideId?: string;
  refundId?: string;
  transferToUserId?: string;
  transferFromUserId?: string;
  
  // Metadata
  description?: string;
  metadata?: Record<string, any>;
  
  // Timestamps
  completedAt?: Date;
  failedAt?: Date;
  reversedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transaction Interface
 */
export interface Transaction {
  id: string;
  paymentId?: string;
  rideId?: string;
  userId: string;
  driverId?: string;
  
  type: TransactionType;
  amount: number;
  currency: string;
  
  status: PaymentStatus;
  provider: PaymentProvider;
  
  // Related entities
  walletTransactionId?: string;
  refundId?: string;
  
  // Reconciliation
  isReconciled: boolean;
  reconciledAt?: Date;
  reconciledBy?: string;
  
  // Metadata
  description?: string;
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Refund Interface
 */
export interface Refund {
  id: string;
  paymentId: string;
  rideId?: string;
  userId: string;
  
  amount: number; // Refund amount in cents
  currency: string;
  reason: RefundReason;
  reasonDetails?: string;
  
  status: RefundStatus;
  provider: PaymentProvider;
  
  // Provider details
  providerRefundId?: string;
  providerResponse?: Record<string, any>;
  
  // Authorization
  requestedBy: string; // User ID who requested
  approvedBy?: string; // Admin/system who approved
  
  // Timestamps
  requestedAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  
  // Error handling
  errorCode?: string;
  errorMessage?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment Intent (for processing)
 */
export interface PaymentIntent {
  amount: number;
  currency: string;
  paymentMethodId: string;
  userId: string;
  rideId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Refund Request
 */
export interface RefundRequest {
  paymentId: string;
  amount?: number; // If not provided, full refund
  reason: RefundReason;
  reasonDetails?: string;
  requestedBy: string;
}

/**
 * Wallet Topup Request
 */
export interface WalletTopupRequest {
  userId: string;
  amount: number;
  paymentMethodId: string;
  provider?: PaymentProvider;
}

/**
 * Wallet Withdrawal Request
 */
export interface WalletWithdrawalRequest {
  userId: string;
  amount: number;
  destination: 'BANK_ACCOUNT' | 'PAYPAL' | 'PIX';
  destinationDetails: Record<string, any>;
}

/**
 * Payment Statistics
 */
export interface PaymentStatistics {
  period: {
    start: Date;
    end: Date;
  };
  
  totalAmount: number;
  totalTransactions: number;
  averageAmount: number;
  
  byStatus: {
    [key in PaymentStatus]?: {
      count: number;
      amount: number;
    };
  };
  
  byMethod: {
    [key in PaymentMethodType]?: {
      count: number;
      amount: number;
    };
  };
  
  byProvider: {
    [key in PaymentProvider]?: {
      count: number;
      amount: number;
    };
  };
  
  successRate: number;
  failureRate: number;
  refundRate: number;
  
  topups: number;
  withdrawals: number;
  refunds: number;
}

/**
 * Payment Filter
 */
export interface PaymentFilter {
  userId?: string;
  driverId?: string;
  rideId?: string;
  status?: PaymentStatus | PaymentStatus[];
  method?: PaymentMethodType | PaymentMethodType[];
  provider?: PaymentProvider | PaymentProvider[];
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Wallet Filter
 */
export interface WalletFilter {
  userId?: string;
  isActive?: boolean;
  isVerified?: boolean;
  minBalance?: number;
  maxBalance?: number;
  limit?: number;
  offset?: number;
}

/**
 * Transaction Filter
 */
export interface TransactionFilter {
  userId?: string;
  driverId?: string;
  rideId?: string;
  type?: TransactionType | TransactionType[];
  status?: PaymentStatus | PaymentStatus[];
  isReconciled?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Stripe Configuration
 */
export interface StripeConfig {
  apiKey: string;
  webhookSecret: string;
  publishableKey: string;
  currency: string;
}

/**
 * PayPal Configuration
 */
export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'production';
  currency: string;
}

/**
 * Payment Configuration
 */
export interface PaymentConfig {
  stripe?: StripeConfig;
  paypal?: PayPalConfig;
  defaultProvider: PaymentProvider;
  defaultCurrency: string;
  feePercentage: number; // Platform fee (e.g., 15%)
  minPaymentAmount: number;
  maxPaymentAmount: number;
}
