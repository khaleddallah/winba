import { writable, get, type Writable } from 'svelte/store';
import { type WinConfig } from '../types';

// Store state interface
interface WindowsState {
  winConfigs: WinConfig[];
  windowOrder: string[];
  activeWindowId: string | null;
}

// Initial state
const initialState: WindowsState = {
  winConfigs: [],
  windowOrder: [],
  activeWindowId: null
};

// Create the store
export const WindowsStore: Writable<WindowsState> = writable(initialState);

// Exported functions

export function registerWindow(windowId: string, config: WinConfig): void {
  WindowsStore.update(store => {
    if (store.winConfigs.find(w => w.id === windowId)) {
      console.warn(`Window ${windowId} already registered`);
      return store;
    }

    return {
      ...store,
      winConfigs: [...store.winConfigs, config],
      windowOrder: [...store.windowOrder, windowId]
    };
  });
}

export function unregisterWindow(windowId: string): void {
  WindowsStore.update(store => {
    const remainingConfigs = store.winConfigs.filter(w => w.id !== windowId);
    const newOrder = store.windowOrder.filter(id => id !== windowId);

    return {
      ...store,
      winConfigs: remainingConfigs,
      windowOrder: newOrder,
      activeWindowId: store.activeWindowId === windowId 
        ? (newOrder.length > 0 ? newOrder[newOrder.length - 1] : null)
        : store.activeWindowId
    };
  });
}

export function updateWindowConfig(windowId: string, config: WinConfig): void {
  WindowsStore.update(store => {
    const windowExists = store.winConfigs.some(w => w.id === windowId);
    if (!windowExists) {
      console.warn(`Window ${windowId} not found`);
      return store;
    }

    
    return {
      ...store,
      winConfigs: store.winConfigs.map(w => 
        w.id === windowId ? { ...w, ...config } : w
      )
    };
  });
}

export function bringToFront(windowId: string): void {
  WindowsStore.update(store => {
    if (!store.winConfigs.find(w => w.id === windowId)) return store;

    const newOrder = store.windowOrder.filter(id => id !== windowId);
    newOrder.push(windowId);

    return {
      ...store,
      windowOrder: newOrder,
      activeWindowId: windowId
    };
  });
}

export function setActiveWindow(windowId: string | null): void {
  WindowsStore.update(store => ({
    ...store,
    activeWindowId: windowId
  }));
}

export function getWindowZIndex(windowId: string): number {
  const store = get(WindowsStore);
  const index = store.windowOrder.indexOf(windowId);
  return index >= 0 ? index + 1 : 0;
}

export function getAllWindows(): WinConfig[] {
  return get(WindowsStore).winConfigs;
}

export function getWindowConfig(windowId: string): WinConfig | undefined {
  return get(WindowsStore).winConfigs.find(w => w.id === windowId);
}
