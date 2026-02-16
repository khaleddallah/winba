import type { Bounds, BoundsLimits } from '../bounds';

export interface Tnode {
  id: string;
}

export interface MApp extends Tnode {
  mwindows: MWindow[];
  activeWindowId: string | null; // Changed to nullable for safety
  removedWindowIds?: string[]; // Only tracks removed declarative window IDs
}

export interface MWindow extends Tnode {
  movable: boolean;
  resizable: boolean;
  bounds: Bounds;
  boundsLimits?: BoundsLimits;
  zIndex: number;
  isDeclarative?: boolean;
  isHeaderVisible?: boolean;
  mtabs: MTab[]; // if empty or null (though array is better), window is "invisible" or empty
}

export interface MTab extends Tnode {
  title: string;
  visible: boolean;
  active: boolean;
}
