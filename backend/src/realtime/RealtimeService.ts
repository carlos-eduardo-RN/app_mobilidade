/**
 * Realtime Service
 * Gerencia canais e broadcast de eventos
 * Abstração central que funciona independente do mecanismo de delivery (polling, WebSocket, FCM)
 */

import { IRealtimeChannel, SubscriberId, EventHandler, Subscription } from './IRealtimeChannel';
import { RealtimeEvent } from './RealtimeEvents';
import { Logger } from '../utils/Logger';

/**
 * Implementação em memória de um canal realtime
 * Funciona para polling (armazena últimos eventos)
 * Será estendida/substituída por WebSocket later
 */
export class InMemoryRealtimeChannel implements IRealtimeChannel {
  channelId: string;
  private subscribers: Map<SubscriberId, EventHandler> = new Map();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistorySize: number = 50; // últimos 50 eventos

  constructor(channelId: string) {
    this.channelId = channelId;
    Logger.debug('InMemoryRealtimeChannel', 'Channel created', { channelId });
  }

  subscribe(subscriberId: SubscriberId, handler: EventHandler): Subscription {
    this.subscribers.set(subscriberId, handler);
    Logger.debug('InMemoryRealtimeChannel', 'Subscriber added', {
      channelId: this.channelId,
      subscriberId,
      totalSubscribers: this.subscribers.size,
    });

    return {
      subscriberId,
      channelId: this.channelId,
      handler,
      createdAt: new Date(),
    };
  }

  unsubscribe(subscriberId: SubscriberId): void {
    const removed = this.subscribers.delete(subscriberId);
    if (removed) {
      Logger.debug('InMemoryRealtimeChannel', 'Subscriber removed', {
        channelId: this.channelId,
        subscriberId,
        totalSubscribers: this.subscribers.size,
      });
    }
  }

  async publish(event: RealtimeEvent): Promise<void> {
    // Armazenar no histórico para polling
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Entregar para todos os inscritos (síncrono agora, será async com WebSocket)
    const handlers = Array.from(this.subscribers.values());
    await Promise.all(handlers.map((handler) => handler(event)));

    Logger.debug('InMemoryRealtimeChannel', 'Event published', {
      channelId: this.channelId,
      eventType: event.type,
      totalSubscribers: this.subscribers.size,
    });
  }

  getActiveSubscribers(): SubscriberId[] {
    return Array.from(this.subscribers.keys());
  }

  getEventHistory(since?: Date): RealtimeEvent[] {
    if (!since) {
      return [...this.eventHistory];
    }
    return this.eventHistory.filter((event) => this.getEventTimestamp(event) >= since);
  }

  private getEventTimestamp(event: RealtimeEvent): Date {
    if ('timestamp' in event) {
      return event.timestamp;
    }

    return event.location.timestamp;
  }

  async destroy(): Promise<void> {
    this.subscribers.clear();
    this.eventHistory = [];
    Logger.debug('InMemoryRealtimeChannel', 'Channel destroyed', { channelId: this.channelId });
  }
}

/**
 * Realtime Service - Gerencia todos os canais
 */
export class RealtimeService {
  private channels: Map<string, IRealtimeChannel> = new Map();

  /**
   * Obter ou criar canal para uma corrida
   * Padrão: 'ride:{rideId}'
   */
  getRideChannel(rideId: string): IRealtimeChannel {
    const channelId = `ride:${rideId}`;
    if (!this.channels.has(channelId)) {
      this.channels.set(channelId, new InMemoryRealtimeChannel(channelId));
    }
    return this.channels.get(channelId)!;
  }

  /**
   * Obter ou criar canal para um motorista
   * Padrão: 'driver:{driverId}'
   */
  getDriverChannel(driverId: string): IRealtimeChannel {
    const channelId = `driver:${driverId}`;
    if (!this.channels.has(channelId)) {
      this.channels.set(channelId, new InMemoryRealtimeChannel(channelId));
    }
    return this.channels.get(channelId)!;
  }

  /**
   * Obter ou criar canal para um passageiro
   * Padrão: 'passenger:{passengerId}'
   */
  getPassengerChannel(passengerId: string): IRealtimeChannel {
    const channelId = `passenger:${passengerId}`;
    if (!this.channels.has(channelId)) {
      this.channels.set(channelId, new InMemoryRealtimeChannel(channelId));
    }
    return this.channels.get(channelId)!;
  }

  /**
   * Publicar evento em múltiplos canais (ex: ride + driver + passenger)
   */
  async publishToMultipleChannels(channelIds: string[], event: RealtimeEvent): Promise<void> {
    await Promise.all(
      channelIds.map((channelId) => {
        const channel = this.channels.get(channelId);
        return channel ? channel.publish(event) : Promise.resolve();
      })
    );
  }

  /**
   * Destruir todos os canais (shutdown)
   */
  async destroy(): Promise<void> {
    const channels = Array.from(this.channels.values());
    await Promise.all(channels.map((channel) => channel.destroy()));
    this.channels.clear();
    Logger.info('RealtimeService', 'All channels destroyed');
  }
}
