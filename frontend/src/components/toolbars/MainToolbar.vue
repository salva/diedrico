<template>
  <div class="main-toolbar">
    <div class="toolbar-section">
      <h3 class="toolbar-title">Tools</h3>
      <div class="tool-buttons">
        <button
          v-for="tool in tools"
          :key="tool.id"
          :class="['tool-button', { active: isToolActive(tool.id) }]"
          :title="tool.name"
          @click="selectTool(tool.id)"
        >
          <span class="tool-icon">{{ tool.icon }}</span>
          <span class="tool-label">{{ tool.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToolStore } from '@/stores/toolStore';

const toolStore = useToolStore();

interface Tool {
  id: string;
  name: string;
  icon: string;
  category: string;
}

// Define available tools
const tools: Tool[] = [
  { id: 'select', name: 'Select', icon: '↖', category: 'basic' },
  { id: 'point-free', name: 'Point', icon: '●', category: 'point' },
  { id: 'point-intersection', name: 'Intersection Point', icon: '⊗', category: 'point' },
  { id: 'segment', name: 'Segment', icon: '─', category: 'line' },
  { id: 'line', name: 'Line', icon: '↔', category: 'line' },
  { id: 'circle-center-radius', name: 'Circle', icon: '○', category: 'circle' },
];

const isToolActive = (toolId: string) => {
  return toolStore.isToolActive(toolId);
};

const selectTool = (toolId: string) => {
  if (toolStore.isToolActive(toolId)) {
    toolStore.clearTool();
  } else {
    toolStore.setActiveTool(toolId);
  }
};
</script>

<style scoped>
.main-toolbar {
  background-color: #ffffff;
  border-right: 1px solid #ddd;
  padding: 16px;
  width: 200px;
  overflow-y: auto;
}

.toolbar-section {
  margin-bottom: 24px;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  margin: 0 0 12px 0;
  letter-spacing: 0.5px;
}

.tool-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
  color: #333;
  text-align: left;
}

.tool-button:hover {
  background-color: #e8e8e8;
  border-color: #ccc;
}

.tool-button.active {
  background-color: #2196f3;
  border-color: #2196f3;
  color: #ffffff;
}

.tool-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

.tool-label {
  flex: 1;
}
</style>
