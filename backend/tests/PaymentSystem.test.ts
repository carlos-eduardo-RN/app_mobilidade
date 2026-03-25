/**
 * Phase 3: Payment System Tests
 * Comprehensive tests for Payment, Wallet, Transaction, and Refund services
 */

import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentProvider,
  Wallet,
  WalletTransactionType,
  Refund,
  RefundStatus,
  RefundReason,
  TransactionType,
} from '../src/models/Payment';
import { PaymentService } from '../src/services/PaymentService';
import { WalletService } from '../src/services/WalletService';
import { TransactionManager } from '../src/services/TransactionManager';
import { RefundService } from '../src/services/RefundService';

describe('PaymentService Tests', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService({
      stripe: {
        secretKey: 'sk_test_123',
        publicKey: 'pk_test_123',
        webhookSecret: 'whsec_test_123',
      },
      paypal: {
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        mode: 'sandbox',
      },
      platformFeePercent: 15,
      processingFeePercent: 2.9,
    });
  });

  describe('Payment Creation', () => {
    it('should create Stripe payment successfully', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        rideId: 'ride-123',
        amount: 25.50,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
        description: 'Ride payment',
      });

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(25.50);
      expect(payment.provider).toBe(PaymentProvider.STRIPE);
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
      expect(payment.platformFee).toBeGreaterThan(0);
      expect(payment.processingFee).toBeGreaterThan(0);
      expect(payment.driverAmount).toBeLessThan(payment.amount);
    });

    it('should create PayPal payment successfully', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 30.00,
        method: PaymentMethod.PAYPAL,
        paypalOrderId: 'ORDER-123',
        description: 'Ride payment',
      });

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(30.00);
      expect(payment.provider).toBe(PaymentProvider.PAYPAL);
      expect(payment.paypalOrderId).toBeDefined();
    });

    it('should create PIX payment successfully', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 20.00,
        method: PaymentMethod.PIX,
        description: 'Ride payment',
      });

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(20.00);
      expect(payment.method).toBe(PaymentMethod.PIX);
      expect(payment.pixId).toBeDefined();
      expect(payment.status).toBe(PaymentStatus.PENDING);
    });

    it('should create cash payment successfully', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 15.00,
        method: PaymentMethod.CASH,
        description: 'Ride payment',
      });

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(15.00);
      expect(payment.method).toBe(PaymentMethod.CASH);
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should calculate fees correctly', async () => {
      const amount = 100.00;
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      const expectedPlatformFee = amount * 0.15; // 15%
      const expectedProcessingFee = amount * 0.029; // 2.9%
      const expectedDriverAmount = amount - expectedPlatformFee - expectedProcessingFee;

      expect(payment.platformFee).toBeCloseTo(expectedPlatformFee, 2);
      expect(payment.processingFee).toBeCloseTo(expectedProcessingFee, 2);
      expect(payment.driverAmount).toBeCloseTo(expectedDriverAmount, 2);
    });

    it('should reject payment with invalid amount', async () => {
      await expect(
        paymentService.createPayment({
          userId: 'user-123',
          amount: 0,
          method: PaymentMethod.STRIPE,
          paymentMethodId: 'pm_test_123',
        })
      ).rejects.toThrow('Payment amount must be greater than 0');
    });

    it('should reject card payment without payment method ID', async () => {
      await expect(
        paymentService.createPayment({
          userId: 'user-123',
          amount: 25.00,
          method: PaymentMethod.CREDIT_CARD,
        })
      ).rejects.toThrow('Payment method ID is required for card payments');
    });
  });

  describe('Payment Operations', () => {
    it('should capture authorized payment', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 50.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      // Mock payment as authorized
      payment.status = PaymentStatus.AUTHORIZED;

      const captured = await paymentService.capturePayment(payment.id);

      expect(captured.status).toBe(PaymentStatus.CAPTURED);
      expect(captured.capturedAt).toBeDefined();
    });

    it('should cancel pending payment', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 50.00,
        method: PaymentMethod.PIX,
      });

      const cancelled = await paymentService.cancelPayment(payment.id);

      expect(cancelled.status).toBe(PaymentStatus.CANCELLED);
      expect(cancelled.cancelledAt).toBeDefined();
    });

    it('should get payment by ID', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 25.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      const retrieved = await paymentService.getPayment(payment.id);

      expect(retrieved).toBeDefined();
      if (retrieved) {
        expect(retrieved.id).toBe(payment.id);
      }
    });

    it('should list payments with filters', async () => {
      // Create multiple payments
      await paymentService.createPayment({
        userId: 'user-123',
        amount: 25.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      await paymentService.createPayment({
        userId: 'user-123',
        amount: 30.00,
        method: PaymentMethod.CASH,
      });

      const payments = await paymentService.listPayments({
        userId: 'user-123',
        limit: 10,
      });

      expect(payments).toBeDefined();
      expect(Array.isArray(payments)).toBe(true);
    });
  });

  describe('Payment Statistics', () => {
    it('should calculate payment statistics', async () => {
      const stats = await paymentService.getStatistics('user-123');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalPayments');
      expect(stats).toHaveProperty('totalAmount');
      expect(stats).toHaveProperty('averageAmount');
      expect(stats).toHaveProperty('byMethod');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('refundRate');
    });
  });
});

