<script lang="ts">
  import { onMount, onDestroy, setContext } from "svelte";
  import { AppStore, bringToFront, updateWindow, groupWindows, ungroupTab, setActiveTab, registerWindow } from "$lib/core/AppStore";
  import type { MWindow, MTab } from "$lib/types/winAppModel";
  import type { Bounds } from "$lib/types/bounds";
  import { get } from 'svelte/store';
  import Tab from "./Tab.svelte";
  import { getContext } from "svelte";
  import { mountTabNode, moveTabNodeToStash } from "$lib/core/TabPortal";
  
  // Props for declarative usage
  export let id: string;
  export let bounds: Bounds;
  export let movable: boolean = true;
  export let resizable: boolean = true;
  export let zIndex: number = 1;
  export let declarative: boolean = true;
  
  setContext("windowId", id);

  const registerDeclarative = getContext('registerDeclarative') as ((id: string) => void) | undefined;
  if (declarative && registerDeclarative) {
      registerDeclarative(id);
  }
  
  // Register immediately so tabs can find us
  registerWindow({
      id,
      movable,
      resizable,
      bounds,
      zIndex,
      mtabs: [] // Tabs will register themselves
  });

  onMount(() => {
      // If window already exists in store (persistence), the store version takes precedence for state
      // but we registered to ensure it's there. The registerWindow logic handles merge.
  });
  
  // Reactive derived state from store
  $: config = $AppStore.mwindows.find(w => w.id === id) as MWindow;
  
  // Use store config if available, fallback to props (e.g. before store update or if removed)
  $: currentBounds = config?.bounds || bounds;
  $: isActive = $AppStore.activeWindowId === id;
  $: currentZIndex = config?.zIndex || zIndex;
  $: tabs = config?.mtabs || [];
  $: activeTab = tabs.find(t => t.active) || tabs[0]; 

  let contentEl: HTMLElement;
  let lastMountedTabId: string | null = null;

  $: if (!declarative && contentEl) {
    const nextTabId = activeTab?.id ?? null;
    if (lastMountedTabId && lastMountedTabId !== nextTabId) {
      moveTabNodeToStash(lastMountedTabId);
    }
    contentEl.replaceChildren();
    if (nextTabId) {
      mountTabNode(nextTabId, contentEl);
    }
    lastMountedTabId = nextTabId;
  }

  let windowEl: HTMLElement;
  let hoveredDropHeader: HTMLElement | null = null;
  let hoveredDropWindowId: string | null = null;
  let isDragging = false;
  let isResizing = false;
  let resizeHandle: string = "";
  let startX = 0;
  let startY = 0;
  let startBounds = { x: 0, y: 0, w: 0, h: 0 };
  
  // Snapping state
  type Guide = { type: "x" | "y"; value: number; pos: number; length?: number };
  let snapGuides: Guide[] = [];
  let isAltPressed = false;
  const SNAP_THRESHOLD = 8;
  
  // Tab tear-off state
  let isTearingTab = false;
  let tearTabId: string | null = null;
  let tearStartX = 0;
  let tearStartY = 0;
  const TEAR_THRESHOLD = 40;

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Alt") isAltPressed = true;
  }

  function handleKeyUp(e: KeyboardEvent) {
    if (e.key === "Alt") isAltPressed = false;
  }

  function onMouseDown(e: MouseEvent) {
    if (!config) return;
    bringToFront(id);

    if (
      config.movable &&
      (e.target as HTMLElement).closest(".window-header")
    ) {
      startDrag(e);
    }
  }

  function startDrag(e: MouseEvent) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startBounds = { ...currentBounds };

    if (windowEl) {
      windowEl.style.pointerEvents = 'none';
    }

    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
  }

  function onDragMove(e: MouseEvent) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newX = startBounds.x + dx;
    let newY = startBounds.y + dy;

    const viewport = getViewportBounds();
    const otherWindows = getOtherWindowsBounds();

    if (!isAltPressed) {
      const snap = calculateSnapMove(
        newX,
        newY,
        currentBounds.w,
        currentBounds.h,
        viewport,
        otherWindows,
      );
      newX = snap.x;
      newY = snap.y;
      snapGuides = snap.guides;
    } else {
      snapGuides = [];
    }

    newX = Math.max(0, Math.min(newX, viewport.w - currentBounds.w));
    newY = Math.max(0, Math.min(newY, viewport.h - currentBounds.h));

    updateWindow(id, { bounds: { ...currentBounds, x: newX, y: newY } });

    const next = findDropHeader(e.clientX, e.clientY);
    if (hoveredDropHeader && hoveredDropHeader !== next?.header) {
      hoveredDropHeader.classList.remove('drop-target');
    }
    if (next?.header && next.windowId !== hoveredDropWindowId) {
      next.header.classList.add('drop-target');
    }
    hoveredDropHeader = next?.header ?? null;
    hoveredDropWindowId = next?.windowId ?? null;
  }

  function onDragEnd(e: MouseEvent) {
    isDragging = false;
    snapGuides = [];
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);

    if (hoveredDropHeader) {
      hoveredDropHeader.classList.remove('drop-target');
    }
    hoveredDropHeader = null;
    hoveredDropWindowId = null;

    if (windowEl) {
      windowEl.style.pointerEvents = '';
    }
    
    const dropTarget = findDropTarget(e.clientX, e.clientY);
    if (dropTarget && dropTarget !== id) {
        groupWindows(dropTarget, id);
    }
  }
  
  function findDropTarget(x: number, y: number): string | null {
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
          const header = el.closest('.window-header');
          if (header) {
             const win = header.closest('.window') as HTMLElement;
             const wid = win?.dataset.windowId;
             if (wid && wid !== id) return wid;
          }
      }
      return null;
  }

  function findDropHeader(x: number, y: number): { windowId: string; header: HTMLElement } | null {
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
          const header = el.closest('.window-header') as HTMLElement | null;
          if (!header) continue;
          const win = header.closest('.window') as HTMLElement | null;
          const wid = win?.dataset.windowId;
          if (wid && wid !== id) return { windowId: wid, header };
      }
      return null;
  }

  function startResize(e: MouseEvent, handle: string) {
    if (!config?.resizable) return;
    e.stopPropagation();
    bringToFront(id);

    isResizing = true;
    resizeHandle = handle;
    startX = e.clientX;
    startY = e.clientY;
    startBounds = { ...currentBounds };

    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
  }

  function onResizeMove(e: MouseEvent) {
    if (!isResizing) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let { x, y, w, h } = startBounds;
    
    if (resizeHandle.includes('e')) w += dx;
    if (resizeHandle.includes('w')) { x += dx; w -= dx; }
    if (resizeHandle.includes('s')) h += dy;
    if (resizeHandle.includes('n')) { y += dy; h -= dy; }
    
    const limits = config.boundsLimits || {};
    const minW = limits.minW || 200;
    const minH = limits.minH || 150;
    const maxW = limits.maxW || Infinity;
    const maxH = limits.maxH || Infinity;

    let newX = startBounds.x;
    let newY = startBounds.y;
    let newW = startBounds.w;
    let newH = startBounds.h;

    if (resizeHandle.includes("e")) newW = startBounds.w + dx;
    if (resizeHandle.includes("w")) {
      newW = startBounds.w - dx;
      newX = startBounds.x + dx;
    }
    if (resizeHandle.includes("s")) newH = startBounds.h + dy;
    if (resizeHandle.includes("n")) {
      newH = startBounds.h - dy;
      newY = startBounds.y + dy;
    }

    if (newW < minW) {
      if (resizeHandle.includes("w")) newX = startBounds.x + startBounds.w - minW;
      newW = minW;
    }
    if (newH < minH) {
      if (resizeHandle.includes("n")) newY = startBounds.y + startBounds.h - minH;
      newH = minH;
    }
    newW = Math.min(newW, maxW);
    newH = Math.min(newH, maxH);

    const viewport = getViewportBounds();
    const otherWindows = getOtherWindowsBounds();

    if (!isAltPressed) {
      const snap = calculateSnapResize(
        newX, newY, newW, newH,
        viewport, otherWindows, resizeHandle
      );
      newX = snap.x;
      newY = snap.y;
      newW = snap.w;
      newH = snap.h;
      snapGuides = snap.guides;
    } else {
      snapGuides = [];
    }
    
    if (newX < 0) { newW += newX; newX = 0; }
    if (newY < 0) { newH += newY; newY = 0; }
    if (newX + newW > viewport.w) newW = viewport.w - newX;
    if (newY + newH > viewport.h) newH = viewport.h - newY;

    updateWindow(id, { bounds: { x: newX, y: newY, w: newW, h: newH } });
  }

  function onResizeEnd() {
    isResizing = false;
    snapGuides = [];
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeEnd);
  }
  
  function onTabMouseDown(e: MouseEvent, tabId: string) {
    if (tabs.length === 1 && config.movable) {
        // If only one tab, treat as moving the window
        startDrag(e);
        return;
    }
    
    e.stopPropagation();
    isTearingTab = true;
    tearTabId = tabId;
    tearStartX = e.clientX;
    tearStartY = e.clientY;
    window.addEventListener('mousemove', onTabTearMove);
    window.addEventListener('mouseup', onTabTearEnd);
  }
  
  function onTabTearMove(e: MouseEvent) {
    if (!isTearingTab) return;
    const dist = Math.hypot(e.clientX - tearStartX, e.clientY - tearStartY);
    if (dist > TEAR_THRESHOLD) {
        if (tearTabId) {
            ungroupTab(id, tearTabId, { x: e.clientX, y: e.clientY, w: 400, h: 300 });
        }
        cleanupTear();
    }
  }
  
  function onTabTearEnd() {
    if (isTearingTab && tearTabId) {
        setActiveTab(id, tearTabId);
    }
    cleanupTear();
  }
  
  function cleanupTear() {
      isTearingTab = false;
      tearTabId = null;
      window.removeEventListener('mousemove', onTabTearMove);
      window.removeEventListener('mouseup', onTabTearEnd);
  }

  function getViewportBounds() {
    return { w: window.innerWidth, h: window.innerHeight };
  }

  function getOtherWindowsBounds() {
    const store = get(AppStore);
    return store.mwindows
      .filter((w) => w.id !== id)
      .map((w) => w.bounds);
  }

  function calculateSnapMove(
    x: number, y: number, w: number, h: number,
    viewport: { w: number; h: number },
    others: { x: number; y: number; w: number; h: number }[],
  ) {
    const guides: Guide[] = [];
    const xSnaps: Array<{ value: number; pos: number; dist: number }> = [];
    const ySnaps: Array<{ value: number; pos: number; dist: number }> = [];

    xSnaps.push({ value: 0, pos: 0, dist: Math.abs(x) });
    xSnaps.push({ value: viewport.w - w, pos: viewport.w, dist: Math.abs(viewport.w - w - x) });
    ySnaps.push({ value: 0, pos: 0, dist: Math.abs(y) });
    ySnaps.push({ value: viewport.h - h, pos: viewport.h, dist: Math.abs(viewport.h - h - y) });

    others.forEach((b) => {
      xSnaps.push({ value: b.x + b.w, pos: b.x + b.w, dist: Math.abs(b.x + b.w - x) });
      xSnaps.push({ value: b.x - w, pos: b.x, dist: Math.abs(b.x - w - x) });
      xSnaps.push({ value: b.x + b.w / 2 - w / 2, pos: b.x + b.w / 2, dist: Math.abs(b.x + b.w / 2 - w / 2 - x) });

      ySnaps.push({ value: b.y + b.h, pos: b.y + b.h, dist: Math.abs(b.y + b.h - y) });
      ySnaps.push({ value: b.y - h, pos: b.y, dist: Math.abs(b.y - h - y) });
      ySnaps.push({ value: b.y + b.h / 2 - h / 2, pos: b.y + b.h / 2, dist: Math.abs(b.y + b.h / 2 - h / 2 - y) });
    });

    const bestX = xSnaps.filter((s) => s.dist < SNAP_THRESHOLD).sort((a, b) => a.dist - b.dist)[0];
    const bestY = ySnaps.filter((s) => s.dist < SNAP_THRESHOLD).sort((a, b) => a.dist - b.dist)[0];

    if (bestX) guides.push({ type: "x", value: bestX.value, pos: bestX.pos });
    if (bestY) guides.push({ type: "y", value: bestY.value, pos: bestY.pos });

    return {
      x: bestX ? bestX.value : x,
      y: bestY ? bestY.value : y,
      guides,
    };
  }

  function calculateSnapResize(
    x: number, y: number, w: number, h: number,
    viewport: { w: number; h: number },
    others: { x: number; y: number; w: number; h: number }[],
    handle: string,
  ) {
    const guides: Guide[] = [];
    let snapX = x; let snapY = y; let snapW = w; let snapH = h;
    const resizingLeft = handle.includes("w");
    const resizingRight = handle.includes("e");
    const resizingTop = handle.includes("n");
    const resizingBottom = handle.includes("s");

    if (resizingLeft || resizingRight) {
        const snaps = [];
        const left = x; const right = x + w;
        
        if (resizingLeft) {
            snaps.push({ val: 0, type: 'viewport', newX: 0, newW: w + x });
            others.forEach(b => {
                snaps.push({ val: b.x + b.w, newX: b.x + b.w, newW: w + x - (b.x + b.w) });
                snaps.push({ val: b.x, newX: b.x, newW: w + x - b.x });
            });
             const best = snaps.map(s => ({...s, dist: Math.abs(s.val - left)})).filter(s => s.dist < SNAP_THRESHOLD).sort((a,b)=>a.dist-b.dist)[0];
             if(best) { snapX = best.newX; snapW = best.newW; guides.push({type:'x', value: snapX, pos: best.val}); }
        }
        if (resizingRight) {
            snaps.push({ val: viewport.w, newW: viewport.w - x });
            others.forEach(b => {
                snaps.push({ val: b.x, newW: b.x - x });
                snaps.push({ val: b.x + b.w, newW: b.x + b.w - x });
            });
            const best = snaps.map(s => ({...s, dist: Math.abs(s.val - right)})).filter(s => s.dist < SNAP_THRESHOLD).sort((a,b)=>a.dist-b.dist)[0];
            if(best) { snapW = best.newW; guides.push({type:'x', value: snapX+snapW, pos: best.val}); }
        }
    }

    if (resizingTop || resizingBottom) {
        const snaps = [];
        const top = y; const bottom = y + h;
        
        if (resizingTop) {
            snaps.push({ val: 0, newY: 0, newH: h + y });
            others.forEach(b => {
                snaps.push({ val: b.y + b.h, newY: b.y + b.h, newH: h + y - (b.y + b.h) });
                snaps.push({ val: b.y, newY: b.y, newH: h + y - b.y });
            });
             const best = snaps.map(s => ({...s, dist: Math.abs(s.val - top)})).filter(s => s.dist < SNAP_THRESHOLD).sort((a,b)=>a.dist-b.dist)[0];
             if(best) { snapY = best.newY; snapH = best.newH; guides.push({type:'y', value: snapY, pos: best.val}); }
        }
        if (resizingBottom) {
            snaps.push({ val: viewport.h, newH: viewport.h - y });
            others.forEach(b => {
                snaps.push({ val: b.y, newH: b.y - y });
                snaps.push({ val: b.y + b.h, newH: b.y + b.h - y });
            });
            const best = snaps.map(s => ({...s, dist: Math.abs(s.val - bottom)})).filter(s => s.dist < SNAP_THRESHOLD).sort((a,b)=>a.dist-b.dist)[0];
            if(best) { snapH = best.newH; guides.push({type:'y', value: snapY+snapH, pos: best.val}); }
        }
    }

    return { x: snapX, y: snapY, w: snapW, h: snapH, guides };
  }

