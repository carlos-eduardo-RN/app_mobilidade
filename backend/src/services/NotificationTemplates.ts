/**
 * Notification Templates
 * Template management with Handlebars rendering
 */

import Handlebars from 'handlebars';
import {
  NotificationTemplate,
  NotificationType,
  NotificationChannel,
} from '../models/Notification';
import { Logger } from '../utils/Logger';

export class NotificationTemplates {
  private logger = new Logger('NotificationTemplates');
  
  // In-memory storage (replace with database in production)
  private templates: Map<string, NotificationTemplate> = new Map();
  
  // Compiled template cache
  private compiledCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.registerHelpers();
  }

  /**
   * Initialize default templates for common notification types
   */
  private initializeDefaultTemplates(): void {
    // Ride Request - Push
    this.createTemplate({
      id: 'ride-request-push-pt',
      type: NotificationType.RIDE_REQUESTED,
      channel: NotificationChannel.PUSH,
      language: 'pt-BR',
      title: 'Nova Corrida Disponível!',
      body: 'Corrida de {{pickupAddress}} para {{destinationAddress}}. Distância: {{distance}}km',
      variables: ['pickupAddress', 'destinationAddress', 'distance'],
    });

    // Ride Request - Email
    this.createTemplate({
      id: 'ride-request-email-pt',
      type: NotificationType.RIDE_REQUESTED,
      channel: NotificationChannel.EMAIL,
      language: 'pt-BR',
      subject: 'Nova Corrida Disponível - VouDeMoto',
      html: `
        <h2>Nova Corrida Disponível!</h2>
        <p>Uma nova corrida está aguardando você:</p>
        <ul>
          <li><strong>Origem:</strong> {{pickupAddress}}</li>
          <li><strong>Destino:</strong> {{destinationAddress}}</li>
          <li><strong>Distância:</strong> {{distance}}km</li>
          <li><strong>Valor Estimado:</strong> R$ {{estimatedPrice}}</li>
        </ul>
        <p><a href="{{deepLink}}">Aceitar Corrida</a></p>
      `,
      variables: ['pickupAddress', 'destinationAddress', 'distance', 'estimatedPrice', 'deepLink'],
    });

    // Ride Accepted - Push
    this.createTemplate({
      id: 'ride-accepted-push-pt',
      type: NotificationType.RIDE_ACCEPTED,
      channel: NotificationChannel.PUSH,
      language: 'pt-BR',
      title: 'Corrida Aceita!',
      body: '{{driverName}} aceitou sua corrida. Chegada em {{eta}} minutos.',
      variables: ['driverName', 'eta'],
    });

    // Ride Accepted - SMS
    this.createTemplate({
      id: 'ride-accepted-sms-pt',
      type: NotificationType.RIDE_ACCEPTED,
      channel: NotificationChannel.SMS,
      language: 'pt-BR',
      body: 'VouDeMoto: {{driverName}} aceitou sua corrida! Chegada em {{eta}} min. Placa: {{vehiclePlate}}',
      variables: ['driverName', 'eta', 'vehiclePlate'],
    });

    // Payment Received - Push
    this.createTemplate({
      id: 'payment-received-push-pt',
      type: NotificationType.PAYMENT_RECEIVED,
      channel: NotificationChannel.PUSH,
      language: 'pt-BR',
      title: 'Pagamento Recebido',
      body: 'Você recebeu R$ {{amount}} pela corrida #{{rideId}}',
      variables: ['amount', 'rideId'],
    });

    // Rating Received - Push
    this.createTemplate({
      id: 'rating-received-push-pt',
      type: NotificationType.RATING_RECEIVED,
      channel: NotificationChannel.PUSH,
      language: 'pt-BR',
      title: 'Nova Avaliação',
      body: 'Você recebeu {{rating}} estrelas{{#if comment}} com comentário{{/if}}',
      variables: ['rating', 'comment'],
    });

    // Badge Earned - Push
    this.createTemplate({
      id: 'badge-earned-push-pt',
      type: NotificationType.BADGE_EARNED,
      channel: NotificationChannel.PUSH,
      language: 'pt-BR',
      title: 'Nova Conquista! 🏆',
      body: 'Você ganhou a insígnia "{{badgeName}}"!',
      variables: ['badgeName'],
    });

    // Account Created - Email
    this.createTemplate({
      id: 'account-created-email-pt',
      type: NotificationType.ACCOUNT_CREATED,
      channel: NotificationChannel.EMAIL,
      language: 'pt-BR',
      subject: 'Bem-vindo ao VouDeMoto!',
      html: `
        <h1>Bem-vindo ao VouDeMoto, {{userName}}!</h1>
        <p>Sua conta foi criada com sucesso.</p>
        <p>Para começar a usar, complete seu perfil:</p>
        <ol>
          <li>Adicione uma foto</li>
          <li>Verifique seu telefone</li>
          <li>Adicione um método de pagamento</li>
        </ol>
        <p><a href="{{profileUrl}}">Completar Perfil</a></p>
        <p>Qualquer dúvida, estamos à disposição!</p>
      `,
      variables: ['userName', 'profileUrl'],
    });

    // Promotion - Push
    this.createTemplate({
      id: 'promotion-push-pt',
      type: NotificationType.PROMOTION_AVAILABLE,
      channel: NotificationChannel.PUSH,
      language: 'pt-BR',
      title: '🎉 Promoção Especial!',
      body: '{{promotionTitle}} - Válido até {{expiryDate}}',
      variables: ['promotionTitle', 'expiryDate'],
    });

    this.logger.info('Default templates initialized', {
      count: this.templates.size,
    });
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Currency formatter
    Handlebars.registerHelper('currency', (value: number) => {
      return `R$ ${value.toFixed(2).replace('.', ',')}`;
    });

    // Date formatter
    Handlebars.registerHelper('date', (date: Date | string, format?: string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      
      if (format === 'short') {
        return d.toLocaleDateString('pt-BR');
      } else if (format === 'time') {
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } else {
        return d.toLocaleString('pt-BR');
      }
    });

    // Pluralize
    Handlebars.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
      return count === 1 ? singular : plural;
    });

    // Stars (rating)
    Handlebars.registerHelper('stars', (rating: number) => {
      return '⭐'.repeat(Math.floor(rating));
    });

    // Uppercase
    Handlebars.registerHelper('upper', (str: string) => {
      return str.toUpperCase();
    });

    // Lowercase
    Handlebars.registerHelper('lower', (str: string) => {
      return str.toLowerCase();
    });

    // Truncate
    Handlebars.registerHelper('truncate', (str: string, length: number) => {
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });
  }

  /**
   * Create new template
   */
  createTemplate(template: NotificationTemplate): NotificationTemplate {
    // Validate template
    this.validateTemplate(template);

    this.templates.set(template.id, template);

    // Clear compiled cache for this template
    this.compiledCache.delete(template.id);

    this.logger.info('Template created', {
      id: template.id,
      type: template.type,
      channel: template.channel,
      language: template.language,
    });

    return template;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Find template by criteria
   */
  findTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    language: string = 'pt-BR'
  ): NotificationTemplate | undefined {
    // Try exact match
    let template = Array.from(this.templates.values()).find(
      t => t.type === type && t.channel === channel && t.language === language
    );

    // Fallback to default language if not found
    if (!template && language !== 'pt-BR') {
      template = Array.from(this.templates.values()).find(
        t => t.type === type && t.channel === channel && t.language === 'pt-BR'
      );
    }

    return template;
  }

  /**
   * Update template
   */
  updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): NotificationTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const updated = { ...template, ...updates };
    this.validateTemplate(updated);

    this.templates.set(templateId, updated);
    this.compiledCache.delete(templateId);

    this.logger.info('Template updated', { templateId });

    return updated;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): boolean {
    this.compiledCache.delete(templateId);
    return this.templates.delete(templateId);
  }

  /**
   * Render template with data
   */
  render(templateId: string, data: Record<string, any>): {
    subject?: string;
    title?: string;
    body?: string;
    html?: string;
  } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Validate required variables
    this.validateVariables(template, data);

    // Get or compile template
    const compiled = this.getCompiledTemplate(template);

    const result: any = {};

    if (template.subject) {
      result.subject = compiled.subject(data);
    }

    if (template.title) {
      result.title = compiled.title(data);
    }

    if (template.body) {
      result.body = compiled.body(data);
    }

    if (template.html) {
      result.html = compiled.html(data);
    }

    return result;
  }

  /**
   * Render template by criteria
   */
  renderBy(
    type: NotificationType,
    channel: NotificationChannel,
    data: Record<string, any>,
    language: string = 'pt-BR'
  ): {
    subject?: string;
    title?: string;
    body?: string;
    html?: string;
  } {
    const template = this.findTemplate(type, channel, language);
    if (!template) {
      throw new Error(`Template not found for type=${type}, channel=${channel}, language=${language}`);
    }

    return this.render(template.id, data);
  }

  /**
   * Get or compile template
   */
  private getCompiledTemplate(template: NotificationTemplate): {
    subject?: HandlebarsTemplateDelegate;
    title?: HandlebarsTemplateDelegate;
    body?: HandlebarsTemplateDelegate;
    html?: HandlebarsTemplateDelegate;
  } {
    const cacheKey = template.id;
    
    if (this.compiledCache.has(cacheKey)) {
      return this.compiledCache.get(cacheKey) as any;
    }

    const compiled: any = {};

    if (template.subject) {
      compiled.subject = Handlebars.compile(template.subject);
    }

    if (template.title) {
      compiled.title = Handlebars.compile(template.title);
    }

    if (template.body) {
      compiled.body = Handlebars.compile(template.body);
    }

    if (template.html) {
      compiled.html = Handlebars.compile(template.html);
    }

    this.compiledCache.set(cacheKey, compiled);

    return compiled;
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: NotificationTemplate): void {
    if (!template.id || !template.type || !template.channel || !template.language) {
      throw new Error('Template missing required fields: id, type, channel, language');
    }

    // At least one content field required
    if (!template.subject && !template.title && !template.body && !template.html) {
      throw new Error('Template must have at least one content field: subject, title, body, or html');
    }

    // Validate content compiles
    try {
      if (template.subject) Handlebars.compile(template.subject);
      if (template.title) Handlebars.compile(template.title);
      if (template.body) Handlebars.compile(template.body);
      if (template.html) Handlebars.compile(template.html);
    } catch (error) {
      throw new Error(`Template compilation failed: ${error}`);
    }
  }

  /**
   * Validate template variables
   */
  private validateVariables(template: NotificationTemplate, data: Record<string, any>): void {
    if (!template.variables || template.variables.length === 0) {
      return;
    }

    const missingVars = template.variables.filter(variable => !(variable in data));

    if (missingVars.length > 0) {
      this.logger.warn('Missing template variables', {
        templateId: template.id,
        missing: missingVars,
      });
      // Don't throw error - Handlebars will handle missing vars gracefully
    }
  }

  /**
   * List all templates
   */
  listTemplates(filters?: {
    type?: NotificationType;
    channel?: NotificationChannel;
    language?: string;
  }): NotificationTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters?.type) {
      templates = templates.filter(t => t.type === filters.type);
    }

    if (filters?.channel) {
      templates = templates.filter(t => t.channel === filters.channel);
    }

    if (filters?.language) {
      templates = templates.filter(t => t.language === filters.language);
    }

    return templates;
  }

  /**
   * Get template statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byChannel: Record<string, number>;
    byLanguage: Record<string, number>;
  } {
    const templates = Array.from(this.templates.values());

    const byType: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};

    for (const template of templates) {
      byType[template.type] = (byType[template.type] || 0) + 1;
      byChannel[template.channel] = (byChannel[template.channel] || 0) + 1;
      byLanguage[template.language] = (byLanguage[template.language] || 0) + 1;
    }

    return {
      total: templates.length,
      byType,
      byChannel,
      byLanguage,
    };
  }

  /**
   * Clear compiled cache (useful after bulk updates)
   */
  clearCache(): void {
    this.compiledCache.clear();
    this.logger.info('Template cache cleared');
  }

  /**
   * Export all templates (for backup/migration)
   */
  export(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Import templates (for backup/migration)
   */
  import(templates: NotificationTemplate[]): number {
    let count = 0;

    for (const template of templates) {
      try {
        this.createTemplate(template);
        count++;
      } catch (error) {
        this.logger.error('Failed to import template', {
          templateId: template.id,
          error,
        });
      }
    }

    return count;
  }

  /**
   * Clear all templates (for testing)
   */
  clear() {
    this.templates.clear();
    this.compiledCache.clear();
  }
}
