<template>
  <div class="elements-panel">
    <div class="panel-header">
      <h3>Elements</h3>
    </div>
    <div class="panel-content">
      <div v-if="allElements.length === 0" class="empty-state">
        <p>No elements yet. Start constructing!</p>
      </div>
      <div v-else class="elements-sections">
        <!-- 2D Elements Section -->
        <div v-if="has2DElements" class="elements-section">
          <h4 class="section-title">2D Elements</h4>
          
          <!-- Points -->
          <ElementGroup
            v-if="pointElements.length > 0"
            title="Points"
            :elements="pointElements"
            @element-click="handleElementClick"
          />
          
          <!-- Segments -->
          <ElementGroup
            v-if="segmentElements.length > 0"
            title="Segments"
            :elements="segmentElements"
            @element-click="handleElementClick"
          />
          
          <!-- Lines -->
          <ElementGroup
            v-if="lineElements.length > 0"
            title="Lines"
            :elements="lineElements"
            @element-click="handleElementClick"
          />
          
          <!-- Circles -->
          <ElementGroup
            v-if="circleElements.length > 0"
            title="Circles"
            :elements="circleElements"
            @element-click="handleElementClick"
          />
        </div>

        <!-- 3D Elements Section (placeholder for future) -->
        <div v-if="has3DElements" class="elements-section">
          <h4 class="section-title">3D Elements</h4>
          <p class="placeholder-text">3D elements coming in future phases</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useWorldStore } from '../../stores/worldStore';
import ElementGroup from './ElementGroup.vue';
import type { Element2D } from '../../types/ElementTypes';

const worldStore = useWorldStore();

/**
 * Get all 2D elements from the world store
 */
const allElements = computed(() => worldStore.allElements2D);

/**
 * Filter elements by kind
 */
const pointElements = computed(() =>
  allElements.value.filter(el => el.kind.startsWith('Point2D'))
);

const segmentElements = computed(() =>
  allElements.value.filter(el => el.kind === 'Segment2DByPoints')
);

const lineElements = computed(() =>
  allElements.value.filter(el => el.kind.startsWith('Line2D'))
);

const circleElements = computed(() =>
  allElements.value.filter(el => el.kind.startsWith('Circle2D'))
);

/**
 * Check if there are any 2D elements
 */
const has2DElements = computed(() => allElements.value.length > 0);

/**
 * Check if there are any 3D elements (not implemented yet)
 */
const has3DElements = computed(() => false);

/**
 * Emits when an element is clicked
 */
const emit = defineEmits<{
  'element-click': [element: Element2D];
}>();

function handleElementClick(element: Element2D) {
  emit('element-click', element);
}
</script>

<style scoped>
.elements-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-background);
  border-right: 1px solid var(--color-border);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-background-soft);
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-heading);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: var(--color-text-muted);
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

.elements-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.elements-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin: 0;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-heading);
  background-color: var(--color-background-soft);
  border-radius: 4px;
}

.placeholder-text {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--color-text-muted);
  font-style: italic;
}
</style>