describe('WalletService Tests', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService({
      defaultCurrency: 'BRL',
      defaultDailyLimit: 1000.00,
      defaultMonthlyLimit: 5000.00,
      defaultTransactionLimit: 500.00,
      minBalance: 0,
      maxBalance: 10000.00,
    });
  });

  describe('Wallet Creation', () => {
    it('should create wallet successfully', async () => {
      const wallet = await walletService.createWallet('user-123');

      expect(wallet).toBeDefined();
      expect(wallet.userId).toBe('user-123');
      expect(wallet.balance).toBe(0);
      expect(wallet.currency).toBe('BRL');
      expect(wallet.isActive).toBe(true);
      expect(wallet.isFrozen).toBe(false);
      expect(wallet.dailyLimit).toBe(1000.00);
      expect(wallet.monthlyLimit).toBe(5000.00);
    });

    it('should reject duplicate wallet creation', async () => {
      await walletService.createWallet('user-123');

      await expect(
        walletService.createWallet('user-123')
      ).rejects.toThrow('Wallet already exists for this user');
    });

    it('should get wallet by user ID', async () => {
      await walletService.createWallet('user-123');

      const wallet = await walletService.getWallet('user-123');

      expect(wallet).toBeDefined();
      expect(wallet?.userId).toBe('user-123');
    });
  });

  describe('Deposits', () => {
    it('should deposit money successfully', async () => {
      await walletService.createWallet('user-123');

      const transaction = await walletService.deposit({
        userId: 'user-123',
        amount: 100.00,
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(WalletTransactionType.DEPOSIT);
      expect(transaction.amount).toBe(100.00);
      expect(transaction.balanceBefore).toBe(0);
      expect(transaction.balanceAfter).toBe(100.00);

      const wallet = await walletService.getWallet('user-123');
      expect(wallet?.balance).toBe(100.00);
    });

    it('should reject deposit with invalid amount', async () => {
      await walletService.createWallet('user-123');

      await expect(
        walletService.deposit({
          userId: 'user-123',
          amount: 0,
        })
      ).rejects.toThrow('Deposit amount must be greater than 0');
    });

    it('should reject deposit exceeding max balance', async () => {
      await walletService.createWallet('user-123');

      await expect(
        walletService.deposit({
          userId: 'user-123',
          amount: 15000.00, // Exceeds maxBalance of 10000
        })
      ).rejects.toThrow('Deposit would exceed maximum wallet balance');
    });

    it('should reject deposit to non-existent wallet', async () => {
      await expect(
        walletService.deposit({
          userId: 'non-existent',
          amount: 100.00,
        })
      ).rejects.toThrow('Wallet not found');
    });
  });

  describe('Withdrawals', () => {
    it('should withdraw money successfully', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 200.00 });

      const transaction = await walletService.withdraw({
        userId: 'user-123',
        amount: 50.00,
        bankAccountId: 'bank-123',
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(WalletTransactionType.WITHDRAWAL);
      expect(transaction.amount).toBe(50.00);
      expect(transaction.balanceBefore).toBe(200.00);
      expect(transaction.balanceAfter).toBe(150.00);

      const wallet = await walletService.getWallet('user-123');
      expect(wallet?.balance).toBe(150.00);
    });

    it('should reject withdrawal with insufficient balance', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 50.00 });

      await expect(
        walletService.withdraw({
          userId: 'user-123',
          amount: 100.00,
          bankAccountId: 'bank-123',
        })
      ).rejects.toThrow('Insufficient wallet balance');
    });

    it('should reject withdrawal exceeding daily limit', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 2000.00 });

      await expect(
        walletService.withdraw({
          userId: 'user-123',
          amount: 1500.00, // Exceeds dailyLimit of 1000
          bankAccountId: 'bank-123',
        })
      ).rejects.toThrow('Daily withdrawal limit exceeded');
    });

    it('should reject withdrawal exceeding transaction limit', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 1000.00 });

      await expect(
        walletService.withdraw({
          userId: 'user-123',
          amount: 600.00, // Exceeds transactionLimit of 500
          bankAccountId: 'bank-123',
        })
      ).rejects.toThrow('Transaction limit exceeded');
    });
  });

  describe('Payments', () => {
    it('should make payment successfully', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 100.00 });

      const transaction = await walletService.makePayment(
        'user-123',
        25.00,
        'ride-123'
      );

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(WalletTransactionType.PAYMENT);
      expect(transaction.amount).toBe(25.00);
      expect(transaction.rideId).toBe('ride-123');
      expect(transaction.balanceAfter).toBe(75.00);

      const wallet = await walletService.getWallet('user-123');
      expect(wallet?.balance).toBe(75.00);
    });

    it('should reject payment with insufficient balance', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 20.00 });

      await expect(
        walletService.makePayment('user-123', 50.00, 'ride-123')
      ).rejects.toThrow('Insufficient wallet balance');
    });

    it('should reject payment exceeding transaction limit', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 1000.00 });

      await expect(
        walletService.makePayment('user-123', 600.00, 'ride-123')
      ).rejects.toThrow('Transaction limit exceeded');
    });
  });

  describe('Refunds', () => {
    it('should process refund successfully', async () => {
      await walletService.createWallet('user-123');

      const transaction = await walletService.processRefund(
        'user-123',
        50.00,
        'refund-123'
      );

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(WalletTransactionType.REFUND);
      expect(transaction.amount).toBe(50.00);
      expect(transaction.refundId).toBe('refund-123');
      expect(transaction.balanceAfter).toBe(50.00);

      const wallet = await walletService.getWallet('user-123');
      expect(wallet?.balance).toBe(50.00);
    });

    it('should reject refund exceeding max balance', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 9500.00 });

      await expect(
        walletService.processRefund('user-123', 1000.00, 'refund-123')
      ).rejects.toThrow('Refund would exceed maximum wallet balance');
    });
  });

  describe('Transfers', () => {
    it('should transfer money between wallets', async () => {
      await walletService.createWallet('user-1');
      await walletService.createWallet('user-2');
      await walletService.deposit({ userId: 'user-1', amount: 200.00 });

      const result = await walletService.transfer('user-1', 'user-2', 50.00);

      expect(result.fromTransaction).toBeDefined();
      expect(result.toTransaction).toBeDefined();
      expect(result.fromTransaction.amount).toBe(50.00);
      expect(result.toTransaction.amount).toBe(50.00);

      const wallet1 = await walletService.getWallet('user-1');
      const wallet2 = await walletService.getWallet('user-2');

      expect(wallet1?.balance).toBe(150.00);
      expect(wallet2?.balance).toBe(50.00);
    });

    it('should reject transfer with insufficient balance', async () => {
      await walletService.createWallet('user-1');
      await walletService.createWallet('user-2');
      await walletService.deposit({ userId: 'user-1', amount: 30.00 });

      await expect(
        walletService.transfer('user-1', 'user-2', 50.00)
      ).rejects.toThrow('Insufficient balance for transfer');
    });

    it('should reject transfer to non-existent wallet', async () => {
      await walletService.createWallet('user-1');
      await walletService.deposit({ userId: 'user-1', amount: 100.00 });

      await expect(
        walletService.transfer('user-1', 'non-existent', 50.00)
      ).rejects.toThrow('Destination wallet not found');
    });
  });

  describe('Wallet Management', () => {
    it('should freeze wallet', async () => {
      await walletService.createWallet('user-123');

      const wallet = await walletService.freezeWallet(
        'user-123',
        'Suspicious activity'
      );

      expect(wallet.isFrozen).toBe(true);
      expect(wallet.freezeReason).toBe('Suspicious activity');
    });

    it('should reject operations on frozen wallet', async () => {
      await walletService.createWallet('user-123');
      await walletService.freezeWallet('user-123', 'Suspended');

      await expect(
        walletService.deposit({ userId: 'user-123', amount: 100.00 })
      ).rejects.toThrow('Wallet is frozen');
    });

    it('should unfreeze wallet', async () => {
      await walletService.createWallet('user-123');
      await walletService.freezeWallet('user-123', 'Test');

      const wallet = await walletService.unfreezeWallet('user-123');

      expect(wallet.isFrozen).toBe(false);
      expect(wallet.freezeReason).toBeUndefined();
    });

    it('should update wallet limits', async () => {
      await walletService.createWallet('user-123');

      const wallet = await walletService.updateLimits('user-123', {
        dailyLimit: 2000.00,
        transactionLimit: 1000.00,
      });

      expect(wallet.dailyLimit).toBe(2000.00);
      expect(wallet.transactionLimit).toBe(1000.00);
    });

    it('should reset spending counters', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 500.00 });
      await walletService.withdraw({
        userId: 'user-123',
        amount: 100.00,
        bankAccountId: 'bank-123',
      });

      const wallet = await walletService.resetSpendingCounters('user-123', 'daily');

      expect(wallet.dailySpent).toBe(0);
    });
  });

  describe('Transaction History', () => {
    it('should get wallet transactions', async () => {
      await walletService.createWallet('user-123');
      await walletService.deposit({ userId: 'user-123', amount: 100.00 });
      await walletService.makePayment('user-123', 25.00);

      const transactions = await walletService.getTransactions('user-123');

      expect(transactions).toBeDefined();
      expect(transactions.length).toBeGreaterThan(0);
    });

    it('should get transaction by ID', async () => {
      await walletService.createWallet('user-123');
      const depositTx = await walletService.deposit({
        userId: 'user-123',
        amount: 100.00,
      });

      const transaction = await walletService.getTransaction(depositTx.id);

      expect(transaction).toBeDefined();
      expect(transaction?.id).toBe(depositTx.id);
    });
  });

  describe('Statistics', () => {
    it('should calculate wallet statistics', async () => {
      await walletService.createWallet('user-1');
      await walletService.createWallet('user-2');
      await walletService.deposit({ userId: 'user-1', amount: 200.00 });
      await walletService.deposit({ userId: 'user-2', amount: 300.00 });

      const stats = await walletService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalWallets).toBe(2);
      expect(stats.activeWallets).toBe(2);
      expect(stats.totalBalance).toBe(500.00);
      expect(stats.totalDeposits).toBe(2);
    });
  });
});

