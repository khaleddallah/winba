<script lang="ts">
  import { onMount } from 'svelte';
  import { AppStore, initApp } from '$lib/core/AppStore';
  import type { MApp } from '$lib/types/winAppModel';
  import WindowComponent from './Window.svelte'; // Renamed to avoid clash with global Window
  import Tab from './Tab.svelte';
  
  import { setContext } from 'svelte';
  
  export let defaultConfig: MApp | undefined = undefined; // Optional initial config
  
  const declarativeWindows = new Set<string>();
  setContext('registerDeclarative', (id: string) => {
      declarativeWindows.add(id);
      // Force update of local state if needed, but since we use Set and Svelte reactivity might not catch Set changes easily without reassignment
      // We can use a store or just rely on $AppStore derived check.
      // Better: we just need to know which IDs are declarative.
      // Since `declarativeWindows` is mutated during mount of children, 
      // we need to make it reactive or force re-eval.
      // Actually, children mount *after* App mount? No, before/during? 
      // Slots render in parent scope but mount order...
      // Safest: Use a svelte store for the set
  });

  import { writable } from 'svelte/store';
  const declarativeIdsString = writable(""); // simple hack to trigger updates
  
  setContext('registerDeclarative', (id: string) => {
      declarativeWindows.add(id);
      declarativeIdsString.set(Array.from(declarativeWindows).join(','));
  });

  // Initialize immediately so store is ready for children
  initApp(defaultConfig);

  onMount(() => {
      // initApp cleanup if needed, but for now we init once.
  });
  
  $: dynamicWindows = $AppStore.mwindows.filter(w => !declarativeWindows.has(w.id));
  // We need this reactive statement to re-run when declarativeWindows changes.
  // But Set mutation doesn't trigger it.
  // So we depend on $declarativeIdsString
  $: _ids = $declarativeIdsString; 
</script>

<div class="app-container relative w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
  <!-- Declarative Model: Render children directly -->
  <slot />
  
  <!-- Dynamic Windows (e.g. from tearing) -->
  {#each dynamicWindows as win (win.id)}
      <WindowComponent id={win.id} bounds={win.bounds}>
           <!-- 
             Dynamic windows created by tearing don't have declarative slots.
             They rely on `Tab` component's internal logic or `component` string.
             However, `Tab` component strictly renders `<slot />` only.
             So we need a way to render content for dynamic tabs.
             
             In this refactor, `Tab` checks if it's active.
             But here, we don't have `Tab` children for dynamic windows! 
             We iterate mtabs in window header, but CONTENT is missing.
             
             Fix: `Window.svelte` header iterates tabs.
             But `Window.svelte` content is `<slot />`.
             
             If we use `<Window>` here with empty slot, no content is shown.
             
             We need to reconstruct `Tab` components for dynamic windows.
           -->
           {#each win.mtabs as tab (tab.id)}
               <Tab id={tab.id} title={tab.title} component={tab.component} active={tab.active}>
                   <!-- Content? We don't have the original slot content. -->
                   <div class="p-4 text-gray-500 italic">
                       Dynamic Window Content (moved)
                       <br/>
                       Component: {tab.component || 'None'}
                   </div>
               </Tab>
           {/each}
      </WindowComponent>
  {/each}
</div>
