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
import 'katex/dist/katex.min.css';
import './assets/styles/katex-overrides.css';

// Register all element descriptors for dynamic action descriptions
import { registerAllDescriptors } from './domain/world/descriptors/registerDescriptors';
registerAllDescriptors();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

app.mount('#app');
