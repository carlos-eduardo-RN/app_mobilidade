/**
 * SendGrid Email Service
 * Integração completa com SendGrid para envio de emails
 */

import { Logger } from '../utils/Logger';

/**
 * Email Message Interface
 */
export interface EmailMessage {
  to: string | string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  headers?: Record<string, string>;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number;
}

/**
 * Email Attachment Interface
 */
export interface EmailAttachment {
  content: string; // Base64 encoded
  filename: string;
  type?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

/**
 * Email Response Interface
 */
export interface EmailResponse {
  messageId: string;
  statusCode: number;
  accepted: string[];
  rejected: string[];
  pending: string[];
}

/**
 * SendGrid Configuration
 */
export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  sandbox?: boolean;
  timeout?: number;
}

/**
 * Email Template Data
 */
export interface TemplateData {
  userName: string;
  [key: string]: any;
}

/**
 * SendGrid Service
 * Gerencia envio de emails através do SendGrid
 */
export class SendGridService {
  private logger = new Logger('SendGridService');
  private config: SendGridConfig;
  private client: any; // SendGrid client

  constructor(config: SendGridConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * Initialize SendGrid client
   */
  private initializeClient(): void {
    try {
      // Em produção: const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.config.apiKey);
      // this.client = sgMail;

      // Mock para desenvolvimento
      this.client = {
        send: async (message: any) => this.mockSendEmail(message),
        sendMultiple: async (message: any) => this.mockSendMultipleEmails(message),
      };

      this.logger.info('SendGrid client initialized', {
        fromEmail: this.config.fromEmail,
        sandbox: this.config.sandbox,
      });
    } catch (error) {
      this.logger.error('Failed to initialize SendGrid client', { error });
      throw error;
    }
  }

  /**
   * Send single email
   */
  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    try {
      // Validate email
      this.validateEmail(message);

      this.logger.info('Sending email', {
        to: this.maskEmail(Array.isArray(message.to) ? message.to[0] : message.to),
        subject: message.subject,
      });

      // Prepare SendGrid message
      const sgMessage = {
        to: message.to,
        from: {
          email: message.from || this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: message.subject,
        text: message.text,
        html: message.html,
        templateId: message.templateId,
        dynamicTemplateData: message.dynamicTemplateData,
        attachments: message.attachments,
        replyTo: message.replyTo || this.config.replyToEmail,
        cc: message.cc,
        bcc: message.bcc,
        headers: message.headers,
        categories: message.categories,
        customArgs: message.customArgs,
        sendAt: message.sendAt,
        mailSettings: {
          sandboxMode: {
            enable: this.config.sandbox || false,
          },
        },
      };

      // Send via SendGrid
      const response = await this.client.send(sgMessage);

      const emailResponse: EmailResponse = {
        messageId: response[0].headers['x-message-id'] || this.generateMessageId(),
        statusCode: response[0].statusCode,
        accepted: Array.isArray(message.to) ? message.to : [message.to],
        rejected: [],
        pending: [],
      };

      this.logger.info('Email sent successfully', {
        messageId: emailResponse.messageId,
        statusCode: emailResponse.statusCode,
      });

      return emailResponse;
    } catch (error) {
      this.logger.error('Failed to send email', {
        to: this.maskEmail(Array.isArray(message.to) ? message.to[0] : message.to),
        subject: message.subject,
        error,
      });
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailResponse[]> {
    this.logger.info('Sending bulk emails', { count: messages.length });

    const results = await Promise.allSettled(
      messages.map((message) => this.sendEmail(message))
    );

    const responses: EmailResponse[] = [];
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
        successCount++;
      } else {
        failureCount++;
        this.logger.error('Bulk email failed', {
          index,
          to: this.maskEmail(
            Array.isArray(messages[index].to) ? messages[index].to[0] : messages[index].to as string
          ),
          error: result.reason,
        });
      }
    });

    this.logger.info('Bulk emails completed', {
      total: messages.length,
      success: successCount,
      failed: failureCount,
    });

    return responses;
  }

