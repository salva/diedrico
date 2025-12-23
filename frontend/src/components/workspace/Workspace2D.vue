<template>
  <div class="workspace-2d" ref="containerRef">
    <svg
      ref="svgRef"
      class="workspace-svg"
      :width="width"
      :height="height"
    >
      <!-- Background grid -->
      <defs>
        <pattern
          id="grid"
          :width="gridSize"
          :height="gridSize"
          patternUnits="userSpaceOnUse"
        >
          <path
            :d="`M ${gridSize} 0 L 0 0 0 ${gridSize}`"
            fill="none"
            stroke="#e0e0e0"
            stroke-width="0.5"
          />
        </pattern>
      </defs>
      
      <!-- Grid background -->
      <rect
        width="100%"
        height="100%"
        fill="url(#grid)"
      />
      
      <!-- Main content group (transformed by zoom/pan) -->
      <g ref="mainGroupRef" class="main-content">
        <!-- Render all 2D elements on active plane -->
        <ElementRenderer
          v-for="element in elementsOnActivePlane"
          :key="element.id"
          :element="element"
        />
      </g>
      
      <!-- Overlay for UI elements (not transformed) -->
      <g class="overlay">
        <!-- Cursor feedback, selection boxes, etc. -->
      </g>
    </svg>
    
    <!-- Plane indicator -->
    <div class="plane-indicator">
      {{ activePlaneName }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type D3ZoomEvent } from 'd3-zoom';
import { useWorldStore } from '@/stores/worldStore';
import { useViewStore } from '@/stores/viewStore';
import ElementRenderer from './ElementRenderer.vue';
import type { Element2D } from '@/types/ElementTypes';

const worldStore = useWorldStore();
const viewStore = useViewStore();

// Component refs
const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const mainGroupRef = ref<SVGGElement | null>(null);

// Dimensions
const width = ref(800);
const height = ref(600);
const gridSize = 20;

// Compute elements on active plane
const elementsOnActivePlane = computed((): Element2D[] => {
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) return [];
  
  return worldStore.allElements2D.filter((el: Element2D) => el.planeId === activePlaneId);
});

const activePlaneName = computed(() => {
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) return '';
  
  const plane = worldStore.planes.find((p: any) => p.id === activePlaneId);
  return plane ? plane.label : '';
});

// Handle window resize
const updateDimensions = () => {
  if (containerRef.value) {
    width.value = containerRef.value.clientWidth;
    height.value = containerRef.value.clientHeight;
  }
};

// Setup D3 zoom behavior
const setupZoom = () => {
  if (!svgRef.value || !mainGroupRef.value) return;
  
  const svg = select(svgRef.value);
  const mainGroup = select(mainGroupRef.value);
  
  // Create zoom behavior
  const zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 10])  // Min and max zoom levels
    .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
      // Only apply zoom if not panning (Shift key not pressed)
      // Or if using mouse wheel (which is always zoom)
      mainGroup.attr('transform', event.transform.toString());
    });
  
  // Apply zoom behavior to SVG
  svg.call(zoomBehavior);
  
  // Set initial transform (centered)
  svg.call(zoomBehavior.transform, zoomIdentity.translate(width.value / 2, height.value / 2));
};

onMounted(() => {
  updateDimensions();
  window.addEventListener('resize', updateDimensions);
  setupZoom();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions);
});
</script>

<style scoped>
.workspace-2d {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #fafafa;
}

.workspace-svg {
  display: block;
  cursor: default;
}

.main-content {
  /* Transform will be applied by D3 zoom behavior */
}

.overlay {
  pointer-events: none;
}

.plane-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  pointer-events: none;
}
</style>
