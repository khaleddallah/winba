import { writable, type Unsubscriber } from 'svelte/store';
import type { AppStore } from '$lib/types';

// Internal store type
interface StoreValue {
  [key: string]: any;
}

export function createAppStore(): AppStore {
  const store = writable<StoreValue>({});

  function get<T>(key: string): T | undefined {
    let value: T | undefined;
    store.subscribe((s) => { value = s[key]; })();
    return value;
  }

  function set<T>(key: string, value: T): void {
    store.update((s) => ({ ...s, [key]: value }));
  }

  function subscribe(key: string, callback: (value: any) => void): Unsubscriber {
    return store.subscribe((s) => callback(s[key]));
  }

  return { get, set, subscribe };
}
