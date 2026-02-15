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
  
  // We need this reactive statement to re-run when declarativeWindows changes.
  // But Set mutation doesn't trigger it.
  // So we depend on $declarativeIdsString
  $: _ids = $declarativeIdsString;
  $: dynamicWindows = $AppStore.mwindows.filter(w => !declarativeWindows.has(w.id));
</script>

<div class="app-container relative w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
  <!-- Declarative Model: Render children directly -->
  <slot />
  
  <!-- Dynamic Windows (e.g. from tearing) -->
  {#each dynamicWindows as win (win.id)}
      <WindowComponent id={win.id} bounds={win.bounds} declarative={false} />
  {/each}
</div>
