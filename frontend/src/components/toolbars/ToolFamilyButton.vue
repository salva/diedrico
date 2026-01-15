<template>
  <div class="tool-family-button">
    <!-- Main button - activates last-used (or default) tool -->
    <button
      class="tool-button-main"
      :class="{ active: isAnyToolActive }"
      @click="activateLastUsed"
      :title="activeToolTooltip"
      :aria-label="activeToolConfig?.label || family.label"
    >
      <component :is="activeToolIcon" class="button-icon" />
    </button>
    
    <!-- Dropdown arrow button -->
    <button
      class="tool-button-dropdown"
      :class="{ active: isAnyToolActive, open: isDropdownOpen }"
      @click="toggleDropdown"
      :title="`Show all ${family.label} tools`"
      :aria-label="`Show all ${family.label} tools`"
    >
      <span class="dropdown-arrow">▼</span>
    </button>
    
    <!-- Dropdown menu -->
    <div v-if="isDropdownOpen" class="tool-dropdown-menu">
      <div
        v-for="tool in family.tools"
        :key="tool.id"
        class="tool-menu-item"
        :class="{ active: toolStore.isToolActive(tool.id as any) }"
        @click="selectTool(tool.id)"
      >
        <component :is="tool.icon" class="menu-icon" />
        <span class="tool-label">{{ tool.label }}</span>
        <span v-if="tool.shortcut" class="tool-shortcut">{{ tool.shortcut }}</span>
        <span v-if="toolStore.isToolActive(tool.id as any)" class="checkmark">✓</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ToolFamilyConfig } from '@/types/ToolConfig';
import { useToolStore } from '@/stores/toolStore';

// Props
const props = defineProps<{
  family: ToolFamilyConfig;
}>();

// Store
const toolStore = useToolStore();

// State
const isDropdownOpen = ref(false);

// Computed
const isAnyToolActive = computed(() => {
  return props.family.tools.some(tool => toolStore.isToolActive(tool.id as any));
});

const activeToolConfig = computed(() => {
  // Find currently active tool in family
  const activeTool = props.family.tools.find(tool => toolStore.isToolActive(tool.id as any));
  if (activeTool) return activeTool;
  
  // Otherwise, use last-used or default
  const lastUsed = toolStore.getLastUsedTool(props.family.id);
  if (lastUsed) {
    return props.family.tools.find(tool => tool.id === lastUsed);
  }
  
  // Fallback to default
  return props.family.tools.find(tool => tool.id === props.family.defaultTool);
});

const activeToolIcon = computed(() => {
  return activeToolConfig.value?.icon || props.family.icon;
});

const activeToolTooltip = computed(() => {
  return activeToolConfig.value?.tooltip || `${props.family.label} tools`;
});

// Methods
function activateLastUsed() {
  toolStore.activateToolFamily(props.family.id);
  isDropdownOpen.value = false;
}

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    console.log('[ToolFamilyButton] Dropdown opened for family:', props.family.id);
    console.log('[ToolFamilyButton] Tools in family:', props.family.tools);
  }
}

function selectTool(toolId: string) {
  console.log('[ToolFamilyButton] Selecting tool:', toolId);
  toolStore.selectSubTool(props.family.id, toolId);
  isDropdownOpen.value = false;
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.tool-family-button')) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.tool-family-button {
  position: relative;
  display: inline-flex;
  align-items: stretch;
}

.tool-button-main,
.tool-button-dropdown {
  height: 40px;
  border: 1px solid #e0e0e0;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-button-main {
  width: 40px;
  border-right: none;
  border-radius: 4px 0 0 4px;
  padding: 0;
}

.tool-button-dropdown {
  width: 16px;
  border-radius: 0 4px 4px 0;
  padding: 0;
  border-left: 1px solid #e0e0e0;
}

.button-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.tool-button-main:hover,
.tool-button-dropdown:hover {
  background: #f5f5f5;
  border-color: #bdbdbd;
}

.tool-button-main.active,
.tool-button-dropdown.active {
  background: #e3f2fd;
  border-color: #2196f3;
}

.tool-button-dropdown.open {
  background: #f0f0f0;
}

.dropdown-arrow {
  font-size: 8px;
  line-height: 1;
  transition: transform 0.2s;
  color: #757575;
}

.tool-button-dropdown.open .dropdown-arrow {
  transform: rotate(180deg);
}

/* Dropdown menu */
.tool-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 280px;
}

.tool-menu-item {
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.15s;
  border-bottom: 1px solid #eee;
  color: #333;
  white-space: nowrap;
}

.tool-menu-item:last-child {
  border-bottom: none;
}

.tool-menu-item:hover {
  background: #f5f5f5;
}

.tool-menu-item.active {
  background: #e3f2fd;
  color: #2196f3;
  font-weight: 500;
}

.menu-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.tool-menu-item .tool-label {
  flex: 1;
  font-size: 14px;
}

.tool-shortcut {
  margin-left: auto;
  font-size: 11px;
  color: #999;
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 3px;
}

.checkmark {
  margin-left: 8px;
  color: #2196f3;
  font-weight: bold;
  font-size: 14px;
}
</style>
