<script lang="ts">
    import {
        Settings,
        Palette,
        LayoutTemplate,
        AppWindow,
        Check,
    } from "lucide-svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import {
        setTheme,
        getTheme,
        THEMES,
        type Theme,
    } from "$lib/core/ThemeSwitcher";
    import { WindowsStore, updateWindowConfig } from "$lib/core/WindowsStore";
    import { onMount } from "svelte";

    let currentTheme: Theme = $state("light");

    function handleThemeChange(newTheme: Theme) {
        setTheme(newTheme);
        currentTheme = newTheme;
    }

    function toggleWindowVisibility(id: string, currentVisible?: boolean) {
        // If undefined, it means it's currently visible (default), so toggle to false
        const newVisible = currentVisible === false ? true : false;
        updateWindowConfig(id, { visible: newVisible });
    }

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

        <!-- Layout (Placeholder) -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger disabled>
                <LayoutTemplate class="mr-2 h-4 w-4" />
                <span>Layout</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                <DropdownMenu.Item>Default</DropdownMenu.Item>
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <!-- Window List -->
        <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>
                <AppWindow class="mr-2 h-4 w-4" />
                <span>Window</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
                {#each Object.entries($WindowsStore.winConfigs) as [id, config]}
                    <DropdownMenu.CheckboxItem
                        checked={config.visible !== false}
                        onclick={(e) => {
                            e.preventDefault();
                            toggleWindowVisibility(id, config.visible);
                        }}
                    >
                        {config.title}
                    </DropdownMenu.CheckboxItem>
                {/each}
                {#if Object.keys($WindowsStore.winConfigs).length === 0}
                    <DropdownMenu.Item disabled
                        >No windows open</DropdownMenu.Item
                    >
                {/if}
            </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
    </DropdownMenu.Content>
</DropdownMenu.Root>
