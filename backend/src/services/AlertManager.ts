/**
 * Alert Manager
 * Gerencia regras de alertas, verifica condições e publica alertas
 */

import { v4 as uuid } from 'uuid';
import { Logger } from '../utils/Logger';
import {
  AlertConfig,
  AlertLevel,
  AlertRule,
  AlertTriggered,
  AlertAction,
  MetricType,
  COMMON_ALERTS,
} from '../models/Observability';

interface AlertState {
  alertId: string;
  config: AlertConfig;
  lastTriggered?: Date;
  triggerCount: number;
  isFiring: boolean;
}

export class AlertManager {
  private alerts: Map<string, AlertState> = new Map();
  private alertHistory: AlertTriggered[] = [];
  private maxHistorySize = 1000;
  private alertListeners: Array<(alert: AlertTriggered) => Promise<void>> = [];

  constructor() {
    Logger.info('AlertManager', 'AlertManager initialized');
  }

  /**
   * Define uma nova regra de alerta
   */
  defineAlert(config: AlertConfig): string {
    try {
      const state: AlertState = {
        alertId: config.alertId,
        config,
        triggerCount: 0,
        isFiring: false,
      };

      this.alerts.set(config.alertId, state);

      Logger.info('AlertManager', `Alert defined: ${config.name}`, {
        alertId: config.alertId,
        rule: config.rule,
      });

      return config.alertId;
    } catch (err) {
      Logger.error('AlertManager', `Error defining alert: ${err}`);
      throw err;
    }
  }

