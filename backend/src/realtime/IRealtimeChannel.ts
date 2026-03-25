/**
 * Realtime Channel
 * Abstração de canal de comunicação
 * Pode ser implementado com WebSocket, Firebase, Redis Pub/Sub, etc
 */

import { RealtimeEvent } from './RealtimeEvents';

/**
 * Identificador de um subscriber único
 * Pode ser um WebSocket connection ID, uma sessão do cliente, etc
 */
export type SubscriberId = string;

/**
 * Callback executado quando um evento é entregue ao subscriber
 */
export type EventHandler = (event: RealtimeEvent) => void | Promise<void>;

/**
 * Representa uma subscrição de um cliente a um canal
 */
export interface Subscription {
  subscriberId: SubscriberId;
  channelId: string;
  handler: EventHandler;
  createdAt: Date;
}

/**
 * Interface de um canal realtime
 * Abstração que permitirá trocar entre polling, WebSocket, etc
 */
export interface IRealtimeChannel {
  /**
   * ID único do canal
   * Ex: 'ride:ride-123', 'driver:driver-456', 'passenger:passenger-789'
   */
  channelId: string;

  /**
   * Inscrever um cliente para receber eventos
   */
  subscribe(subscriberId: SubscriberId, handler: EventHandler): Subscription;

  /**
   * Desinscrever um cliente
   */
  unsubscribe(subscriberId: SubscriberId): void;

  /**
   * Publicar um evento para todos os inscritos no canal
   */
  publish(event: RealtimeEvent): Promise<void>;

  /**
   * Retornar lista de subscribers ativos
   */
  getActiveSubscribers(): SubscriberId[];

  /**
   * Limpar o canal (destruir)
   */
  destroy(): Promise<void>;
}
