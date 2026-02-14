<script lang="ts">
  import { onMount, getContext } from "svelte";
  import { AppStore, registerTab } from "$lib/core/AppStore";
  import type { MTab } from "$lib/types/winAppModel";
  
  export let id: string;
  export let title: string;
  // component prop is less relevant now as content is in slot, but kept for model compatibility
  export let component: string = ""; 
  export let active: boolean = false;
  export let visible: boolean = false;
  
  const windowId = getContext("windowId") as string;
  
  // Register immediately
  if (windowId) {
      registerTab(windowId, {
          id,
          title,
          visible,
          active,
          component
      });
  } else {
      console.warn("Tab component used outside of Window context");
  }

  onMount(() => {
  });
  
  // Reactive derived state to check if this tab is active in the store
  $: win = $AppStore.mwindows.find(w => w.id === windowId);
  $: tabState = win?.mtabs.find(t => t.id === id);
  $: isActive = tabState?.active ?? active;

</script>

{#if isActive}
<div class="tab-content w-full h-full p-4 overflow-auto text-slate-800 dark:text-slate-200">
    <slot />
</div>
{/if}
