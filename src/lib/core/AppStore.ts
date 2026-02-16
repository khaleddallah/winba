import { writable, get, type Writable } from 'svelte/store';
import type { MApp, MWindow, MTab } from '../types/winAppModel';
import type { Bounds } from '../types/bounds';

const STORAGE_KEY = 'wm7_app_state';

function sanitizeState(state: MApp): MApp {
  const removed = new Set(state.removedWindowIds ?? []);
  const seenTabs = new Set<string>();
  const mwindows = state.mwindows
    .filter(w => !removed.has(w.id))
    .map(w => {
      const mtabs = w.mtabs.filter(t => {
        if (seenTabs.has(t.id)) return false;
        seenTabs.add(t.id);
        return true;
      });
      return { ...w, mtabs };
    })
    .filter(w => w.mtabs.length > 0);

  const activeWindowId = mwindows.some(w => w.id === state.activeWindowId) ? state.activeWindowId : (mwindows[0]?.id ?? null);

  return {
    ...state,
    mwindows,
    activeWindowId,
    removedWindowIds: [...removed]
  };
}

// Initial state
const initialState: MApp = {
  id: 'app-root',
  mwindows: [],
  activeWindowId: null,
  removedWindowIds: []
};

// Create the store
export const AppStore: Writable<MApp> = writable(initialState); // Export as Writable for direct access if needed

// Helper to save state
function saveState(state: MApp) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save app state', e);
  }
}

// Load state from storage
export function loadState(): MApp | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Failed to load app state', e);
    return null;
  }
}

// Initialize store (call this from App.svelte on mount)
export function initApp(defaultConfig?: MApp) {
  const stored = loadState();
  if (stored) {
    AppStore.set(sanitizeState(stored));
  } else if (defaultConfig) {
    AppStore.set(sanitizeState(defaultConfig));
  }
  
  // Subscribe to changes to persist state
  AppStore.subscribe(state => {
      saveState(state);
  });
}


// ── Actions ─────────────────────────────────────────────────────────

export function registerWindow(window: MWindow) {
  AppStore.update(app => {
    if (app.removedWindowIds?.includes(window.id)) {
      return app;
    }
    const existing = app.mwindows.find(w => w.id === window.id);
    if (existing) {
        // If window exists, we update it with the new properties (e.g. from props)
        // but preserve state that might have changed (like bounds, zIndex if we want persistence).
        // However, user asked for "AppStore is source of truth".
        // If we reload, we want persistence.
        // If we change code (add a window), we want it to appear.
        return {
            ...app,
            mwindows: app.mwindows.map(w => w.id === window.id ? { 
                ...existing, 
                ...window, 
                bounds: existing.bounds, 
                mtabs: existing.mtabs,
                isHeaderVisible: existing.isHeaderVisible ?? window.isHeaderVisible,
                zIndex: existing.zIndex ?? window.zIndex
            } : w)
            // We keep existing bounds/zIndex to respect user interaction (persistence).
            // But we update other props like movable/resizable if changed in code.
            // If the window is new in code but old in storage, this merges them.
        };
    }
    return {
      ...app,
      mwindows: [...app.mwindows, window]
    };
  });
}

export function registerTab(windowId: string, tab: MTab) {
  AppStore.update(app => {
    if (app.removedWindowIds?.includes(windowId)) {
      return app;
    }

    const existingOwner = app.mwindows.find(w => w.mtabs.some(t => t.id === tab.id));
    if (existingOwner && existingOwner.id !== windowId) {
      // Tab already belongs to another window (e.g. was torn off / merged). Do not duplicate it
      // back into the declarative window on reload.
      return app;
    }

    const win = app.mwindows.find(w => w.id === windowId);
    if (!win) {
        console.warn(`Cannot register tab ${tab.id}: Window ${windowId} not found`);
        return app;
    }
    
    // Check if tab exists
    const existingTab = win.mtabs.find(t => t.id === tab.id);
    if (existingTab) {
        // Update tab properties
        return {
            ...app,
            mwindows: app.mwindows.map(w => w.id === windowId ? {
                ...w,
                mtabs: w.mtabs.map(t => t.id === tab.id ? {
                  ...existingTab,
                  ...tab,
                  visible: existingTab.visible ?? tab.visible,
                  active: existingTab.active ?? tab.active,
                } : t)
            } : w)
        };
    }
    
    // Add new tab
    return {
        ...app,
        mwindows: app.mwindows.map(w => w.id === windowId ? {
            ...w,
            mtabs: [...w.mtabs, tab]
        } : w)
    };
  });
}

export function unregisterWindow(windowId: string) {
  AppStore.update(app => ({
    ...app,
    mwindows: app.mwindows.filter(w => w.id !== windowId)
  }));
}

export function updateWindow(windowId: string, changes: Partial<MWindow>) {
  AppStore.update(app => ({
    ...app,
    mwindows: app.mwindows.map(w => 
      w.id === windowId ? { ...w, ...changes } : w
    )
  }));
}