</script>

{#if config}
  <div
    bind:this={windowEl}
    role="dialog"
    aria-label={id}
    tabindex="-1"
    class="window absolute bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded shadow-lg overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
    class:active={isActive}
    data-window-id={id}
    style="
      left: {currentBounds.x}px;
      top: {currentBounds.y}px;
      width: {currentBounds.w}px;
      height: {currentBounds.h}px;
      z-index: {currentZIndex};
    "
    on:mousedown={onMouseDown}
  >
    <!-- Header / Tab Bar -->
    <div class="window-header flex bg-gray-100 dark:bg-slate-900 border-b border-gray-300 dark:border-slate-700 h-8 items-center px-2 select-none">
       <!-- Drag Handle / Menu -->
       <button class="mr-2 cursor-grab text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">≡</button>
       
       <!-- Tabs -->
       <div class="flex-1 flex overflow-hidden">
         {#each tabs as tab (tab.id)}
           <button
             class="px-3 py-1 text-sm border-r border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 truncate max-w-[150px]"
             class:bg-white={tab.active}
             class:dark:bg-slate-800={tab.active}
             class:font-bold={tab.active}
             on:mousedown={(e) => onTabMouseDown(e, tab.id)}
           >
             {tab.title}
           </button>
         {/each}
       </div>
    </div>

    <!-- Content -->
    <div class="window-content flex-1 overflow-auto relative bg-white dark:bg-slate-800">
      {#if declarative}
        <slot />
      {:else}
        <div class="w-full h-full" bind:this={contentEl}></div>
      {/if}
    </div>

    <!-- Resize Handles -->
    {#if config.resizable}
      <div
        role="button"
        tabindex="0"
        aria-label="Resize North"
        class="resize-handle n absolute top-0 left-0 right-0 h-1 cursor-ns-resize"
        on:mousedown={(e) => startResize(e, 'n')}
      ></div>
      <div
        role="button"
        tabindex="0"
        aria-label="Resize South"
        class="resize-handle s absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize"
        on:mousedown={(e) => startResize(e, 's')}
      ></div>
      <div
        role="button"
        tabindex="0"
        aria-label="Resize East"
        class="resize-handle e absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize"
        on:mousedown={(e) => startResize(e, 'e')}
      ></div>
      <div
        role="button"
        tabindex="0"
        aria-label="Resize West"
        class="resize-handle w absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize"
        on:mousedown={(e) => startResize(e, 'w')}
      ></div>
      <!-- Corners -->
      <div
        role="button"
        tabindex="0"
        aria-label="Resize North-West"
        class="resize-handle n w absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50"
        on:mousedown={(e) => startResize(e, 'nw')}
      ></div>
      <div
        role="button"
        tabindex="0"
        aria-label="Resize North-East"
        class="resize-handle n e absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-50"
        on:mousedown={(e) => startResize(e, 'ne')}
      ></div>
      <div
        role="button"
        tabindex="0"
        aria-label="Resize South-West"
        class="resize-handle s w absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-50"
        on:mousedown={(e) => startResize(e, 'sw')}
      ></div>
      <div
        role="button"
        tabindex="0"
        aria-label="Resize South-East"
        class="resize-handle s e absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50"
        on:mousedown={(e) => startResize(e, 'se')}
      ></div>
    {/if}
    
    {#each snapGuides as guide}
        {#if guide.type === 'x'}
            <div class="absolute top-0 bottom-0 w-px bg-blue-500 z-50 pointer-events-none" style="left: {guide.pos - currentBounds.x}px;"></div>
        {:else}
            <div class="absolute left-0 right-0 h-px bg-blue-500 z-50 pointer-events-none" style="top: {guide.pos - currentBounds.y}px;"></div>
        {/if}
    {/each}
  </div>
{/if}

<style>
  .window.active {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  :global(.dark) .window.active {
    border-color: #60a5fa;
  }

  :global(.window-header.drop-target) {
    box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.8);
    background: rgba(59, 130, 246, 0.10);
    transition: box-shadow 120ms ease, background-color 120ms ease;
  }
  :global(.dark .window-header.drop-target) {
    box-shadow: inset 0 0 0 2px rgba(96, 165, 250, 0.85);
    background: rgba(96, 165, 250, 0.12);
  }
</style>