describe('RefundService Tests', () => {
  let refundService: RefundService;
  let paymentService: PaymentService;
  let walletService: WalletService;

  beforeEach(() => {
    paymentService = new PaymentService({
      stripe: {
        secretKey: 'sk_test_123',
        publicKey: 'pk_test_123',
        webhookSecret: 'whsec_test_123',
      },
      paypal: {
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        mode: 'sandbox',
      },
      platformFeePercent: 15,
      processingFeePercent: 2.9,
    });

    walletService = new WalletService({
      defaultCurrency: 'BRL',
      defaultDailyLimit: 1000.00,
      defaultMonthlyLimit: 5000.00,
      defaultTransactionLimit: 500.00,
      minBalance: 0,
      maxBalance: 10000.00,
    });

    refundService = new RefundService(paymentService, walletService);
  });

  describe('Refund Creation', () => {
    it('should create full refund successfully', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 50.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      const refund = await refundService.createRefund({
        paymentId: payment.id,
        reason: RefundReason.CUSTOMER_REQUEST,
        reasonDetails: 'Ride cancelled',
        initiatedBy: 'user-123',
      });

      expect(refund).toBeDefined();
      expect(refund.paymentId).toBe(payment.id);
      expect(refund.amount).toBe(50.00);
      expect(refund.originalAmount).toBe(50.00);
      expect(refund.reason).toBe(RefundReason.CUSTOMER_REQUEST);
      expect(refund.status).toBe(RefundStatus.COMPLETED);
    });

    it('should create partial refund successfully', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 100.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      const refund = await refundService.createRefund({
        paymentId: payment.id,
        amount: 50.00,
        reason: RefundReason.SERVICE_ISSUE,
        initiatedBy: 'admin-123',
      });

      expect(refund).toBeDefined();
      expect(refund.amount).toBe(50.00);
      expect(refund.originalAmount).toBe(100.00);
      expect(refund.status).toBe(RefundStatus.COMPLETED);
    });

    it('should process automatic refund', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 30.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      const refund = await refundService.processAutomaticRefund(
        payment.id,
        RefundReason.DRIVER_CANCELLATION
      );

      expect(refund).toBeDefined();
      expect(refund.isAutomatic).toBe(true);
      expect(refund.reason).toBe(RefundReason.DRIVER_CANCELLATION);
    });

    it('should reject refund for invalid payment', async () => {
      await expect(
        refundService.createRefund({
          paymentId: 'invalid-payment',
          reason: RefundReason.CUSTOMER_REQUEST,
          initiatedBy: 'user-123',
        })
      ).rejects.toThrow();
    });

    it('should reject refund exceeding payment amount', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 50.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      await expect(
        refundService.createRefund({
          paymentId: payment.id,
          amount: 100.00, // Exceeds payment amount
          reason: RefundReason.CUSTOMER_REQUEST,
          initiatedBy: 'user-123',
        })
      ).rejects.toThrow();
    });
  });

  describe('Refund Operations', () => {
    it('should get refund by ID', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 40.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      const refund = await refundService.createRefund({
        paymentId: payment.id,
        reason: RefundReason.CUSTOMER_REQUEST,
        initiatedBy: 'user-123',
      });

      const retrieved = await refundService.getRefund(refund.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(refund.id);
    });

    it('should list refunds for payment', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 100.00,
        method: PaymentMethod.STRIPE,
        paymentMethodId: 'pm_test_123',
      });

      await refundService.createRefund({
        paymentId: payment.id,
        amount: 30.00,
        reason: RefundReason.SERVICE_ISSUE,
        initiatedBy: 'admin-123',
      });

      await refundService.createRefund({
        paymentId: payment.id,
        amount: 20.00,
        reason: RefundReason.SERVICE_ISSUE,
        initiatedBy: 'admin-123',
      });

      const refunds = await refundService.getRefundsForPayment(payment.id);

      expect(refunds).toBeDefined();
      expect(refunds.length).toBe(2);
    });

    it('should list refunds with filters', async () => {
      const refunds = await refundService.listRefunds({
        userId: 'user-123',
        status: RefundStatus.COMPLETED,
        limit: 10,
      });

      expect(refunds).toBeDefined();
      expect(Array.isArray(refunds)).toBe(true);
    });

    it('should cancel pending refund', async () => {
      const payment = await paymentService.createPayment({
        userId: 'user-123',
        amount: 50.00,
        method: PaymentMethod.PIX,
      });

      const refund = await refundService.createRefund({
        paymentId: payment.id,
        reason: RefundReason.CUSTOMER_REQUEST,
        initiatedBy: 'user-123',
      });

      // Mock as pending
      refund.status = RefundStatus.PENDING;

      const cancelled = await refundService.cancelRefund(refund.id);

      expect(cancelled.status).toBe(RefundStatus.CANCELLED);
    });
  });

  describe('Refund Statistics', () => {
    it('should calculate refund statistics', async () => {
      const stats = await refundService.getStatistics('user-123');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalRefunds');
      expect(stats).toHaveProperty('totalAmount');
      expect(stats).toHaveProperty('byReason');
      expect(stats).toHaveProperty('byStatus');
    });
  });
});

