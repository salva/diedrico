<template>
  <div id="app" class="diedrico-app">
    <div class="workspace-container">
      <h1>Diedrico - Dihedral Learning MVP</h1>
      <p>Workspace loading...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Empty workspace shell - will be populated in later phases
</script>

<style scoped>
.diedrico-app {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.workspace-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: #f5f5f5;
}

h1 {
  color: #333;
  margin-bottom: 1rem;
}

p {
  color: #666;
}
</style>
