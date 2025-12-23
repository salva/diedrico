<template>
  <g :class="['element', element.kind, { infeasible: element.infeasible }]">
    <!-- Point2D -->
    <circle
      v-if="element.kind.startsWith('Point2D')"
      :cx="getPointX(element as Point2D)"
      :cy="getPointY(element as Point2D)"
      :r="pointRadius"
      :fill="element.infeasible ? 'red' : 'black'"
    />
    
    <!--Label for Point2D -->
    <text
      v-if="element.kind.startsWith('Point2D') && element.name"
      :x="getPointX(element as Point2D) + labelOffset"
      :y="getPointY(element as Point2D) - labelOffset"
      class="element-label"
      :fill="element.infeasible ? 'red' : 'black'"
    >
      {{ element.name }}
    </text>
  </g>
</template>

<script setup lang="ts">
import type { Element2D, Point2D, Point2DFree, Point2DDerived } from '@/types/ElementTypes';

interface Props {
  element: Element2D;
}

const props = defineProps<Props>();

const pointRadius = 4;
const labelOffset = 10;

// Helper to get X coordinate for any Point2D variant
function getPointX(point: Point2D): number {
  if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
    return (point as Point2DFree | Point2DDerived).x;
  }
  // For Point2DOnElement and Point2DFromIntersection, we need to compute
  // For now, return 0 as placeholder
  return 0;
}

// Helper to get Y coordinate for any Point2D variant
function getPointY(point: Point2D): number {
  if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
    return (point as Point2DFree | Point2DDerived).y;
  }
  // For Point2DOnElement and Point2DFromIntersection, we need to compute
  // For now, return 0 as placeholder
  return 0;
}
</script>

<style scoped>
.element {
  cursor: pointer;
  transition: all 0.1s ease;
}

.element:hover {
  filter: brightness(1.2);
}

.element.infeasible {
  opacity: 0.6;
}

.element-label {
  font-size: 14px;
  font-weight: 500;
  pointer-events: none;
  user-select: none;
}
</style>
