/**
 * Payment Service
 * Handles payment processing with Stripe and PayPal integration
 */

import {
  Payment,
  PaymentIntent,
  PaymentMethod,
  PaymentMethodType,
  PaymentProvider,
  PaymentStatus,
  PaymentConfig,
  PaymentFilter,
  PaymentStatistics,
  CardBrand,
} from '../models/Payment';
import { Logger } from '../utils/Logger';

/**
 * Payment Service
 * Manages payment processing, payment methods, and provider integrations
 */
export class PaymentService {
  private logger = new Logger('PaymentService');
  private config: PaymentConfig;
  private stripeClient: any;
  private paypalClient: any;

  constructor(config: PaymentConfig) {
    this.config = config;
    this.initializeProviders();
  }

  /**
   * Initialize payment providers
   */
  private initializeProviders(): void {
    try {
      // Initialize Stripe
      if (this.config.stripe) {
        // In production: const stripe = require('stripe')(this.config.stripe.apiKey);
        // this.stripeClient = stripe;
        this.stripeClient = this.createMockStripeClient();
        this.logger.info('Stripe client initialized');
      }

      // Initialize PayPal
      if (this.config.paypal) {
        // In production: const paypal = require('@paypal/checkout-server-sdk');
        // this.paypalClient = paypal client
        this.paypalClient = this.createMockPayPalClient();
        this.logger.info('PayPal client initialized');
      }

      this.logger.info('Payment providers initialized', {
        defaultProvider: this.config.defaultProvider,
        currency: this.config.defaultCurrency,
      });
    } catch (error) {
      this.logger.error('Failed to initialize payment providers', { error });
      throw error;
    }
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(intent: PaymentIntent): Promise<Payment> {
    try {
      this.logger.info('Creating payment intent', {
        amount: intent.amount,
        userId: intent.userId,
        rideId: intent.rideId,
      });

      // Validate amount
      this.validateAmount(intent.amount);

      // Get payment method
      const paymentMethod = await this.getPaymentMethod(intent.paymentMethodId);

      // Calculate fees and taxes
      const feeAmount = Math.round(intent.amount * this.config.feePercentage);
      const taxAmount = 0; // Calculate tax if needed

      // Create payment record
      const payment: Payment = {
        id: this.generateId('pay'),
        rideId: intent.rideId,
        userId: intent.userId,
        amount: intent.amount,
        currency: intent.currency || this.config.defaultCurrency,
        baseAmount: intent.amount - feeAmount - taxAmount,
        feeAmount,
        taxAmount,
        paymentMethodId: intent.paymentMethodId,
        paymentMethod: paymentMethod.type,
        provider: paymentMethod.provider,
        status: PaymentStatus.PENDING,
        description: intent.description,
        metadata: intent.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Process payment based on provider
      await this.processPayment(payment, paymentMethod);

      this.logger.info('Payment intent created', {
        paymentId: payment.id,
        status: payment.status,
      });

      return payment;
    } catch (error) {
      this.logger.error('Failed to create payment intent', { error });
      throw error;
    }
  }

  /**
   * Process payment with provider
   */
  private async processPayment(
    payment: Payment,
    paymentMethod: PaymentMethod
  ): Promise<void> {
    try {
      payment.status = PaymentStatus.PROCESSING;
      payment.updatedAt = new Date();

      switch (paymentMethod.provider) {
        case PaymentProvider.STRIPE:
          await this.processStripePayment(payment, paymentMethod);
          break;
        case PaymentProvider.PAYPAL:
          await this.processPayPalPayment(payment, paymentMethod);
          break;
        case PaymentProvider.INTERNAL:
          // Wallet payment handled by WalletService
          payment.status = PaymentStatus.COMPLETED;
          payment.completedAt = new Date();
          break;
        default:
          throw new Error(`Unsupported payment provider: ${paymentMethod.provider}`);
      }

      payment.updatedAt = new Date();
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.failedAt = new Date();
      payment.errorMessage = error.message;
      throw error;
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(
    payment: Payment,
    paymentMethod: PaymentMethod
  ): Promise<void> {
    try {
      this.logger.info('Processing Stripe payment', { paymentId: payment.id });

      // Create Stripe payment intent
      const paymentIntent = await this.stripeClient.paymentIntents.create({
        amount: payment.amount,
        currency: payment.currency.toLowerCase(),
        payment_method: paymentMethod.providerMethodId,
        customer: payment.userId,
        confirm: true,
        metadata: {
          paymentId: payment.id,
          rideId: payment.rideId || '',
          userId: payment.userId,
        },
      });

      payment.providerPaymentId = paymentIntent.id;
      payment.providerResponse = paymentIntent;

      // Update status based on Stripe response
      switch (paymentIntent.status) {
        case 'succeeded':
          payment.status = PaymentStatus.COMPLETED;
          payment.completedAt = new Date();
          break;
        case 'requires_capture':
          payment.status = PaymentStatus.AUTHORIZED;
          payment.authorizedAt = new Date();
          break;
        case 'processing':
          payment.status = PaymentStatus.PROCESSING;
          break;
        default:
          payment.status = PaymentStatus.FAILED;
          payment.failedAt = new Date();
      }

      this.logger.info('Stripe payment processed', {
        paymentId: payment.id,
        stripeStatus: paymentIntent.status,
        status: payment.status,
      });
    } catch (error) {
      this.logger.error('Stripe payment failed', { paymentId: payment.id, error });
      throw error;
    }
  }

  /**
   * Process PayPal payment
   */
  private async processPayPalPayment(
    payment: Payment,
    paymentMethod: PaymentMethod
  ): Promise<void> {
    try {
      this.logger.info('Processing PayPal payment', { paymentId: payment.id });

      // Create PayPal order
      const order = await this.paypalClient.orders.create({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: payment.currency,
              value: (payment.amount / 100).toFixed(2),
            },
            description: payment.description || 'Ride payment',
          },
        ],
        metadata: {
          paymentId: payment.id,
          rideId: payment.rideId || '',
          userId: payment.userId,
        },
      });

      payment.providerPaymentId = order.id;
      payment.providerResponse = order;

      // Capture the order
      const capture = await this.paypalClient.orders.capture(order.id);

      if (capture.status === 'COMPLETED') {
        payment.status = PaymentStatus.COMPLETED;
        payment.completedAt = new Date();
      } else {
        payment.status = PaymentStatus.PROCESSING;
      }

      this.logger.info('PayPal payment processed', {
        paymentId: payment.id,
        paypalStatus: capture.status,
        status: payment.status,
      });
    } catch (error) {
      this.logger.error('PayPal payment failed', { paymentId: payment.id, error });
      throw error;
    }
  }

  /**
   * Capture authorized payment
   */
  async capturePayment(paymentId: string): Promise<Payment> {
    try {
      this.logger.info('Capturing payment', { paymentId });

      const payment = await this.getPayment(paymentId);

      if (payment.status !== PaymentStatus.AUTHORIZED) {
        throw new Error(
          `Cannot capture payment with status ${payment.status}. Must be AUTHORIZED.`
        );
      }

      // Capture with provider
      switch (payment.provider) {
        case PaymentProvider.STRIPE:
          await this.stripeClient.paymentIntents.capture(payment.providerPaymentId);
          break;
        case PaymentProvider.PAYPAL:
          await this.paypalClient.orders.capture(payment.providerPaymentId);
          break;
        default:
          throw new Error(`Cannot capture payment for provider: ${payment.provider}`);
      }

      payment.status = PaymentStatus.CAPTURED;
      payment.capturedAt = new Date();
      payment.updatedAt = new Date();

      this.logger.info('Payment captured', { paymentId });

      return payment;
    } catch (error) {
      this.logger.error('Failed to capture payment', { paymentId, error });
      throw error;
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string, reason?: string): Promise<Payment> {
    try {
      this.logger.info('Cancelling payment', { paymentId, reason });

      const payment = await this.getPayment(paymentId);

      if (
        ![PaymentStatus.PENDING, PaymentStatus.AUTHORIZED].includes(payment.status)
      ) {
        throw new Error(`Cannot cancel payment with status ${payment.status}`);
      }

      // Cancel with provider
      switch (payment.provider) {
        case PaymentProvider.STRIPE:
          await this.stripeClient.paymentIntents.cancel(payment.providerPaymentId);
          break;
        case PaymentProvider.PAYPAL:
          // PayPal orders expire automatically
          break;
      }

      payment.status = PaymentStatus.CANCELLED;
      payment.cancelledAt = new Date();
      payment.updatedAt = new Date();
      payment.metadata = { ...payment.metadata, cancellationReason: reason };

      this.logger.info('Payment cancelled', { paymentId });

      return payment;
    } catch (error) {
      this.logger.error('Failed to cancel payment', { paymentId, error });
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    // Mock implementation
    return {
      id: paymentId,
      userId: 'user-123',
      amount: 2500,
      currency: 'BRL',
      baseAmount: 2125,
      feeAmount: 375,
      paymentMethodId: 'pm-123',
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get payments with filters
   */
  async getPayments(filter: PaymentFilter): Promise<Payment[]> {
    this.logger.info('Getting payments', { filter });

    // Mock implementation
    return [];
  }

  /**
   * Get payment statistics
   */
  async getStatistics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<PaymentStatistics> {
    this.logger.info('Getting payment statistics', {
      startDate,
      endDate,
      userId,
    });

    // Mock implementation
    return {
      period: { start: startDate, end: endDate },
      totalAmount: 0,
      totalTransactions: 0,
      averageAmount: 0,
      byStatus: {},
      byMethod: {},
      byProvider: {},
      successRate: 0,
      failureRate: 0,
      refundRate: 0,
      topups: 0,
      withdrawals: 0,
      refunds: 0,
    };
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(
    userId: string,
    type: PaymentMethodType,
    provider: PaymentProvider,
    providerToken: string
  ): Promise<PaymentMethod> {
    try {
      this.logger.info('Adding payment method', { userId, type, provider });

      let providerMethodId: string;
      let cardDetails: any = {};

      // Create payment method with provider
      switch (provider) {
        case PaymentProvider.STRIPE:
          const stripeMethod = await this.stripeClient.paymentMethods.create({
            type: 'card',
            card: { token: providerToken },
          });
          providerMethodId = stripeMethod.id;
          cardDetails = {
            cardLast4: stripeMethod.card.last4,
            cardBrand: this.mapCardBrand(stripeMethod.card.brand),
            cardExpMonth: stripeMethod.card.exp_month,
            cardExpYear: stripeMethod.card.exp_year,
          };
          break;

        case PaymentProvider.PAYPAL:
          // PayPal payment method setup
          providerMethodId = providerToken;
          break;

        default:
          providerMethodId = this.generateId('pm');
      }

      const paymentMethod: PaymentMethod = {
        id: this.generateId('pm'),
        userId,
        type,
        provider,
        providerMethodId,
        isDefault: false,
        isActive: true,
        ...cardDetails,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.info('Payment method added', {
        id: paymentMethod.id,
        type,
        provider,
      });

      return paymentMethod;
    } catch (error) {
      this.logger.error('Failed to add payment method', { userId, type, error });
      throw error;
    }
  }

  /**
   * Get payment method
   */
  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    // Mock implementation
    return {
      id: paymentMethodId,
      userId: 'user-123',
      type: PaymentMethodType.CREDIT_CARD,
      provider: PaymentProvider.STRIPE,
      providerMethodId: 'pm_stripe_123',
      isDefault: true,
      isActive: true,
      cardLast4: '4242',
      cardBrand: CardBrand.VISA,
      cardExpMonth: 12,
      cardExpYear: 2025,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get user payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    this.logger.info('Getting user payment methods', { userId });

    // Mock implementation
    return [];
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<void> {
    this.logger.info('Setting default payment method', {
      userId,
      paymentMethodId,
    });

    // In real implementation:
    // 1. Unset current default
    // 2. Set new default
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      this.logger.info('Deleting payment method', { paymentMethodId });

      const paymentMethod = await this.getPaymentMethod(paymentMethodId);

      // Delete from provider
      if (paymentMethod.provider === PaymentProvider.STRIPE) {
        await this.stripeClient.paymentMethods.detach(
          paymentMethod.providerMethodId
        );
      }

      // Soft delete in database
      // paymentMethod.deletedAt = new Date();

      this.logger.info('Payment method deleted', { paymentMethodId });
    } catch (error) {
      this.logger.error('Failed to delete payment method', {
        paymentMethodId,
        error,
      });
      throw error;
    }
  }

  /**
   * Validate amount
   */
  private validateAmount(amount: number): void {
    if (amount < this.config.minPaymentAmount) {
      throw new Error(
        `Amount ${amount} is below minimum ${this.config.minPaymentAmount}`
      );
    }

    if (amount > this.config.maxPaymentAmount) {
      throw new Error(
        `Amount ${amount} exceeds maximum ${this.config.maxPaymentAmount}`
      );
    }
  }

  /**
   * Map card brand from Stripe to internal enum
   */
  private mapCardBrand(stripeBrand: string): CardBrand {
    const brandMap: Record<string, CardBrand> = {
      visa: CardBrand.VISA,
      mastercard: CardBrand.MASTERCARD,
      amex: CardBrand.AMEX,
      discover: CardBrand.DISCOVER,
      diners: CardBrand.DINERS,
      jcb: CardBrand.JCB,
    };

    return brandMap[stripeBrand.toLowerCase()] || CardBrand.VISA;
  }

  /**
   * Generate ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create mock Stripe client
   */
  private createMockStripeClient(): any {
    return {
      paymentIntents: {
        create: async (params: any) => ({
          id: `pi_${Math.random().toString(36).substr(2, 9)}`,
          status: Math.random() > 0.1 ? 'succeeded' : 'requires_capture',
          amount: params.amount,
          currency: params.currency,
          metadata: params.metadata,
        }),
        capture: async (id: string) => ({
          id,
          status: 'succeeded',
        }),
        cancel: async (id: string) => ({
          id,
          status: 'canceled',
        }),
      },
      paymentMethods: {
        create: async (params: any) => ({
          id: `pm_${Math.random().toString(36).substr(2, 9)}`,
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025,
          },
        }),
        detach: async (id: string) => ({ id }),
      },
    };
  }

  /**
   * Create mock PayPal client
   */
  private createMockPayPalClient(): any {
    return {
      orders: {
        create: async (params: any) => ({
          id: `PAYPAL-${Math.random().toString(36).substr(2, 9)}`,
          status: 'CREATED',
        }),
        capture: async (id: string) => ({
          id,
          status: 'COMPLETED',
        }),
      },
    };
  }

  /**
   * Get service statistics
   */
  getStats(): {
    configured: boolean;
    providers: string[];
    defaultProvider: PaymentProvider;
    currency: string;
  } {
    return {
      configured: !!(this.stripeClient || this.paypalClient),
      providers: [
        this.stripeClient ? 'Stripe' : null,
        this.paypalClient ? 'PayPal' : null,
      ].filter(Boolean) as string[],
      defaultProvider: this.config.defaultProvider,
      currency: this.config.defaultCurrency,
    };
  }
}