  /**
   * Define alertas comuns pré-configurados
   */
  defineCommonAlerts(): string[] {
    const alertIds: string[] = [];

    const commonAlerts = [
      {
        ...COMMON_ALERTS.HIGH_TIMEOUT_RATE,
        alertId: uuid(),
      },
      {
        ...COMMON_ALERTS.LOW_DRIVER_ACCEPTANCE,
        alertId: uuid(),
      },
      {
        ...COMMON_ALERTS.MATCHING_DELAY,
        alertId: uuid(),
      },
      {
        ...COMMON_ALERTS.DRIVER_OFFLINE_SURGE,
        alertId: uuid(),
      },
      {
        ...COMMON_ALERTS.RIDE_CANCELLATION_SPIKE,
        alertId: uuid(),
      },
    ];

    for (const alert of commonAlerts) {
      const config: AlertConfig = {
        alertId: alert.alertId,
        name: alert.name,
        description: alert.description,
        enabled: true,
        rule: {
          metric: alert.metric,
          condition: alert.condition,
          threshold: alert.threshold,
          duration: alert.duration,
          evaluationPeriod: 60,
        },
        actions: [
          {
            type: 'log',
          },
          {
            type: 'webhook',
            destination: process.env.ALERT_WEBHOOK_URL || 'http://localhost:3001/webhooks/alert',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.defineAlert(config);
      alertIds.push(alert.alertId);
    }

    Logger.info('AlertManager', `${alertIds.length} common alerts defined`);
    return alertIds;
  }

  /**
   * Avalia uma métrica contra uma regra de alerta
   */
  evaluateAlert(
    alertId: string,
    metricValue: number
  ): AlertTriggered | null {
    try {
      const state = this.alerts.get(alertId);
      if (!state || !state.config.enabled) {
        return null;
      }

      const rule = state.config.rule;
      let shouldFire = false;

      // Verificar condição
      switch (rule.condition) {
        case 'greater_than':
          shouldFire = metricValue > (rule.threshold as number);
          break;
        case 'less_than':
          shouldFire = metricValue < (rule.threshold as number);
          break;
        case 'equals':
          shouldFire = metricValue === (rule.threshold as number);
          break;
        case 'not_equals':
          shouldFire = metricValue !== (rule.threshold as number);
          break;
        case 'range':
          const { min, max } = rule.threshold as { min: number; max: number };
          shouldFire = metricValue >= min && metricValue <= max;
          break;
      }

      if (!shouldFire) {
        state.isFiring = false;
        return null;
      }

      // Se já estava disparando, não disparar novamente
      if (state.isFiring) {
        return null;
      }

      // Disparar alerta
      state.isFiring = true;
      state.triggerCount++;
      state.lastTriggered = new Date();

      const alert: AlertTriggered = {
        alertId,
        name: state.config.name,
        level: this.determineLevel(state.triggerCount),
        message: `${state.config.name}: ${metricValue} vs threshold ${rule.threshold}`,
        metric: rule.metric,
        value: metricValue,
        threshold: rule.threshold as number,
        timestamp: new Date(),
        actions: state.config.actions,
      };

      // Adicionar ao histórico
      this.alertHistory.push(alert);
      if (this.alertHistory.length > this.maxHistorySize) {
        this.alertHistory.shift();
      }

      Logger.warn('AlertManager', `Alert triggered: ${alert.name}`, {
        level: alert.level,
        value: alert.value,
      });

      return alert;
    } catch (err) {
      Logger.error('AlertManager', `Error evaluating alert: ${err}`);
      return null;
    }
  }

  /**
   * Determina nível do alerta baseado em contagem de disparos
   */
  private determineLevel(triggerCount: number): AlertLevel {
    if (triggerCount >= 5) {
      return AlertLevel.CRITICAL;
    } else if (triggerCount >= 2) {
      return AlertLevel.WARNING;
    }
    return AlertLevel.INFO;
  }

  /**
   * Executa ações de alerta
   */
  async executeAlertActions(alert: AlertTriggered): Promise<void> {
    try {
      for (const action of alert.actions) {
        await this.executeAction(action, alert);
      }
    } catch (err) {
      Logger.error('AlertManager', `Error executing alert actions: ${err}`);
    }
  }

  /**
   * Executa uma ação individual
   */
  private async executeAction(action: AlertAction, alert: AlertTriggered): Promise<void> {
    try {
      switch (action.type) {
        case 'log':
          Logger.error('AlertManager', `ALERT [${alert.level}]: ${alert.message}`);
          break;

        case 'webhook':
          if (action.destination) {
            await this.sendWebhook(action.destination, alert);
          }
          break;

        case 'email':
          if (action.destination) {
            Logger.info('AlertManager', `Would send email to ${action.destination}`);
            // TODO: Implementar envio de email
          }
          break;

        case 'slack':
          if (action.destination) {
            Logger.info('AlertManager', `Would send Slack message to ${action.destination}`);
            // TODO: Implementar envio para Slack
          }
          break;

        case 'sms':
          if (action.destination) {
            Logger.info('AlertManager', `Would send SMS to ${action.destination}`);
            // TODO: Implementar envio de SMS
          }
          break;
      }
    } catch (err) {
      Logger.error('AlertManager', `Error executing action ${action.type}: ${err}`);
    }
  }

  /**
   * Envia webhook
   */
  private async sendWebhook(url: string, alert: AlertTriggered): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.alertId,
          name: alert.name,
          level: alert.level,
          message: alert.message,
          value: alert.value,
          threshold: alert.threshold,
          timestamp: alert.timestamp,
        }),
      });

      if (!response.ok) {
        Logger.warn('AlertManager', `Webhook returned status ${response.status}`);
      }
    } catch (err) {
      Logger.error('AlertManager', `Error sending webhook: ${err}`);
    }
  }

  /**
   * Retorna status de um alerta
   */
  getAlertStatus(alertId: string) {
    const state = this.alerts.get(alertId);
    if (!state) {
      return null;
    }

    return {
      alertId,
      name: state.config.name,
      enabled: state.config.enabled,
      isFiring: state.isFiring,
      triggerCount: state.triggerCount,
      lastTriggered: state.lastTriggered,
      rule: state.config.rule,
    };
  }

  /**
   * Obtém todos os alertas ativos
   */
  getActiveAlerts(): AlertTriggered[] {
    return this.alertHistory.filter(
      (a) => a.timestamp.getTime() > Date.now() - 60 * 60_000 // Últimas 1 hora
    );
  }

  /**
   * Obtém histórico de alertas
   */
  getAlertHistory(limit: number = 50): AlertTriggered[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Reseta contador de um alerta
   */
  resetAlert(alertId: string): void {
    const state = this.alerts.get(alertId);
    if (state) {
      state.triggerCount = 0;
      state.isFiring = false;
      Logger.info('AlertManager', `Alert reset: ${alertId}`);
    }
  }

  /**
   * Habilita/desabilita um alerta
   */
  setAlertEnabled(alertId: string, enabled: boolean): void {
    const state = this.alerts.get(alertId);
    if (state) {
      state.config.enabled = enabled;
      Logger.info('AlertManager', `Alert ${enabled ? 'enabled' : 'disabled'}: ${alertId}`);
    }
  }

  /**
   * Adiciona listener para alertas
   */
  addAlertListener(listener: (alert: AlertTriggered) => Promise<void>): void {
    this.alertListeners.push(listener);
  }

  /**
   * Notifica listeners sobre alerta
   */
  async notifyListeners(alert: AlertTriggered): Promise<void> {
    for (const listener of this.alertListeners) {
      try {
        await listener(alert);
      } catch (err) {
        Logger.error('AlertManager', `Error in alert listener: ${err}`);
      }
    }
  }

  /**
   * Obtém estatísticas de alertas
   */
  getStats() {
    const active = this.alertHistory.filter(
      (a) => a.timestamp.getTime() > Date.now() - 60 * 60_000
    );

    return {
      totalAlerts: this.alerts.size,
      activeAlerts: this.alerts.size - Array.from(this.alerts.values()).filter((a) => !a.isFiring).length,
      historySize: this.alertHistory.length,
      recentAlerts: active.length,
      bySeverity: {
        critical: active.filter((a) => a.level === AlertLevel.CRITICAL).length,
        warning: active.filter((a) => a.level === AlertLevel.WARNING).length,
        info: active.filter((a) => a.level === AlertLevel.INFO).length,
      },
    };
  }

  /**
   * Limpa histórico
   */
  clearHistory(): void {
    this.alertHistory = [];
    Logger.info('AlertManager', 'Alert history cleared');
  }

  /**
   * Limpa recursos
   */
  async destroy(): Promise<void> {
    this.alerts.clear();
    this.alertHistory = [];
    this.alertListeners = [];
    Logger.info('AlertManager', 'AlertManager destroyed');
  }
}
