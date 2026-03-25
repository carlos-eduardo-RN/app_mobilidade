/**
 * Refund Service
 * Handles automated refunds, partial refunds, and refund policies
 */

import {
  Refund,
  RefundRequest,
  RefundStatus,
  RefundReason,
  Payment,
  PaymentStatus,
  PaymentProvider,
} from '../models/Payment';
import { Logger } from '../utils/Logger';
import { PaymentService } from './PaymentService';
import { WalletService } from './WalletService';
import { TransactionType } from '../models/Payment';

/**
 * Refund Policy Configuration
 */
export interface RefundPolicy {
  autoApproveUnder: number; // Auto-approve refunds under this amount (in cents)
  maxRefundDays: number; // Maximum days after payment to request refund
  partialRefundAllowed: boolean;
  minPartialRefundAmount: number; // Minimum amount for partial refunds
  requiresApproval: RefundReason[]; // Reasons that require admin approval
}

/**
 * Refund Service
 * Manages refund requests, processing, and policies
 */
export class RefundService {
  private logger = new Logger('RefundService');
  private paymentService: PaymentService;
  private walletService: WalletService;
  private policy: RefundPolicy;

  constructor(
    paymentService: PaymentService,
    walletService: WalletService,
    policy?: RefundPolicy
  ) {
    this.paymentService = paymentService;
    this.walletService = walletService;
    this.policy = policy || this.getDefaultPolicy();
  }

  /**
   * Get default refund policy
   */
  private getDefaultPolicy(): RefundPolicy {
    return {
      autoApproveUnder: 5000, // R$ 50
      maxRefundDays: 30,
      partialRefundAllowed: true,
      minPartialRefundAmount: 500, // R$ 5
      requiresApproval: [RefundReason.FRAUD, RefundReason.OTHER],
    };
  }

