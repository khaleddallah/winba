import type { IEventBus, EventHandler } from '$lib/types';

export class EventBus implements IEventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();

  on<T>(event: string, handler: EventHandler<T>): () => void {
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
