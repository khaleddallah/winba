<script lang="ts">
  import { onMount, getContext } from "svelte";
  import { AppStore, registerTab } from "$lib/core/AppStore";
  import type { MTab } from "$lib/types/winAppModel";
  import { onDestroy } from "svelte";
  import { registerTabNode, unregisterTabNode } from "$lib/core/TabPortal";
  
  export let id: string;
  export let title: string;
  // component prop is less relevant now as content is in slot, but kept for model compatibility
  export let component: string = ""; 
  export let active: boolean = false;
  export let visible: boolean = true;
  
  const contextWindowId = getContext("windowId") as string | undefined;
  
  // Register immediately
  if (contextWindowId) {
    registerTab(contextWindowId, {
      id,
      title,
      visible,
      active,
      component
    });
  }

  onMount(() => {
  });
  
  // Reactive derived state to check if this tab is active in the store
  $: ownerWindowId = ($AppStore.mwindows.find(w => w.mtabs.some(t => t.id === id))?.id) ?? contextWindowId;
  $: win = ownerWindowId ? $AppStore.mwindows.find(w => w.id === ownerWindowId) : undefined;
  $: tabState = win?.mtabs.find(t => t.id === id);
  $: isActive = tabState?.active ?? active;
  $: isVisible = tabState?.visible ?? visible;

  let tabEl: HTMLElement;

  $: if (tabEl) {
    registerTabNode(id, tabEl);
  }

  onDestroy(() => {
    unregisterTabNode(id, tabEl);
  });

</script>

<div
  bind:this={tabEl}
  class="tab-content w-full h-full p-4 overflow-auto text-slate-800 dark:text-slate-200"
  style="display: {isActive && isVisible ? 'block' : 'none'};"
>
  <slot />
</div>