export function bringToFront(windowId: string) {
  AppStore.update(app => {
    const window = app.mwindows.find(w => w.id === windowId);
    if (!window) return app;

    // Re-calculate Z-indices
    // We want to move the target window to the top (highest z-index)
    // Simply sorting by z-index and then re-assigning might be enough, 
    // but here we want to explicitly make `windowId` the highest.
    
    // Simple approach: get all windows, remove target, append target, re-assign z-indices
    const others = app.mwindows.filter(w => w.id !== windowId).sort((a, b) => a.zIndex - b.zIndex);
    const updatedWindows = [...others, window].map((w, index) => ({
      ...w,
      zIndex: index + 1
    }));

    return {
      ...app,
      mwindows: updatedWindows,
      activeWindowId: windowId
    };
  });
}

// ── Tab / Grouping Logic ────────────────────────────────────────────

function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

export function groupWindows(targetWindowId: string, sourceWindowId: string) {
  AppStore.update(app => {
    const targetWin = app.mwindows.find(w => w.id === targetWindowId);
    const sourceWin = app.mwindows.find(w => w.id === sourceWindowId);

    if (!targetWin || !sourceWin) return app;

    // Move all tabs from source to target
    // If source has no tabs (shouldn't happen in valid state), treat source itself as content?
    // The model implies MWindow has MTabs. 
    
    // We need to transfer source's tabs to target.
    const sourceTabs = sourceWin.mtabs;
    
    // Deactivate current tabs in target (optional, or keep one active?)
    // Typically we want the dropped tab to become active.
    const targetTabs = targetWin.mtabs.map(t => ({ ...t, active: false }));
    const newTabs = sourceTabs.map(t => ({ ...t, active: true })); // Activate new tabs
    // If multiple tabs were in source, maybe only one was active? 
    // Let's keep source's active state relative to each other, but ensure one is active.
    
    // Better logic:
    // 1. Deactivate all tabs in target.
    // 2. Add source tabs. Use source's active tab as the new active tab.
    
    const updatedTargetTabs = targetWin.mtabs.map(t => ({...t, active: false}));
    const updatedSourceTabs = sourceWin.mtabs; // Keep their active state or force one?
    
    // Actually, if we merge, we usually want the dragged one to be active.
    
    const mergedTabs = [...updatedTargetTabs, ...updatedSourceTabs];
    
    // Update target window
    const updatedTargetWin: MWindow = {
        ...targetWin,
        mtabs: mergedTabs
    };
    
    // Remove source window
    const remainingWindows = app.mwindows.filter(w => w.id !== sourceWindowId).map(w => 
        w.id === targetWindowId ? updatedTargetWin : w
    );
    
    // Only track removal if the window was declarative
    const removedWindowIds = app.removedWindowIds ?? [];
    const nextRemoved = sourceWin.isDeclarative 
        ? [...new Set([...removedWindowIds, sourceWindowId])]
        : removedWindowIds;
    
    return {
        ...app,
        mwindows: remainingWindows,
        activeWindowId: targetWindowId,
        removedWindowIds: nextRemoved
    };
  });
}

export function ungroupTab(windowId: string, tabId: string, newBounds: Bounds) {
    AppStore.update(app => {
        const sourceWin = app.mwindows.find(w => w.id === windowId);
        if (!sourceWin) return app;

        const tabToMove = sourceWin.mtabs.find(t => t.id === tabId);
        if (!tabToMove) return app;

        // Remove tab from source window
        const updatedSourceTabs = sourceWin.mtabs.filter(t => t.id !== tabId);
        
        // If source window has no tabs left, it should probably be removed? 
        // Or kept empty? Model says "if not mtabs, then window is invisible".
        // Let's remove it if empty to keep it clean, unless it's a special window.
        
        // Create new window for the tab
        const newWindow: MWindow = {
            id: generateId(), // New window ID
            movable: true,
            resizable: true,
            bounds: newBounds,
            boundsLimits: sourceWin.boundsLimits, // Inherit limits?
            zIndex: app.mwindows.length + 1,
            isDeclarative: false,
            mtabs: [{ ...tabToMove, active: true }]
        };

        const remainingWindows = app.mwindows.map(w => {
            if (w.id === windowId) {
                // Determine new active tab if we removed the active one
                let newTabs = updatedSourceTabs;
                if (tabToMove.active && newTabs.length > 0) {
                     newTabs = newTabs.map((t, i) => i === 0 ? { ...t, active: true } : t);
                }
                return { ...w, mtabs: newTabs };
            }
            return w;
        }).filter(w => w.mtabs.length > 0); // Remove empty windows

        return {
            ...app,
            mwindows: [...remainingWindows, newWindow],
            activeWindowId: newWindow.id
        };
    });
}

export function setActiveTab(windowId: string, tabId: string) {
    AppStore.update(app => ({
        ...app,
        mwindows: app.mwindows.map(w => {
            if (w.id === windowId) {
                return {
                    ...w,
                    mtabs: w.mtabs.map(t => ({
                        ...t,
                        active: t.id === tabId
                    }))
                };
            }
            return w;
        })
    }));
}
