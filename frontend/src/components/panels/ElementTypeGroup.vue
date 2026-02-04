<template>
  <div class="element-type-group">
    <div class="group-header" @click="toggleCollapse">
      <span class="collapse-icon">{{ isCollapsed ? '▶' : '▼' }}</span>
      <span class="group-title">{{ title }} ({{ elements.length }})</span>
    </div>
    
    <div v-if="!isCollapsed" class="group-content">
      <div
        v-for="element in elements"
        :key="element.id"
        class="element-item"
        :class="{ 'element-selected': selectionStore.isSelected(element.id), 'element-hidden': !element.visible }"
        @click="emit('select', element.id)"
        @mouseenter="handleMouseEnter(element.id)"
        @mouseleave="handleMouseLeave()"
      >
        <button
          class="visibility-btn"
          @click.stop="emit('toggleVisibility', element.id)"
          :title="element.visible ? 'Hide' : 'Show'"
        >
          {{ element.visible ? '👁' : '👁‍🗨' }}
        </button>
        <span class="element-label" v-html="formatElementLabel(element.label)"></span>
        <span v-if="element.properties" class="element-properties">{{ element.properties }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSelectionStore } from '@/stores/selectionStore';
import { formatElementLabel } from '@/utils/formatUtils';

interface Element {
  id: string;
  label: string;
  type: string;
  visible: boolean;
  properties?: string;
}

const props = defineProps<{
  title: string;
  elements: Element[];
  selectedId?: string | null; // Deprecated: use selectionStore instead
}>();

const emit = defineEmits<{
  select: [elementId: string];
  toggleVisibility: [elementId: string];
}>();

const selectionStore = useSelectionStore();
const isCollapsed = ref(false);

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

function handleMouseEnter(elementId: string) {
  // TODO: Emit highlight event
}

function handleMouseLeave() {
  // TODO: Clear highlight
}
</script>

<style scoped>
.element-type-group {
  margin-bottom: 6px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background: #fafafa;
  border-radius: 2px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  color: #666;
  transition: background 0.2s;
}

.group-header:hover {
  background: #f0f0f0;
}

.collapse-icon {
  font-size: 9px;
  color: #999;
  width: 10px;
  display: inline-block;
}

.group-content {
  padding-left: 16px;
  margin-top: 2px;
}

.element-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  margin: 1px 0;
  border-radius: 2px;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.2s;
}

.element-item:hover {
  background: #f5f5f5;
}

.element-item.element-selected {
  background: #e0e7ff;
  border-left: 2px solid #4f46e5;
  padding-left: 4px;
}

.element-item.element-hidden {
  opacity: 0.5;
}

.visibility-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  line-height: 1;
  transition: opacity 0.2s;
}

.visibility-btn:hover {
  opacity: 0.7;
}

.element-label {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.element-properties {
  font-size: 10px;
  color: #888;
}
</style>
