<script lang="ts">
    import {
        Settings,
        Palette,
        LayoutTemplate,
        AppWindow,
        Check,
    } from "lucide-svelte";
    import type { MApp } from "$lib/types/winAppModel";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import {
        setTheme,
        getTheme,
        THEMES,
        type Theme,
    } from "$lib/core/ThemeSwitcher";
    import { AppStore, updateWindow } from "$lib/core/AppStore"; // Updated import
    import { onMount, getContext } from "svelte";
    import { get } from 'svelte/store';

    let currentTheme: Theme = $state("light");
    let fileInput: HTMLInputElement;

    function handleThemeChange(newTheme: Theme) {
        setTheme(newTheme);
        currentTheme = newTheme;
    }

    // Current toggleWindowVisibility logic needs update for MTabs
    // If we toggle visibility, it probably means hiding the whole window?
    // Or maybe just minimizing? 
    // The original code toggled `visible` on `WinConfig`.
    // MWindow doesn't have `visible` prop based on `docs/model.md`?
    // Let's check `MWindow` definition again.
    // > # MWindow -> Tnode
    // > - movable : Boolean
    // > - resizable : Boolean
    // > - bounds: Bounds
    // > - boundsLimits: BoundsLimits
    // > - zIndex : Integer
    // > - mtabs : MTab 0..N
    // > // if not mtabs, then window is invisible
    
    // Ah, visibility is implied by having tabs. 
    // But maybe we want to hide it without destroying tabs?
    // The model says "if not mtabs, then window is invisible".
    // This implies we can't easily toggle visibility without removing tabs or adding a `visible` prop to MWindow.
    // For now, let's assume we can add `visible` to MWindow or rely on MTab visibility.
    // Let's assume we want to toggle visibility of the *window*. 
    // I entered `visible` property in `MTab` but not `MWindow` in my types file.
    // Wait, let me check my types again.
    // MTab has `visible?: boolean`.
    
    function toggleTabVisibility(tabId: string) {
        // find the tab in app store
        console.log("Tab visibility toggled", tabId);
        const app = get(AppStore);
        for (const mwindow of app.mwindows) {
            for (const mtab of mwindow.mtabs) {
                if (mtab.id === tabId) {
                    mtab.visible = !(mtab.visible ?? true);
                    console.log("2 Tab visibility toggled", mtab.id, mtab.visible);
                    AppStore.set({ ...app });
                    return;
                }
            }
        }


        // Toggle visibility of ALL tabs in the window?
        // Or if we modify MWindow to have `visible` (even if not in original model doc, it's practical).
        // Let's stick to modifying tabs for now as per model hint or add visible to window if needed.
        // Actually, let's re-read the model doc provided in context.
        // "if not mtabs, then window is invisible"
        // This suggests visibility IS the presence of tabs. 
        // So to "hide", we maybe should clear tabs? But that loses state.
        // Let's add a `minimized` or `visible` property to MWindow in our implementation for practicality, 
        // even if it diverges slightly from the strict model doc (which might be high level).
        // OR, we can just toggle `visible` on all tabs.
        
        // Let's iterate tabs and toggle them?
        // Or, let's just add `visible` to MWindow in the store update if the type allows.
        // I defined MWindow in `src/lib/types/winAppModel/index.ts`.
        // I should probably add `visible` to MWindow there if I want to support this feature properly.
        // For now, let's assume I can't change the type definition easily right now without another step.
        // I'll skip this feature or implement it by toggling all tabs.
        
        // Wait, I can update the type definition! usage id: 0 in task.md was already done.
        // I'll assume MWindow has `visible` for now or add it.
        // Actually, looking at my `src/lib/types/winAppModel/index.ts` content I wrote earlier:
        // export interface MWindow extends Tnode { ... }
        // It does NOT have `visible`.
        // I will assume for now we don't support hiding windows in this refactor unless user asked.
        // The original `SettingsMenu` had it.
        // Let's update `MWindow` type to include `visible?: boolean` to support this legacy feature.
        
        // But I can't update types in this file write.
        // I will comment out the visibility toggle for now or implement a placeholder.
        // console.warn("Window visibility toggle not yet implemented for MApp model");
    }

    const exportLayout = () => {
        const appState = get(AppStore);
        const json = JSON.stringify(appState, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "layout-config.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importLayout = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const newState = JSON.parse(e.target?.result as string) as MApp;
                // Basic validation
                if (!newState.mwindows) {
                    console.error("Invalid layout file format: expected MApp structure");
                    return;
                }
                
                AppStore.set(newState);

            } catch (err) {
                console.error("Failed to parse layout file", err);
            }
        };
        reader.readAsText(file);
        // Reset file input
        target.value = '';
    };

    onMount(() => {
        currentTheme = getTheme();
    });
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger class="outline-none">
        <button
            class="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
            aria-label="Settings"
        >
            <Settings class="h-5 w-5" />
        </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="w-56">
        <DropdownMenu.Label>Settings</DropdownMenu.Label>
        <DropdownMenu.Separator />

        <!-- Themes -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
                <Palette class="mr-2 h-4 w-4" />
                <span>Themes</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                <DropdownMenu.RadioGroup value={currentTheme}>
                    {#each THEMES as theme}
                        <DropdownMenu.RadioItem
                            value={theme}
                            onclick={() => handleThemeChange(theme)}
                        >
                            <span class="capitalize">{theme}</span>
                        </DropdownMenu.RadioItem>
                    {/each}
                </DropdownMenu.RadioGroup>
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <!-- Layout -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
                <LayoutTemplate class="mr-2 h-4 w-4" />
                <span>Layout</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                <DropdownMenu.Item onclick={() => fileInput.click()}>
                    Import
                </DropdownMenu.Item>
                <DropdownMenu.Item onclick={exportLayout}>
                    Export
                </DropdownMenu.Item>
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <!-- Window List -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
                <AppWindow class="mr-2 h-4 w-4" />
                <span>Tabs</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                {#each $AppStore.mwindows as window}
                    {#each window.mtabs as tab}
                        <DropdownMenu.CheckboxItem
                            checked={tab.visible ?? true} 
                            onclick={(e) => {
                                e.preventDefault();
                                toggleTabVisibility(tab.id);
                            }}
                        >
                            {tab.id}  
                            <!-- {window.mtabs.map(t => t.title).join(', ')} -->
                        </DropdownMenu.CheckboxItem>
                    {/each}
                {/each}
                {#if $AppStore.mwindows.length === 0}
                    <DropdownMenu.Item disabled
                        >No windows open</DropdownMenu.Item
                    >
                {/if}
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
    </DropdownMenu.Content>
</DropdownMenu.Root>

<!-- Hidden file input for import - must be outside DropdownMenu so it persists in the DOM -->
<input
    bind:this={fileInput}
    type="file"
    accept=".json"
    class="hidden"
    onchange={importLayout}
/>
