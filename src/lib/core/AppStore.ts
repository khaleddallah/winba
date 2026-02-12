import { writable, type Unsubscriber } from 'svelte/store';

type StoreValue = { [key: string]: any };

export class AppStore {
  private store = writable<StoreValue>({});

  get<T>(key: string): T | undefined {
    let value: T | undefined;
    this.store.subscribe((s) => { value = s[key]; })();
    return value;
  }

  set<T>(key: string, value: T): void {
    this.store.update((s) => ({ ...s, [key]: value }));
  }

  subscribe(key: string, callback: (value: any) => void): Unsubscriber {
    return this.store.subscribe((s) => callback(s[key]));
  }
}
