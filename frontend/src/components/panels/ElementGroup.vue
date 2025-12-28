<template>
  <div class="element-group">
    <div class="group-header" @click="toggleExpanded">
      <span class="expand-icon" :class="{ expanded: isExpanded }">▶</span>
      <span class="group-title">{{ title }}</span>
      <span class="element-count">({{ elements.length }})</span>
    </div>
    <div v-if="isExpanded" class="group-content">
      <div
        v-for="element in elements"
        :key="element.id"
        class="element-item"
        :class="{
          'infeasible': element.infeasible
        }"
        @click="handleElementClick(element)"
      >
        <span class="element-name"><SubscriptText :text="element.name || element.id" /></span>
        <span v-if="element.infeasible" class="infeasible-badge" title="Infeasible constraint">!</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Element2D } from '../../types/ElementTypes';
import SubscriptText from '../common/SubscriptText.vue';

interface Props {
  title: string;
  elements: Element2D[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'element-click': [element: Element2D];
}>();

const isExpanded = ref(true);

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function handleElementClick(element: Element2D) {
  emit('element-click', element);
}
</script>

<style scoped>
.element-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.group-header:hover {
  background-color: var(--color-background-mute);
}

.expand-icon {
  display: inline-block;
  margin-right: 6px;
  font-size: 10px;
  transition: transform 0.2s ease;
  color: var(--color-text-muted);
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.group-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-heading);
}

.element-count {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-left: 4px;
}

.group-content {
  margin-top: 4px;
  margin-left: 16px;
  padding-left: 8px;
  border-left: 2px solid var(--color-border);
}

.element-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  margin-bottom: 2px;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.element-item:hover {
  background-color: var(--color-background-soft);
  border-color: var(--color-border-hover);
}

.element-item.infeasible {
  border-color: var(--color-error);
  background-color: rgba(255, 0, 0, 0.05);
}

.element-name {
  flex: 1;
  color: var(--color-text);
  font-family: monospace;
}

.element-item.infeasible .element-name {
  color: var(--color-error);
}

.infeasible-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background-color: var(--color-error);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  margin-left: 8px;
}
</style>
