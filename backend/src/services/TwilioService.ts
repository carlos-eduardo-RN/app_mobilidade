/**
 * Twilio SMS Service
 * Integração completa com Twilio para envio de SMS
 */

import { Logger } from '../utils/Logger';

/**
 * SMS Message Interface
 */
export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
  statusCallback?: string;
  maxPrice?: number;
  validityPeriod?: number;
}

/**
 * SMS Response Interface
 */
export interface SMSResponse {
  sid: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'delivered' | 'undelivered';
  to: string;
  from: string;
  body: string;
  numSegments: number;
  price?: string;
  priceUnit?: string;
  errorCode?: number;
  errorMessage?: string;
  dateCreated: Date;
  dateSent?: Date;
  dateUpdated: Date;
}

/**
 * Twilio Configuration
 */
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  statusCallbackUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Twilio Service
 * Gerencia envio de SMS através do Twilio
 */
export class TwilioService {
  private logger = new Logger('TwilioService');
  private config: TwilioConfig;
  private client: any; // Twilio client

  constructor(config: TwilioConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize Twilio client
   */
  private initializeClient(): void {
    try {
      // Em produção: const twilio = require('twilio');
      // this.client = twilio(this.config.accountSid, this.config.authToken);
      
      // Mock para desenvolvimento
      this.client = {
        messages: {
          create: async (message: any) => this.mockSendSMS(message),
        },
      };

      this.logger.info('Twilio client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Twilio client', { error });
      throw error;
    }
  }

  /**
   * Send single SMS
   */
  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    try {
      // Validate phone number
      if (!this.isValidPhoneNumber(message.to)) {
        throw new Error(`Invalid phone number: ${message.to}`);
      }

      // Validate message body
      if (!message.body || message.body.trim().length === 0) {
        throw new Error('SMS body cannot be empty');
      }

      // Check message length
      const segments = this.calculateSegments(message.body);
      if (segments > 10) {
        this.logger.warn('SMS message exceeds 10 segments', {
          to: message.to,
          segments,
        });
      }

      this.logger.info('Sending SMS', {
        to: this.maskPhoneNumber(message.to),
        segments,
      });

      // Send via Twilio
      const twilioMessage = await this.client.messages.create({
        to: message.to,
        from: message.from || this.config.phoneNumber,
        body: message.body,
        mediaUrl: message.mediaUrl,
        statusCallback: message.statusCallback || this.config.statusCallbackUrl,
        maxPrice: message.maxPrice,
        validityPeriod: message.validityPeriod,
      });

      const response: SMSResponse = {
        sid: twilioMessage.sid,
        status: twilioMessage.status,
        to: twilioMessage.to,
        from: twilioMessage.from,
        body: twilioMessage.body,
        numSegments: twilioMessage.numSegments,
        price: twilioMessage.price,
        priceUnit: twilioMessage.priceUnit,
        errorCode: twilioMessage.errorCode,
        errorMessage: twilioMessage.errorMessage,
        dateCreated: new Date(twilioMessage.dateCreated),
        dateSent: twilioMessage.dateSent ? new Date(twilioMessage.dateSent) : undefined,
        dateUpdated: new Date(twilioMessage.dateUpdated),
      };

      this.logger.info('SMS sent successfully', {
        sid: response.sid,
        to: this.maskPhoneNumber(response.to),
        status: response.status,
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to send SMS', {
        to: this.maskPhoneNumber(message.to),
        error,
      });
      throw error;
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    this.logger.info('Sending bulk SMS', { count: messages.length });

    const results = await Promise.allSettled(
      messages.map((message) => this.sendSMS(message))
    );

    const responses: SMSResponse[] = [];
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
        successCount++;
      } else {
        failureCount++;
        this.logger.error('Bulk SMS failed for message', {
          index,
          to: this.maskPhoneNumber(messages[index].to),
          error: result.reason,
        });
      }
    });

    this.logger.info('Bulk SMS completed', {
      total: messages.length,
      success: successCount,
      failed: failureCount,
    });

    return responses;
  }

  /**
   * Get SMS status
   */
  async getSMSStatus(sid: string): Promise<SMSResponse> {
    try {
      this.logger.info('Fetching SMS status', { sid });

      // Em produção: const message = await this.client.messages(sid).fetch();
      const message = await this.mockGetSMSStatus(sid);

      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        numSegments: message.numSegments,
        price: message.price,
        priceUnit: message.priceUnit,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: new Date(message.dateCreated),
        dateSent: message.dateSent ? new Date(message.dateSent) : undefined,
        dateUpdated: new Date(message.dateUpdated),
      };
    } catch (error) {
      this.logger.error('Failed to get SMS status', { sid, error });
      throw error;
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Calculate number of SMS segments
   */
  private calculateSegments(body: string): number {
    // GSM-7 encoding: 160 characters per segment
    // UCS-2 encoding: 70 characters per segment (for unicode)
    const hasUnicode = /[^\x00-\x7F]/.test(body);
    const maxCharsPerSegment = hasUnicode ? 70 : 160;
    
    if (body.length <= maxCharsPerSegment) {
      return 1;
    }

    // Multi-part messages have overhead
    const maxCharsPerMultiSegment = hasUnicode ? 67 : 153;
    return Math.ceil(body.length / maxCharsPerMultiSegment);
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 4) return '****';
    return phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4);
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phoneNumber: string, countryCode: string = '+55'): string {
    // Remove non-digits
    const digits = phoneNumber.replace(/\D/g, '');

    // Add country code if not present
    if (!phoneNumber.startsWith('+')) {
      return `${countryCode}${digits}`;
    }

    return phoneNumber;
  }

  /**
   * Mock send SMS (development)
   */
  private async mockSendSMS(message: any): Promise<any> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulate random failure (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Mock SMS send failure');
    }

    return {
      sid: `SM${this.generateRandomId()}`,
      status: 'sent',
      to: message.to,
      from: message.from,
      body: message.body,
      numSegments: this.calculateSegments(message.body),
      price: '-0.0075',
      priceUnit: 'USD',
      dateCreated: new Date(),
      dateSent: new Date(),
      dateUpdated: new Date(),
    };
  }

  /**
   * Mock get SMS status (development)
   */
  private async mockGetSMSStatus(sid: string): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      sid,
      status: 'delivered',
      to: '+5511999999999',
      from: this.config.phoneNumber,
      body: 'Mock SMS message',
      numSegments: 1,
      price: '-0.0075',
      priceUnit: 'USD',
      dateCreated: new Date(Date.now() - 60000),
      dateSent: new Date(Date.now() - 50000),
      dateUpdated: new Date(),
    };
  }

  /**
   * Generate random ID
   */
  private generateRandomId(): string {
    return Math.random().toString(36).substr(2, 32).toUpperCase();
  }

  /**
   * Get service statistics
   */
  getStats(): {
    configured: boolean;
    phoneNumber: string;
    accountSid: string;
  } {
    return {
      configured: !!this.client,
      phoneNumber: this.config.phoneNumber,
      accountSid: this.config.accountSid.slice(0, 10) + '...',
    };
  }
}

