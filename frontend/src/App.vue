<template>
  <div id="app" class="diedrico-app">
    <header class="app-header">
      <h1>Diedrico - Dihedral Learning MVP</h1>
      <PlaneSelector />
    </header>
    
    <div class="app-main">
      <aside class="app-sidebar">
        <MainToolbar />
      </aside>
      
      <main class="app-workspace">
        <Workspace2D />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Workspace2D from './components/workspace/Workspace2D.vue';
import MainToolbar from './components/toolbars/MainToolbar.vue';
import PlaneSelector from './components/toolbars/PlaneSelector.vue';
</script>

<style scoped>
.diedrico-app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background-color: #2c3e50;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 60px;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.app-sidebar {
  width: 200px;
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
  padding: 1rem;
  overflow-y: auto;
}

.app-workspace {
  flex: 1;
  background-color: #ffffff;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
