
### State Management (AppStore)
Share state across components using the centralized `AppStore`.
```typescript
import { AppStore } from '$lib/core/AppStore';

const appStore = new AppStore();

// Set a value
appStore.set('user:preferences', { theme: 'dark' });

// Subscribe to changes
const unsubscribe = appStore.subscribe('user:preferences', (value) => {
    console.log('Preferences updated:', value);
});
```

### Event Bus
Use `EventBus` for transient, fire-and-forget messaging between components.
```typescript
import { EventBus } from '$lib/core/EventBus';

const bus = new EventBus();

// Emit an event
bus.emit('file:saved', { filename: 'doc.txt' });

// Listen for an event
bus.on('file:saved', (payload) => {
    console.log('File saved:', payload.filename);
});
```

### Adding a New Theme
1. Open `src/app.css`.
2. Define a new theme variant using CSS variables (using Oklch colors for best results).
3. Register the theme in `src/lib/core/ThemeSwitcher.ts` by adding it to the `THEMES` array.
4. The theme will automatically appear in the Settings menu.