/**
 * SMS Templates
 */
export class SMSTemplates {
  /**
   * Ride request notification
   */
  static rideRequest(driverName: string, origin: string): string {
    return `Olá ${driverName}! Nova corrida disponível de ${origin}. Abra o app para aceitar.`;
  }

  /**
   * Ride accepted notification
   */
  static rideAccepted(passengerName: string, driverName: string, eta: number): string {
    return `Olá ${passengerName}! ${driverName} aceitou sua corrida e chegará em ${eta} minutos.`;
  }

  /**
   * Driver approaching
   */
  static driverApproaching(passengerName: string, driverName: string): string {
    return `${passengerName}, ${driverName} está chegando. Prepare-se para embarcar!`;
  }

  /**
   * Ride started
   */
  static rideStarted(passengerName: string): string {
    return `Sua corrida começou, ${passengerName}! Tenha uma ótima viagem.`;
  }

  /**
   * Ride completed
   */
  static rideCompleted(passengerName: string, amount: number): string {
    return `Corrida finalizada! Valor: R$ ${amount.toFixed(2)}. Avalie sua experiência no app.`;
  }

  /**
   * Payment confirmation
   */
  static paymentConfirmed(amount: number, method: string): string {
    return `Pagamento de R$ ${amount.toFixed(2)} confirmado via ${method}. Obrigado!`;
  }

  /**
   * Rating received
   */
  static ratingReceived(rating: number, comment?: string): string {
    const stars = '⭐'.repeat(rating);
    const msg = `Você recebeu uma avaliação: ${stars}`;
    return comment ? `${msg}\n"${comment}"` : msg;
  }

  /**
   * Verification code
   */
  static verificationCode(code: string): string {
    return `Seu código de verificação VouDeMoto: ${code}. Válido por 10 minutos.`;
  }

  /**
   * Welcome message
   */
  static welcome(name: string): string {
    return `Bem-vindo ao VouDeMoto, ${name}! Sua primeira corrida está a um toque de distância.`;
  }

  /**
   * Promotional message
   */
  static promotional(discount: number): string {
    return `🎉 Promoção! ${discount}% de desconto na próxima corrida. Use o app agora!`;
  }
}
