/**
 * Wallet Service
 * Manages digital wallet system with balance, transactions, and top-ups
 */

import {
  Wallet,
  WalletTransaction,
  WalletTopupRequest,
  WalletWithdrawalRequest,
  WalletFilter,
  TransactionType,
  WalletTransactionStatus,
  PaymentProvider,
} from '../models/Payment';
import { Logger } from '../utils/Logger';
import { PaymentService } from './PaymentService';

/**
 * Wallet Service
 * Handles wallet operations, balance management, and transactions
 */
export class WalletService {
  private logger = new Logger('WalletService');
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  /**
   * Create wallet for user
   */
  async createWallet(userId: string, currency: string = 'BRL'): Promise<Wallet> {
    try {
      this.logger.info('Creating wallet', { userId, currency });

      const wallet: Wallet = {
        id: this.generateId('wallet'),
        userId,
        balance: 0,
        pendingBalance: 0,
        totalBalance: 0,
        currency,
        dailyLimit: 100000, // R$ 1,000
        monthlyLimit: 1000000, // R$ 10,000
        dailySpent: 0,
        monthlySpent: 0,
        isActive: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.info('Wallet created', { walletId: wallet.id });

      return wallet;
    } catch (error) {
      this.logger.error('Failed to create wallet', { userId, error });
      throw error;
    }
  }

  /**
   * Get wallet by user ID
   */
  async getWallet(userId: string): Promise<Wallet> {
    // Mock implementation
    return {
      id: `wallet-${userId}`,
      userId,
      balance: 5000, // R$ 50.00
      pendingBalance: 0,
      totalBalance: 5000,
      currency: 'BRL',
      dailyLimit: 100000,
      monthlyLimit: 1000000,
      dailySpent: 0,
      monthlySpent: 0,
      isActive: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get wallet by ID
   */
  async getWalletById(walletId: string): Promise<Wallet> {
    // Mock implementation
    return this.getWallet('user-123');
  }

  /**
   * Get balance
   */
  async getBalance(userId: string): Promise<{
    balance: number;
    pendingBalance: number;
    totalBalance: number;
    currency: string;
  }> {
    const wallet = await this.getWallet(userId);

    return {
      balance: wallet.balance,
      pendingBalance: wallet.pendingBalance,
      totalBalance: wallet.totalBalance,
      currency: wallet.currency,
    };
  }

  /**
   * Top up wallet
   */
  async topUp(request: WalletTopupRequest): Promise<WalletTransaction> {
    try {
      this.logger.info('Processing wallet top-up', {
        userId: request.userId,
        amount: request.amount,
      });

      // Validate amount
      if (request.amount <= 0) {
        throw new Error('Top-up amount must be greater than zero');
      }

      // Get wallet
      const wallet = await this.getWallet(request.userId);

      if (!wallet.isActive) {
        throw new Error('Wallet is not active');
      }

      // Process payment
      const payment = await this.paymentService.createPaymentIntent({
        amount: request.amount,
        currency: wallet.currency,
        paymentMethodId: request.paymentMethodId,
        userId: request.userId,
        description: 'Wallet top-up',
        metadata: { type: 'wallet_topup' },
      });

      // Create wallet transaction
      const transaction = await this.createTransaction({
        walletId: wallet.id,
        userId: request.userId,
        type: TransactionType.WALLET_TOPUP,
        amount: request.amount,
        paymentId: payment.id,
        description: 'Wallet top-up',
      });

      // Update wallet balance
      await this.updateBalance(wallet.id, request.amount);

      this.logger.info('Wallet top-up completed', {
        userId: request.userId,
        amount: request.amount,
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      this.logger.error('Wallet top-up failed', {
        userId: request.userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Withdraw from wallet
   */
  async withdraw(request: WalletWithdrawalRequest): Promise<WalletTransaction> {
    try {
      this.logger.info('Processing wallet withdrawal', {
        userId: request.userId,
        amount: request.amount,
      });

      // Validate amount
      if (request.amount <= 0) {
        throw new Error('Withdrawal amount must be greater than zero');
      }

      // Get wallet
      const wallet = await this.getWallet(request.userId);

      if (!wallet.isActive) {
        throw new Error('Wallet is not active');
      }

      // Check balance
      if (wallet.balance < request.amount) {
        throw new Error('Insufficient balance');
      }

      // Create wallet transaction
      const transaction = await this.createTransaction({
        walletId: wallet.id,
        userId: request.userId,
        type: TransactionType.WALLET_WITHDRAWAL,
        amount: -request.amount, // Negative for debit
        description: `Withdrawal to ${request.destination}`,
        metadata: {
          destination: request.destination,
          destinationDetails: request.destinationDetails,
        },
      });

      // Update wallet balance
      await this.updateBalance(wallet.id, -request.amount);

      this.logger.info('Wallet withdrawal completed', {
        userId: request.userId,
        amount: request.amount,
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      this.logger.error('Wallet withdrawal failed', {
        userId: request.userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Transfer between wallets
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string
  ): Promise<{
    fromTransaction: WalletTransaction;
    toTransaction: WalletTransaction;
  }> {
    try {
      this.logger.info('Processing wallet transfer', {
        fromUserId,
        toUserId,
        amount,
      });

      // Validate amount
      if (amount <= 0) {
        throw new Error('Transfer amount must be greater than zero');
      }

      // Get wallets
      const fromWallet = await this.getWallet(fromUserId);
      const toWallet = await this.getWallet(toUserId);

      // Check balance
      if (fromWallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Check if wallets are active
      if (!fromWallet.isActive || !toWallet.isActive) {
        throw new Error('One or both wallets are not active');
      }

      // Create debit transaction
      const fromTransaction = await this.createTransaction({
        walletId: fromWallet.id,
        userId: fromUserId,
        type: TransactionType.TRANSFER,
        amount: -amount,
        description: description || `Transfer to user ${toUserId}`,
        metadata: { transferToUserId: toUserId },
      });

      // Create credit transaction
      const toTransaction = await this.createTransaction({
        walletId: toWallet.id,
        userId: toUserId,
        type: TransactionType.TRANSFER,
        amount: amount,
        description: description || `Transfer from user ${fromUserId}`,
        metadata: { transferFromUserId: fromUserId },
      });

      // Update balances
      await this.updateBalance(fromWallet.id, -amount);
      await this.updateBalance(toWallet.id, amount);

      this.logger.info('Wallet transfer completed', {
        fromUserId,
        toUserId,
        amount,
      });

      return { fromTransaction, toTransaction };
    } catch (error) {
      this.logger.error('Wallet transfer failed', {
        fromUserId,
        toUserId,
        error,
      });
      throw error;
    }
  }

  /**
   * Debit wallet (for ride payments, etc.)
   */
  async debit(
    userId: string,
    amount: number,
    type: TransactionType,
    metadata?: Record<string, any>
  ): Promise<WalletTransaction> {
    try {
      this.logger.info('Debiting wallet', { userId, amount, type });

      // Validate amount
      if (amount <= 0) {
        throw new Error('Debit amount must be greater than zero');
      }

      // Get wallet
      const wallet = await this.getWallet(userId);

      // Check balance
      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Check daily/monthly limits
      if (wallet.dailySpent + amount > wallet.dailyLimit) {
        throw new Error('Daily spending limit exceeded');
      }

      if (wallet.monthlySpent + amount > wallet.monthlyLimit) {
        throw new Error('Monthly spending limit exceeded');
      }

      // Create transaction
      const transaction = await this.createTransaction({
        walletId: wallet.id,
        userId,
        type,
        amount: -amount,
        metadata,
      });

      // Update balance and spending
      await this.updateBalance(wallet.id, -amount);
      await this.updateSpending(wallet.id, amount);

      this.logger.info('Wallet debited', {
        userId,
        amount,
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      this.logger.error('Wallet debit failed', { userId, amount, error });
      throw error;
    }
  }

  /**
   * Credit wallet (for refunds, bonuses, etc.)
   */
  async credit(
    userId: string,
    amount: number,
    type: TransactionType,
    metadata?: Record<string, any>
  ): Promise<WalletTransaction> {
    try {
      this.logger.info('Crediting wallet', { userId, amount, type });

      // Validate amount
      if (amount <= 0) {
        throw new Error('Credit amount must be greater than zero');
      }

      // Get wallet
      const wallet = await this.getWallet(userId);

      // Create transaction
      const transaction = await this.createTransaction({
        walletId: wallet.id,
        userId,
        type,
        amount,
        metadata,
      });

      // Update balance
      await this.updateBalance(wallet.id, amount);

      this.logger.info('Wallet credited', {
        userId,
        amount,
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      this.logger.error('Wallet credit failed', { userId, amount, error });
      throw error;
    }
  }

  /**
   * Create wallet transaction
   */
  private async createTransaction(data: {
    walletId: string;
    userId: string;
    type: TransactionType;
    amount: number;
    paymentId?: string;
    rideId?: string;
    refundId?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<WalletTransaction> {
    const wallet = await this.getWalletById(data.walletId);

    const transaction: WalletTransaction = {
      id: this.generateId('wtx'),
      walletId: data.walletId,
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance + data.amount,
      status: WalletTransactionStatus.COMPLETED,
      paymentId: data.paymentId,
      rideId: data.rideId,
      refundId: data.refundId,
      description: data.description,
      metadata: data.metadata,
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return transaction;
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(
    walletId: string,
    filters?: {
      type?: TransactionType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<WalletTransaction[]> {
    this.logger.info('Getting wallet transactions', { walletId, filters });

    // Mock implementation
    return [];
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(
    userId: string,
    filters?: {
      type?: TransactionType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<WalletTransaction[]> {
    const wallet = await this.getWallet(userId);
    return this.getTransactions(wallet.id, filters);
  }

  /**
   * Lock balance (pending transactions)
   */
  async lockBalance(walletId: string, amount: number): Promise<void> {
    this.logger.info('Locking balance', { walletId, amount });

    const wallet = await this.getWalletById(walletId);

    if (wallet.balance < amount) {
      throw new Error('Insufficient balance to lock');
    }

    wallet.balance -= amount;
    wallet.pendingBalance += amount;
    wallet.updatedAt = new Date();
  }

  /**
   * Unlock balance
   */
  async unlockBalance(walletId: string, amount: number): Promise<void> {
    this.logger.info('Unlocking balance', { walletId, amount });

    const wallet = await this.getWalletById(walletId);

    wallet.balance += amount;
    wallet.pendingBalance -= amount;
    wallet.updatedAt = new Date();
  }

  /**
   * Update wallet balance
   */
  private async updateBalance(walletId: string, amount: number): Promise<void> {
    const wallet = await this.getWalletById(walletId);

    wallet.balance += amount;
    wallet.totalBalance = wallet.balance + wallet.pendingBalance;
    wallet.lastTransactionAt = new Date();
    wallet.updatedAt = new Date();
  }

  /**
   * Update spending limits
   */
  private async updateSpending(walletId: string, amount: number): Promise<void> {
    const wallet = await this.getWalletById(walletId);

    wallet.dailySpent += amount;
    wallet.monthlySpent += amount;
    wallet.updatedAt = new Date();
  }

  /**
   * Reset daily spending
   */
  async resetDailySpending(): Promise<void> {
    this.logger.info('Resetting daily spending for all wallets');
    // In real implementation: Update all wallets to set dailySpent = 0
  }

  /**
   * Reset monthly spending
   */
  async resetMonthlySpending(): Promise<void> {
    this.logger.info('Resetting monthly spending for all wallets');
    // In real implementation: Update all wallets to set monthlySpent = 0
  }

  /**
   * Verify wallet
   */
  async verifyWallet(walletId: string): Promise<void> {
    this.logger.info('Verifying wallet', { walletId });

    const wallet = await this.getWalletById(walletId);
    wallet.isVerified = true;
    wallet.updatedAt = new Date();
  }

  /**
   * Suspend wallet
   */
  async suspendWallet(walletId: string, reason?: string): Promise<void> {
    this.logger.info('Suspending wallet', { walletId, reason });

    const wallet = await this.getWalletById(walletId);
    wallet.isActive = false;
    wallet.updatedAt = new Date();
  }

  /**
   * Reactivate wallet
   */
  async reactivateWallet(walletId: string): Promise<void> {
    this.logger.info('Reactivating wallet', { walletId });

    const wallet = await this.getWalletById(walletId);
    wallet.isActive = true;
    wallet.updatedAt = new Date();
  }

  /**
   * Get wallet statistics
   */
  async getStatistics(
    walletId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTopups: number;
    totalWithdrawals: number;
    totalSpent: number;
    totalReceived: number;
    transactionCount: number;
    averageTransaction: number;
  }> {
    this.logger.info('Getting wallet statistics', {
      walletId,
      startDate,
      endDate,
    });

    // Mock implementation
    return {
      totalTopups: 0,
      totalWithdrawals: 0,
      totalSpent: 0,
      totalReceived: 0,
      transactionCount: 0,
      averageTransaction: 0,
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
    activeWallets: number;
    totalBalance: number;
    currency: string;
  } {
    return {
      activeWallets: 0,
      totalBalance: 0,
      currency: 'BRL',
    };
  }
}