  /**
   * Send email with template
   */
  async sendTemplateEmail(
    to: string | string[],
    templateId: string,
    templateData: TemplateData,
    options?: Partial<EmailMessage>
  ): Promise<EmailResponse> {
    const message: EmailMessage = {
      to,
      subject: '', // Subject is in template
      templateId,
      dynamicTemplateData: templateData,
      ...options,
    };

    return this.sendEmail(message);
  }

  /**
   * Validate email message
   */
  private validateEmail(message: EmailMessage): void {
    // Validate recipients
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    recipients.forEach((email) => {
      if (!this.isValidEmail(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    });

    // Validate content
    if (!message.templateId && !message.text && !message.html) {
      throw new Error('Email must have text, html, or templateId');
    }

    // Validate subject (required if not using template)
    if (!message.templateId && !message.subject) {
      throw new Error('Email subject is required');
    }
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Mask email for logging
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    
    const maskedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : local[0] + '*';
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Mock send email (development)
   */
  private async mockSendEmail(message: any): Promise<any> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Simulate random failure (3% chance)
    if (Math.random() < 0.03) {
      throw new Error('Mock email send failure');
    }

    return [
      {
        statusCode: 202,
        headers: {
          'x-message-id': this.generateMessageId(),
        },
      },
    ];
  }

  /**
   * Mock send multiple emails (development)
   */
  private async mockSendMultipleEmails(message: any): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return [
      {
        statusCode: 202,
        headers: {
          'x-message-id': this.generateMessageId(),
        },
      },
    ];
  }

  /**
   * Get service statistics
   */
  getStats(): {
    configured: boolean;
    fromEmail: string;
    sandbox: boolean;
  } {
    return {
      configured: !!this.client,
      fromEmail: this.config.fromEmail,
      sandbox: this.config.sandbox || false,
    };
  }
}

/**
 * Email Templates
 */
export class EmailTemplates {
  /**
   * Welcome email
   */
  static welcome(userName: string, verificationLink: string): EmailMessage {
    return {
      to: '',
      subject: 'Bem-vindo ao VouDeMoto! 🚀',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0E2A3B;">Bem-vindo, ${userName}!</h1>
          <p>Estamos felizes em ter você no VouDeMoto.</p>
          <p>Para começar a usar o app, por favor verifique seu email:</p>
          <a href="${verificationLink}" style="display: inline-block; background: #F7931E; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Verificar Email
          </a>
          <p>Se você não criou esta conta, por favor ignore este email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">VouDeMoto - Seu transporte de confiança</p>
        </div>
      `,
    };
  }

  /**
   * Ride receipt email
   */
  static rideReceipt(
    userName: string,
    rideDetails: {
      id: string;
      date: Date;
      origin: string;
      destination: string;
      duration: number;
      distance: number;
      amount: number;
      paymentMethod: string;
    }
  ): EmailMessage {
    return {
      to: '',
      subject: `Recibo da Corrida #${rideDetails.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0E2A3B;">Recibo da Corrida</h1>
          <p>Olá ${userName},</p>
          <p>Aqui está o recibo da sua corrida:</p>
          
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Corrida #:</strong> ${rideDetails.id}</p>
            <p><strong>Data:</strong> ${rideDetails.date.toLocaleString('pt-BR')}</p>
            <p><strong>Origem:</strong> ${rideDetails.origin}</p>
            <p><strong>Destino:</strong> ${rideDetails.destination}</p>
            <p><strong>Duração:</strong> ${rideDetails.duration} minutos</p>
            <p><strong>Distância:</strong> ${rideDetails.distance.toFixed(2)} km</p>
            <hr style="border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 18px;"><strong>Total:</strong> R$ ${rideDetails.amount.toFixed(2)}</p>
            <p><strong>Método:</strong> ${rideDetails.paymentMethod}</p>
          </div>
          
          <p>Obrigado por usar o VouDeMoto!</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">VouDeMoto - Seu transporte de confiança</p>
        </div>
      `,
    };
  }

  /**
   * Password reset email
   */
  static passwordReset(userName: string, resetLink: string): EmailMessage {
    return {
      to: '',
      subject: 'Redefinição de Senha - VouDeMoto',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0E2A3B;">Redefinição de Senha</h1>
          <p>Olá ${userName},</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <a href="${resetLink}" style="display: inline-block; background: #F7931E; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Redefinir Senha
          </a>
          <p>Este link expira em 1 hora.</p>
          <p>Se você não solicitou esta redefinição, ignore este email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">VouDeMoto - Seu transporte de confiança</p>
        </div>
      `,
    };
  }

