<template>
  <div class="svg-canvas-container">
    <svg
      ref="svgElement"
      class="svg-canvas"
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Background grid -->
      <defs>
        <pattern
          id="grid"
          width="50"
          height="50"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 50 0 L 0 0 0 50"
            fill="none"
            stroke="#e0e0e0"
            stroke-width="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      
      <!-- Reference axes (canvas origin) -->
      <line x1="0" y1="400" x2="800" y2="400" stroke="#ccc" stroke-width="1" stroke-dasharray="5,5" />
      <line x1="400" y1="0" x2="400" y2="800" stroke="#ccc" stroke-width="1" stroke-dasharray="5,5" />
      
      <!-- Render projection planes (P_H, P_V) using generic plane rendering -->
      <rect
        v-for="plane in planes"
        :key="plane.id"
        v-bind="renderPlane(plane, canvasOriginX, canvasOriginY)"
      />
      
      <!-- Render hinge line (HL_HV) using generic line rendering -->
      <line
        v-if="hingeLineStart && hingeLineEnd"
        v-bind="renderLine(
          hingeLineStart,
          hingeLineEnd,
          'HL_HV',
          { color: '#666666', width: 2, dashArray: '8,4' },
          canvasOriginX,
          canvasOriginY
        )"
      />
      
      <!-- Render all points (including origin O) using generic point rendering -->
      <circle
        v-for="point in points"
        :key="point.id"
        v-bind="renderPoint(point, canvasOriginX, canvasOriginY)"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
/**
 * SvgCanvas.vue - Main 2D drawing canvas component
 * 
 * This is the primary workspace where all 2D geometric elements are rendered.
 * Uses SVG for crisp, scalable vector graphics per Constitution Principle IV.
 * 
 * Key requirements:
 * - SVG element (not HTML Canvas) per ui-spec.md
 * - All rendering uses plane intrinsic coordinates with transformations
 * - Generic rendering algorithms (no special cases for fixed elements)
 * - Will support pan/zoom viewport transformations in Phase 6
 * - Elements rendered using principle-based algorithms (Constitution Principle IV)
 * 
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#canvas-component
 */

import { ref, computed, onMounted } from 'vue';
import { World } from '@/domain/world/World';
import { renderPoint, renderPlane, renderLine } from '@/services/RenderService';

const svgElement = ref<SVGSVGElement | null>(null);

// Default canvas dimensions (logical coordinates)
// These will be dynamically adjusted with viewport transformations in Phase 6
const canvasWidth = ref(800);
const canvasHeight = ref(800);
const canvasOriginX = 400;
const canvasOriginY = 400;

// World instance (will be managed by store in later phases)
const world = new World();

// Initialize fixed elements on mount
onMounted(() => {
  world.initializeFixedElements();
});

// Computed properties to reactively access World data
const planes = computed(() => world.getAllPlanes());
const points = computed(() => world.getAllPoints());

// Hinge line endpoints (HL_HV extends along X-axis at origin)
const hingeLineStart = computed(() => ({
  u: -300,
  v: 0,
  planeId: 'plane_H'
}));

const hingeLineEnd = computed(() => ({
  u: 300,
  v: 0,
  planeId: 'plane_H'
}));
</script>

<style scoped>
.svg-canvas-container {
  flex: 1;
  display: flex;
  background-color: #ffffff;
  overflow: hidden;
  position: relative;
}

.svg-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