describe('TransactionManager Tests', () => {
  let transactionManager: TransactionManager;

  beforeEach(() => {
    transactionManager = new TransactionManager();
  });

  describe('Transaction Creation', () => {
    it('should create transaction successfully', async () => {
      const transaction = await transactionManager.createTransaction({
        type: TransactionType.RIDE_PAYMENT,
        userId: 'user-123',
        amount: 50.00,
        currency: 'BRL',
        fee: 10.00,
        paymentId: 'pay-123',
        rideId: 'ride-123',
        description: 'Ride payment',
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(TransactionType.RIDE_PAYMENT);
      expect(transaction.amount).toBe(50.00);
      expect(transaction.fee).toBe(10.00);
      expect(transaction.netAmount).toBe(40.00);
      expect(transaction.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should calculate net amount correctly', async () => {
      const transaction = await transactionManager.createTransaction({
        type: TransactionType.RIDE_PAYMENT,
        userId: 'user-123',
        amount: 100.00,
        currency: 'BRL',
        fee: 17.90,
        description: 'Ride payment',
      });

      expect(transaction.netAmount).toBe(82.10);
    });
  });

  describe('Transaction Queries', () => {
    it('should get transaction by ID', async () => {
      const created = await transactionManager.createTransaction({
        type: TransactionType.WALLET_DEPOSIT,
        userId: 'user-123',
        amount: 100.00,
        currency: 'BRL',
        fee: 0,
        description: 'Wallet deposit',
      });

      const retrieved = await transactionManager.getTransaction(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should list user transactions', async () => {
      await transactionManager.createTransaction({
        type: TransactionType.RIDE_PAYMENT,
        userId: 'user-123',
        amount: 50.00,
        currency: 'BRL',
        fee: 10.00,
        description: 'Ride 1',
      });

      await transactionManager.createTransaction({
        type: TransactionType.RIDE_PAYMENT,
        userId: 'user-123',
        amount: 30.00,
        currency: 'BRL',
        fee: 6.00,
        description: 'Ride 2',
      });

      const transactions = await transactionManager.getUserTransactions('user-123');

      expect(transactions).toBeDefined();
      expect(transactions.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter transactions by type', async () => {
      await transactionManager.createTransaction({
        type: TransactionType.WALLET_DEPOSIT,
        userId: 'user-123',
        amount: 100.00,
        currency: 'BRL',
        fee: 0,
        description: 'Deposit',
      });

      const transactions = await transactionManager.listTransactions({
        userId: 'user-123',
        type: TransactionType.WALLET_DEPOSIT,
      });

      expect(transactions).toBeDefined();
      expect(transactions.every((t) => t.type === TransactionType.WALLET_DEPOSIT)).toBe(true);
    });

    it('should filter transactions by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const transactions = await transactionManager.listTransactions({
        userId: 'user-123',
        startDate,
        endDate,
      });

      expect(transactions).toBeDefined();
      expect(Array.isArray(transactions)).toBe(true);
    });

    it('should filter transactions by amount range', async () => {
      const transactions = await transactionManager.listTransactions({
        userId: 'user-123',
        minAmount: 20.00,
        maxAmount: 100.00,
      });

      expect(transactions).toBeDefined();
      expect(Array.isArray(transactions)).toBe(true);
    });
  });

  describe('Transaction Statistics', () => {
    it('should calculate transaction statistics', async () => {
      const stats = await transactionManager.getStatistics('user-123');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalTransactions');
      expect(stats).toHaveProperty('totalAmount');
      expect(stats).toHaveProperty('totalFees');
      expect(stats).toHaveProperty('netAmount');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('byStatus');
    });
  });
});

describe('Integration Tests', () => {
  let paymentService: PaymentService;
  let walletService: WalletService;
  let refundService: RefundService;
  let transactionManager: TransactionManager;

  beforeEach(() => {
    paymentService = new PaymentService({
      stripe: {
        secretKey: 'sk_test_123',
        publicKey: 'pk_test_123',
        webhookSecret: 'whsec_test_123',
      },
      paypal: {
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        mode: 'sandbox',
      },
      platformFeePercent: 15,
      processingFeePercent: 2.9,
    });

    walletService = new WalletService({
      defaultCurrency: 'BRL',
      defaultDailyLimit: 1000.00,
      defaultMonthlyLimit: 5000.00,
      defaultTransactionLimit: 500.00,
      minBalance: 0,
      maxBalance: 10000.00,
    });

    refundService = new RefundService(paymentService, walletService);
    transactionManager = new TransactionManager();
  });

  it('should complete end-to-end ride payment flow', async () => {
    // 1. Create payment
    const payment = await paymentService.createPayment({
      userId: 'user-123',
      rideId: 'ride-123',
      amount: 50.00,
      method: PaymentMethod.STRIPE,
      paymentMethodId: 'pm_test_123',
    });

    expect(payment.status).toBe(PaymentStatus.COMPLETED);

    // 2. Create transaction
    const transaction = await transactionManager.createTransaction({
      type: TransactionType.RIDE_PAYMENT,
      userId: 'user-123',
      amount: payment.amount,
      currency: payment.currency,
      fee: payment.platformFee + payment.processingFee,
      paymentId: payment.id,
      rideId: 'ride-123',
      description: 'Ride payment',
    });

    expect(transaction.status).toBe(PaymentStatus.COMPLETED);

    // 3. Process refund (if needed)
    const refund = await refundService.createRefund({
      paymentId: payment.id,
      amount: 20.00,
      reason: RefundReason.SERVICE_ISSUE,
      initiatedBy: 'admin-123',
    });

    expect(refund.status).toBe(RefundStatus.COMPLETED);
  });

  it('should complete wallet payment and refund flow', async () => {
    // 1. Create wallet
    await walletService.createWallet('user-123');

    // 2. Deposit money
    await walletService.deposit({
      userId: 'user-123',
      amount: 200.00,
    });

    // 3. Make payment
    const paymentTx = await walletService.makePayment(
      'user-123',
      50.00,
      'ride-123'
    );

    expect(paymentTx.type).toBe(WalletTransactionType.PAYMENT);

    // 4. Get wallet balance
    const wallet = await walletService.getWallet('user-123');
    expect(wallet?.balance).toBe(150.00);

    // 5. Process refund
    const refundTx = await walletService.processRefund(
      'user-123',
      30.00,
      'refund-123'
    );

    expect(refundTx.type).toBe(WalletTransactionType.REFUND);

    // 6. Verify final balance
    const updatedWallet = await walletService.getWallet('user-123');
    expect(updatedWallet?.balance).toBe(180.00);
  });

  it('should handle multiple payment methods', async () => {
    // Stripe payment
    const stripePayment = await paymentService.createPayment({
      userId: 'user-123',
      amount: 50.00,
      method: PaymentMethod.STRIPE,
      paymentMethodId: 'pm_test_123',
    });

    expect(stripePayment.provider).toBe(PaymentProvider.STRIPE);

    // PayPal payment
    const paypalPayment = await paymentService.createPayment({
      userId: 'user-123',
      amount: 60.00,
      method: PaymentMethod.PAYPAL,
      paypalOrderId: 'ORDER-123',
    });

    expect(paypalPayment.provider).toBe(PaymentProvider.PAYPAL);

    // Cash payment
    const cashPayment = await paymentService.createPayment({
      userId: 'user-123',
      amount: 30.00,
      method: PaymentMethod.CASH,
    });

    expect(cashPayment.method).toBe(PaymentMethod.CASH);
    expect(cashPayment.status).toBe(PaymentStatus.COMPLETED);
  });
});
