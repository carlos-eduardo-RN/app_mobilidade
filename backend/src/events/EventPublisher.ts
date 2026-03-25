/**
 * Event Publisher
 * Sistema de publicação de eventos (Observer Pattern)
 */

import { DomainEvent, EventType, EventHandler } from '../models/Events';
import { Logger } from '../utils/Logger';

export class EventPublisher {
  private subscribers: Map<EventType, EventHandler[]> = new Map();
  private eventHistory: DomainEvent[] = [];

  subscribe(eventType: EventType, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
    Logger.debug('EventPublisher', `Subscriber registered for ${eventType}`);
  }

  async publish(event: DomainEvent): Promise<void> {
    Logger.info('EventPublisher', `Publishing event: ${event.type}`, {
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
    });

    // Armazenar histórico (event sourcing ready)
    this.eventHistory.push(event);

    // Notificar subscribers
    const handlers = this.subscribers.get(event.type) || [];

    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        Logger.error('EventPublisher', `Handler error for ${event.type}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  getEventHistory(): DomainEvent[] {
    return [...this.eventHistory];
  }

  getEventHistoryFor(aggregateId: string): DomainEvent[] {
    return this.eventHistory.filter((e) => e.aggregateId === aggregateId);
  }
}