  /**
   * Rating reminder email
   */
  static ratingReminder(userName: string, rideId: string, driverName: string): EmailMessage {
    return {
      to: '',
      subject: 'Avalie sua corrida 🌟',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0E2A3B;">Como foi sua corrida?</h1>
          <p>Olá ${userName},</p>
          <p>Como foi sua experiência com ${driverName}?</p>
          <p>Sua avaliação nos ajuda a melhorar o serviço!</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="#" style="font-size: 32px; text-decoration: none; margin: 0 8px;">⭐</a>
            <a href="#" style="font-size: 32px; text-decoration: none; margin: 0 8px;">⭐</a>
            <a href="#" style="font-size: 32px; text-decoration: none; margin: 0 8px;">⭐</a>
            <a href="#" style="font-size: 32px; text-decoration: none; margin: 0 8px;">⭐</a>
            <a href="#" style="font-size: 32px; text-decoration: none; margin: 0 8px;">⭐</a>
          </div>
          <p style="text-align: center;">
            <a href="#" style="display: inline-block; background: #F7931E; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Avaliar Agora
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">VouDeMoto - Seu transporte de confiança</p>
        </div>
      `,
    };
  }

  /**
   * Promotional email
   */
  static promotional(userName: string, promoCode: string, discount: number): EmailMessage {
    return {
      to: '',
      subject: `🎉 ${discount}% de desconto na sua próxima corrida!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0E2A3B;">Promoção Especial!</h1>
          <p>Olá ${userName},</p>
          <p>Temos uma oferta especial para você!</p>
          <div style="background: linear-gradient(135deg, #F7931E 0%, #FF6B35 100%); color: #fff; padding: 32px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <h2 style="margin: 0; font-size: 48px;">${discount}%</h2>
            <p style="margin: 8px 0; font-size: 18px;">DE DESCONTO</p>
            <p style="margin: 16px 0; font-size: 14px;">Use o código:</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${promoCode}</p>
          </div>
          <p style="text-align: center;">Válido até o final do mês!</p>
          <p style="text-align: center;">
            <a href="#" style="display: inline-block; background: #F7931E; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Usar Agora
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">VouDeMoto - Seu transporte de confiança</p>
        </div>
      `,
    };
  }

  /**
   * Weekly summary email
   */
  static weeklySummary(
    userName: string,
    stats: {
      ridesCount: number;
      totalSpent: number;
      favoriteDestination: string;
      savedAmount: number;
    }
  ): EmailMessage {
    return {
      to: '',
      subject: 'Seu resumo semanal 📊',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0E2A3B;">Seu Resumo Semanal</h1>
          <p>Olá ${userName},</p>
          <p>Aqui está um resumo da sua semana:</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 32px; color: #F7931E;">${stats.ridesCount}</p>
              <p style="margin: 8px 0 0 0; color: #666;">Corridas</p>
            </div>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; font-size: 32px; color: #F7931E;">R$ ${stats.totalSpent.toFixed(2)}</p>
              <p style="margin: 8px 0 0 0; color: #666;">Total Gasto</p>
            </div>
          </div>
          
          <p><strong>Destino favorito:</strong> ${stats.favoriteDestination}</p>
          <p style="color: #28a745;"><strong>Você economizou R$ ${stats.savedAmount.toFixed(2)} esta semana!</strong></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">VouDeMoto - Seu transporte de confiança</p>
        </div>
      `,
    };
  }
}
