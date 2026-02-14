<script>
    import App from '$lib/components/App.svelte';
    import Window from '$lib/components/Window.svelte';
    import Tab from '$lib/components/Tab.svelte';
    
    // Example event handlers
    function handleButtonClick() {
        alert("Button clicked in declarative tab!");
    }
</script>

<div class="h-screen w-screen overflow-hidden">
    <App>
        <!-- Window 1 -->
        <Window 
            id="window1" 
            bounds={{x: 100, y: 100, w: 400, h: 300}} 
            resizable={true} 
            movable={true}
        >
            <Tab id="tab1" title="Tab 1" active={true}>
                <div class="p-4 space-y-4">
                    <h2 class="text-xl font-bold">Declarative Content</h2>
                    <p>This content is injected via slots!</p>
                    <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" on:click={handleButtonClick}>
                        Click Me
                    </button>
                </div>
            </Tab>
            <Tab id="tab2" title="Tab 2">
                <div class="p-4">
                    <h2 class="text-xl font-bold">Another Tab</h2>
                    <p>Content for tab 2.</p>
                </div>
            </Tab>
        </Window>

        <!-- Window 2 -->
        <Window 
            id="window2" 
            bounds={{x: 550, y: 100, w: 400, h: 300}}
        >
            <Tab id="tab3" title="Tab 3" active={true}>
                <div class="p-4">
                    <p>Window 2 content.</p>
                </div>
            </Tab>
        </Window>
        
        <!-- Optional: Any overlays or global UI -->
        <div class="absolute top-4 right-16 z-50 pointer-events-none">
             <!-- Settings Menu placeholder or actual component if we import it -->
        </div>
    </App>
</div>
