import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useWorldStore } from './stores/worldStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Initialize workspace with origin point O on app startup
const worldStore = useWorldStore()
worldStore.initializeWorkspace()

app.mount('#app')