  /**
   * Request refund
   */
  async requestRefund(request: RefundRequest): Promise<Refund> {
    try {
      this.logger.info('Processing refund request', {
        paymentId: request.paymentId,
        amount: request.amount,
        reason: request.reason,
      });

      // Get payment
      const payment = await this.paymentService.getPayment(request.paymentId);

      // Validate refund request
      await this.validateRefundRequest(payment, request);

      // Determine refund amount
      const refundAmount = request.amount || payment.amount;

      // Create refund record
      const refund: Refund = {
        id: this.generateId('ref'),
        paymentId: request.paymentId,
        rideId: payment.rideId,
        userId: payment.userId,
        amount: refundAmount,
        currency: payment.currency,
        reason: request.reason,
        reasonDetails: request.reasonDetails,
        status: RefundStatus.PENDING,
        provider: payment.provider,
        requestedBy: request.requestedBy,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Check if auto-approval is possible
      if (this.canAutoApprove(refund)) {
        await this.approveRefund(refund.id, 'system');
      }

      this.logger.info('Refund request created', {
        refundId: refund.id,
        status: refund.status,
      });

      return refund;
    } catch (error) {
      this.logger.error('Failed to request refund', {
        paymentId: request.paymentId,
        error,
      });
      throw error;
    }
  }

  /**
   * Approve refund
   */
  async approveRefund(refundId: string, approvedBy: string): Promise<Refund> {
    try {
      this.logger.info('Approving refund', { refundId, approvedBy });

      const refund = await this.getRefund(refundId);

      if (refund.status !== RefundStatus.PENDING) {
        throw new Error(`Cannot approve refund with status ${refund.status}`);
      }

      refund.status = RefundStatus.PROCESSING;
      refund.approvedBy = approvedBy;
      refund.approvedAt = new Date();
      refund.updatedAt = new Date();

      // Process refund
      await this.processRefund(refund);

      this.logger.info('Refund approved and processed', { refundId });

      return refund;
    } catch (error) {
      this.logger.error('Failed to approve refund', { refundId, error });
      refund.status = RefundStatus.FAILED;
      refund.failedAt = new Date();
      refund.errorMessage = error.message;
      throw error;
    }
  }

  /**
   * Reject refund
   */
  async rejectRefund(refundId: string, reason: string): Promise<Refund> {
    try {
      this.logger.info('Rejecting refund', { refundId, reason });

      const refund = await this.getRefund(refundId);

      if (refund.status !== RefundStatus.PENDING) {
        throw new Error(`Cannot reject refund with status ${refund.status}`);
      }

      refund.status = RefundStatus.CANCELLED;
      refund.updatedAt = new Date();
      refund.metadata = { ...refund.metadata, rejectionReason: reason };

      this.logger.info('Refund rejected', { refundId });

      return refund;
    } catch (error) {
      this.logger.error('Failed to reject refund', { refundId, error });
      throw error;
    }
  }

  /**
   * Process refund
   */
  private async processRefund(refund: Refund): Promise<void> {
    try {
      const payment = await this.paymentService.getPayment(refund.paymentId);

      // Process refund based on provider
      switch (refund.provider) {
        case PaymentProvider.STRIPE:
          await this.processStripeRefund(refund, payment);
          break;
        case PaymentProvider.PAYPAL:
          await this.processPayPalRefund(refund, payment);
          break;
        case PaymentProvider.INTERNAL:
          await this.processWalletRefund(refund, payment);
          break;
        default:
          throw new Error(`Unsupported provider for refund: ${refund.provider}`);
      }

      refund.status = RefundStatus.COMPLETED;
      refund.completedAt = new Date();
      refund.updatedAt = new Date();

      this.logger.info('Refund processed successfully', {
        refundId: refund.id,
        provider: refund.provider,
      });
    } catch (error) {
      refund.status = RefundStatus.FAILED;
      refund.failedAt = new Date();
      refund.errorCode = error.code;
      refund.errorMessage = error.message;
      throw error;
    }
  }

  /**
   * Process Stripe refund
   */
  private async processStripeRefund(refund: Refund, payment: Payment): Promise<void> {
    this.logger.info('Processing Stripe refund', { refundId: refund.id });

    // Mock Stripe refund
    const stripeRefund = {
      id: `re_${Math.random().toString(36).substr(2, 9)}`,
      status: 'succeeded',
      amount: refund.amount,
    };

    refund.providerRefundId = stripeRefund.id;
    refund.providerResponse = stripeRefund;
  }

  /**
   * Process PayPal refund
   */
  private async processPayPalRefund(refund: Refund, payment: Payment): Promise<void> {
    this.logger.info('Processing PayPal refund', { refundId: refund.id });

    // Mock PayPal refund
    const paypalRefund = {
      id: `PAYPAL-REF-${Math.random().toString(36).substr(2, 9)}`,
      status: 'COMPLETED',
      amount: {
        value: (refund.amount / 100).toFixed(2),
        currency_code: refund.currency,
      },
    };

    refund.providerRefundId = paypalRefund.id;
    refund.providerResponse = paypalRefund;
  }

  /**
   * Process wallet refund
   */
  private async processWalletRefund(refund: Refund, payment: Payment): Promise<void> {
    this.logger.info('Processing wallet refund', { refundId: refund.id });

    // Credit wallet
    await this.walletService.credit(
      refund.userId,
      refund.amount,
      TransactionType.REFUND,
      {
        refundId: refund.id,
        paymentId: refund.paymentId,
        rideId: refund.rideId,
        reason: refund.reason,
      }
    );
  }

  /**
   * Get refund
   */
  async getRefund(refundId: string): Promise<Refund> {
    // Mock implementation
    return {
      id: refundId,
      paymentId: 'pay-123',
      userId: 'user-123',
      amount: 2500,
      currency: 'BRL',
      reason: RefundReason.CUSTOMER_REQUEST,
      status: RefundStatus.PENDING,
      provider: PaymentProvider.STRIPE,
      requestedBy: 'user-123',
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get payment refunds
   */
  async getPaymentRefunds(paymentId: string): Promise<Refund[]> {
    this.logger.info('Getting payment refunds', { paymentId });

    // Mock implementation
    return [];
  }

  /**
   * Get user refunds
   */
  async getUserRefunds(
    userId: string,
    options?: {
      status?: RefundStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<Refund[]> {
    this.logger.info('Getting user refunds', { userId, options });

    // Mock implementation
    return [];
  }

  /**
   * Get pending refunds
   */
  async getPendingRefunds(limit?: number): Promise<Refund[]> {
    this.logger.info('Getting pending refunds', { limit });

    // Mock implementation
    return [];
  }

  /**
   * Validate refund request
   */
  private async validateRefundRequest(
    payment: Payment,
    request: RefundRequest
  ): Promise<void> {
    // Check payment status
    if (![PaymentStatus.COMPLETED, PaymentStatus.CAPTURED].includes(payment.status)) {
      throw new Error(
        `Cannot refund payment with status ${payment.status}. Payment must be COMPLETED or CAPTURED.`
      );
    }

    // Check if payment is already refunded
    if (
      [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED].includes(
        payment.status
      )
    ) {
      // Check if full refund already exists
      const existingRefunds = await this.getPaymentRefunds(payment.id);
      const totalRefunded = existingRefunds
        .filter((r) => r.status === RefundStatus.COMPLETED)
        .reduce((sum, r) => sum + r.amount, 0);

      if (totalRefunded >= payment.amount) {
        throw new Error('Payment is already fully refunded');
      }

      // Check if partial refund is allowed
      if (!this.policy.partialRefundAllowed) {
        throw new Error('Partial refunds are not allowed');
      }

      // Check remaining refundable amount
      const refundAmount = request.amount || payment.amount;
      if (totalRefunded + refundAmount > payment.amount) {
        throw new Error('Refund amount exceeds remaining refundable amount');
      }
    }

    // Check refund amount
    if (request.amount !== undefined) {
      if (request.amount <= 0) {
        throw new Error('Refund amount must be greater than zero');
      }

      if (request.amount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount');
      }

      if (
        request.amount < this.policy.minPartialRefundAmount &&
        request.amount < payment.amount
      ) {
        throw new Error(
          `Partial refund amount must be at least ${this.policy.minPartialRefundAmount}`
        );
      }
    }

    // Check time limit
    const daysSincePayment = Math.floor(
      (Date.now() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSincePayment > this.policy.maxRefundDays) {
      throw new Error(
        `Refund request exceeded time limit of ${this.policy.maxRefundDays} days`
      );
    }
  }

  /**
   * Check if refund can be auto-approved
   */
  private canAutoApprove(refund: Refund): boolean {
    // Check if reason requires approval
    if (this.policy.requiresApproval.includes(refund.reason)) {
      return false;
    }

    // Check amount threshold
    if (refund.amount >= this.policy.autoApproveUnder) {
      return false;
    }

    return true;
  }

  /**
   * Calculate refund statistics
   */
  async getStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRefunds: number;
    totalAmount: number;
    byReason: Record<RefundReason, { count: number; amount: number }>;
    byStatus: Record<RefundStatus, { count: number; amount: number }>;
    autoApprovedCount: number;
    manuallyApprovedCount: number;
    averageRefund: number;
    refundRate: number; // Percentage of payments refunded
  }> {
    this.logger.info('Calculating refund statistics', { startDate, endDate });

    // Mock implementation
    return {
      totalRefunds: 0,
      totalAmount: 0,
      byReason: {} as any,
      byStatus: {} as any,
      autoApprovedCount: 0,
      manuallyApprovedCount: 0,
      averageRefund: 0,
      refundRate: 0,
    };
  }

  /**
   * Generate ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalRefunds: number;
    pendingRefunds: number;
    totalRefunded: number;
    currency: string;
    policy: RefundPolicy;
  } {
    return {
      totalRefunds: 0,
      pendingRefunds: 0,
      totalRefunded: 0,
      currency: 'BRL',
      policy: this.policy,
    };
  }
}
