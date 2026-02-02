/**
 * main.ts - Application entry point
 * 
 * Initializes the Vue 3 application with:
 * - Vue 3 Composition API
 * - TypeScript support
 * - Pinia state management
 * 
 * Per Constitution Principle I, the application follows a layered architecture:
 * - Presentation Layer: Vue components (this layer)
 * - Application Layer: Services, composables (to be added)
 * - Domain Layer: Business logic (World, Point, etc.)
 * - Data Layer: Storage, persistence (to be added)
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/styles/main.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

app.mount('#app');

// Debug helpers - expose to window for console access
// Usage: window.dumpDependencies() or window.dumpDependencies('proj_plane_')
if (import.meta.env.DEV) {
  (window as any).THREE = await import('three');

  (window as any).dumpDependencies = (filterPrefix?: string) => {
    // Import dynamically to avoid circular dependencies
    import('./stores/worldStore').then(({ useWorldStore }) => {
      const worldStore = useWorldStore();
      const depService = worldStore.world.getDependencyService();
      depService.dumpDependencyGraph(filterPrefix);
    });
  };
  
  (window as any).traceInvalidation = (elementId: string) => {
    // Import dynamically to avoid circular dependencies
    import('./stores/worldStore').then(({ useWorldStore }) => {
      const worldStore = useWorldStore();
      const depService = worldStore.world.getDependencyService();
      return depService.traceInvalidation(elementId);
    });
  };
  
  (window as any).getWorld = () => {
    return import('./stores/worldStore').then(({ useWorldStore }) => {
      const worldStore = useWorldStore();
      return worldStore.world;
    });
  };
  
  console.log('Debug helpers available:');
  console.log('  window.dumpDependencies() - dump full dependency graph');
  console.log('  window.dumpDependencies("proj_plane_") - filter by prefix');
  console.log('  window.traceInvalidation("element_id") - trace invalidation propagation');
  console.log('  window.getWorld() - get World instance (returns Promise)');
}

