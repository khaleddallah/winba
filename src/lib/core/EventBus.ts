import type { Unsubscriber } from 'svelte/store';

export type EventHandler<T = any> = (payload: T) => void;

export interface IEventBus {
  on<T = any>(event: string, handler: EventHandler<T>): Unsubscriber;
  emit<T = any>(event: string, payload: T): void;
  off(event: string, handler: EventHandler): void;
}

export class EventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();

  on<T>(event: string, handler: EventHandler<T>): Unsubscriber {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<any>);
    return () => this.off(event, handler);
  }

  emit<T>(event: string, payload: T): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler<any>);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }
}
