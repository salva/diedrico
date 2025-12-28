<template>
  <!-- Do not render infeasible or invisible elements -->
  <g v-if="!element.infeasible && (element.visualStyle?.visible !== false)" :class="['element', element.kind]">
    <!-- Point2D -->
    <circle
      v-if="element.kind.startsWith('Point2D')"
      :cx="getPointX(element as Point2D)"
      :cy="getPointY(element as Point2D)"
      :r="pointRadius"
      :fill="element.visualStyle?.color || 'black'"
      :opacity="element.visualStyle?.opacity || 1.0"
    />
    
    <!--Label for Point2D -->
    <text
      v-if="element.kind.startsWith('Point2D') && element.name"
      :x="getPointX(element as Point2D) + labelOffset"
      :y="getPointY(element as Point2D) - labelOffset"
      class="element-label"
      :fill="element.visualStyle?.color || 'black'"
    >
      <template v-if="element.name.includes('_')">
        <tspan>{{ element.name.split('_')[0] }}</tspan>
        <tspan baseline-shift="sub" font-size="10">{{ element.name.split('_').slice(1).join('_') }}</tspan>
      </template>
      <template v-else>
        {{ element.name }}
      </template>
    </text>

    <!-- Segment2D -->
    <line
      v-if="element.kind === 'Segment2DByPoints'"
      :x1="getPointX(getElement(element.point1Id) as Point2D)"
      :y1="getPointY(getElement(element.point1Id) as Point2D)"
      :x2="getPointX(getElement(element.point2Id) as Point2D)"
      :y2="getPointY(getElement(element.point2Id) as Point2D)"
      :stroke="element.visualStyle?.color || 'black'"
      :stroke-width="element.visualStyle?.lineWidth || 2"
      :stroke-dasharray="element.visualStyle?.lineStyle === 'dashed' ? '5,5' : 'none'"
      :opacity="element.visualStyle?.opacity || 1.0"
    />

    <!-- Line2D (extended to viewport bounds) -->
    <line
      v-if="element.kind.startsWith('Line2D')"
      :x1="getLinePoint1X(element)"
      :y1="getLinePoint1Y(element)"
      :x2="getLinePoint2X(element)"
      :y2="getLinePoint2Y(element)"
      :stroke="element.visualStyle?.color || 'black'"
      :stroke-width="element.visualStyle?.lineWidth || 2"
      :stroke-dasharray="element.visualStyle?.lineStyle === 'dashed' ? '5,5' : 'none'"
      :opacity="element.visualStyle?.opacity || 1.0"
    />

    <!-- Guide2D (perpendicular to hinge line, rendered as extended line) -->
    <line
      v-if="element.kind === 'Guide2DPerpendicularToLine'"
      :x1="getGuidePoint1X(element)"
      :y1="getGuidePoint1Y(element)"
      :x2="getGuidePoint2X(element)"
      :y2="getGuidePoint2Y(element)"
      :stroke="element.visualStyle?.color || '#00aa00'"
      :stroke-width="element.visualStyle?.lineWidth || 1"
      :stroke-dasharray="element.visualStyle?.lineStyle === 'dashed' ? '5,5' : 'none'"
      :opacity="element.visualStyle?.opacity || 1.0"
    />

    <!-- BHLProjection2D (Broken Hinge Line projection, rendered as orange dashed line) -->
    <line
      v-if="element.kind === 'BHLProjection2D'"
      :x1="getBHLPoint1X(element)"
      :y1="getBHLPoint1Y(element)"
      :x2="getBHLPoint2X(element)"
      :y2="getBHLPoint2Y(element)"
      :stroke="'#ff8800'"
      :stroke-width="2"
      stroke-dasharray="8,4"
      :opacity="element.visualStyle?.opacity || 1.0"
    />

    <!-- Circle2D -->
    <circle
      v-if="element.kind.startsWith('Circle2D')"
      :cx="getCircleCenterX(element)"
      :cy="getCircleCenterY(element)"
      :r="getCircleRadius(element)"
      fill="none"
      :stroke="element.visualStyle?.color || 'black'"
      :stroke-width="element.visualStyle?.lineWidth || 2"
      :stroke-dasharray="element.visualStyle?.lineStyle === 'dashed' ? '5,5' : 'none'"
      :opacity="element.visualStyle?.opacity || 1.0"
    />
  </g>
</template>

<script setup lang="ts">
import type { Element2D, Point2D, Point2DFree, Point2DDerived, Segment2DByPoints, Line2D, Circle2D, BHLProjection2D, Plane3D } from '@/types/ElementTypes';
import { useWorldStore } from '@/stores/worldStore';
import { tracesToPlane3D, computeBHLProjections, type Line2DGeometry } from '@/domain/calculations/bhlProjections';

interface Props {
  element: Element2D;
}

const props = defineProps<Props>();
const worldStore = useWorldStore();

const pointRadius = 4;
const labelOffset = 10;

// Get element from world store
function getElement(id: string): Element2D | undefined {
  return worldStore.elements2D.get(id);
}

// Helper to get X coordinate for any Point2D variant
function getPointX(point: Point2D): number {
  if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
    return (point as Point2DFree | Point2DDerived).x;
  }
  // For Point2DFromIntersection and Point2DFromIntersection, we need to compute
  // For now, return 0 as placeholder
  return 0;
}

// Helper to get Y coordinate for any Point2D variant
function getPointY(point: Point2D): number {
  if (point.kind === 'Point2DFree' || point.kind === 'Point2DDerived') {
    return (point as Point2DFree | Point2DDerived).y;
  }
  // For Point2DFromIntersection and Point2DFromIntersection, we need to compute
  // For now, return 0 as placeholder
  return 0;
}

// Get line endpoints (extended to canvas bounds)
// For now, we'll use a simple approach - extend line 2000 pixels in each direction
function getLinePoint1X(element: any): number {
  if (element.kind === 'Line2DByTwoPoints') {
    const p1 = getElement(element.point1Id) as Point2D;
    const p2 = getElement(element.point2Id) as Point2D;
    if (!p1 || !p2) return 0;
    
    const x1 = getPointX(p1);
    const y1 = getPointY(p1);
    const x2 = getPointX(p2);
    const y2 = getPointY(p2);
    
    // Calculate direction vector and extend
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return x1;
    
    return x1 - (dx / length) * 2000;
  }
  // TODO: Handle parallel and perpendicular line variants
  return 0;
}

function getLinePoint1Y(element: any): number {
  if (element.kind === 'Line2DByTwoPoints') {
    const p1 = getElement(element.point1Id) as Point2D;
    const p2 = getElement(element.point2Id) as Point2D;
    if (!p1 || !p2) return 0;
    
    const x1 = getPointX(p1);
    const y1 = getPointY(p1);
    const x2 = getPointX(p2);
    const y2 = getPointY(p2);
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return y1;
    
    return y1 - (dy / length) * 2000;
  }
  return 0;
}

function getLinePoint2X(element: any): number {
  if (element.kind === 'Line2DByTwoPoints') {
    const p1 = getElement(element.point1Id) as Point2D;
    const p2 = getElement(element.point2Id) as Point2D;
    if (!p1 || !p2) return 0;
    
    const x1 = getPointX(p1);
    const y1 = getPointY(p1);
    const x2 = getPointX(p2);
    const y2 = getPointY(p2);
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return x2;
    
    return x2 + (dx / length) * 2000;
  }
  return 0;
}

function getLinePoint2Y(element: any): number {
  if (element.kind === 'Line2DByTwoPoints') {
    const p1 = getElement(element.point1Id) as Point2D;
    const p2 = getElement(element.point2Id) as Point2D;
    if (!p1 || !p2) return 0;
    
    const x1 = getPointX(p1);
    const y1 = getPointY(p1);
    const x2 = getPointX(p2);
    const y2 = getPointY(p2);
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return y2;
    
    return y2 + (dy / length) * 2000;
  }
  return 0;
}

// Get guide endpoints (perpendicular to hinge line through point)
// For MVP, HL_HV is horizontal (y=0), so guide is vertical
function getGuidePoint1X(element: any): number {
  if (element.kind === 'Guide2DPerpendicularToLine') {
    const point = getElement(element.throughPointId) as Point2D;
    if (!point) return 0;
    // Guide is vertical through the point
    return getPointX(point);
  }
  return 0;
}

function getGuidePoint1Y(element: any): number {
  if (element.kind === 'Guide2DPerpendicularToLine') {
    // Extend upward
    return -2000;
  }
  return 0;
}

function getGuidePoint2X(element: any): number {
  if (element.kind === 'Guide2DPerpendicularToLine') {
    const point = getElement(element.throughPointId) as Point2D;
    if (!point) return 0;
    // Guide is vertical through the point
    return getPointX(point);
  }
  return 0;
}

function getGuidePoint2Y(element: any): number {
  if (element.kind === 'Guide2DPerpendicularToLine') {
    // Extend downward
    return 2000;
  }
  return 0;
}

// Get circle center and radius
function getCircleCenterX(element: any): number {
  if (element.kind === 'Circle2DByCenterAndRadius' || 
      element.kind === 'Circle2DByCenterAndPoint') {
    const center = getElement(element.centerPointId) as Point2D;
    return center ? getPointX(center) : 0;
  }
  if (element.kind === 'Circle2DByThreePoints') {
    // TODO: Calculate circumcenter of three points
    return 0;
  }
  return 0;
}

function getCircleCenterY(element: any): number {
  if (element.kind === 'Circle2DByCenterAndRadius' || 
      element.kind === 'Circle2DByCenterAndPoint') {
    const center = getElement(element.centerPointId) as Point2D;
    return center ? getPointY(center) : 0;
  }
  if (element.kind === 'Circle2DByThreePoints') {
    // TODO: Calculate circumcenter of three points
    return 0;
  }
  return 0;
}

function getCircleRadius(element: any): number {
  if (element.kind === 'Circle2DByCenterAndRadius') {
    return element.radius;
  }
  if (element.kind === 'Circle2DByCenterAndPoint') {
    const center = getElement(element.centerPointId) as Point2D;
    const circumference = getElement(element.circumferencePointId) as Point2D;
    if (!center || !circumference) return 0;
    
    const cx = getPointX(center);
    const cy = getPointY(center);
    const px = getPointX(circumference);
    const py = getPointY(circumference);
    
    const dx = px - cx;
    const dy = py - cy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  if (element.kind === 'Circle2DByThreePoints') {
    // TODO: Calculate circumradius of three points
    return 0;
  }
  return 0;
}

// Get BHL projection endpoints
function getBHLGeometry(element: BHLProjection2D): Line2DGeometry | null {
  // Get the parent 3D plane
  const plane3D = worldStore.getElement3D(element.sourcePlane3DId) as Plane3D | undefined;
  if (!plane3D || plane3D.kind !== 'Plane3DByTraces') {
    return null;
  }

  // Get the trace lines
  const traceH = worldStore.getElement2D(plane3D.traceHId) as Line2D | undefined;
  const traceV = worldStore.getElement2D(plane3D.traceVId) as Line2D | undefined;
  if (!traceH || !traceV) {
    return null;
  }

  // Convert traces to geometry
  const traceHGeom = lineToGeometry(traceH);
  const traceVGeom = lineToGeometry(traceV);
  if (!traceHGeom || !traceVGeom) {
    return null;
  }

  // Compute 3D plane equation
  const plane3DEquation = tracesToPlane3D(traceHGeom, traceVGeom);
  if (!plane3DEquation) {
    return null;
  }

  // Compute BHL projections
  const bhlProjections = computeBHLProjections(plane3DEquation);
  if (!bhlProjections) {
    return null;
  }

  // Return the appropriate projection based on the element's plane
  if (element.planeId === 'P_H') {
    return bhlProjections.projectionH;
  } else if (element.planeId === 'P_V') {
    return bhlProjections.projectionV;
  }

  return null;
}

function lineToGeometry(line: Line2D): Line2DGeometry | null {
  if (line.kind === 'Line2DByTwoPoints') {
    const point1 = getElement(line.point1Id) as Point2D;
    const point2 = getElement(line.point2Id) as Point2D;
    
    if (!point1 || !point2) return null;
    
    return {
      point1: { x: getPointX(point1), y: getPointY(point1) },
      point2: { x: getPointX(point2), y: getPointY(point2) }
    };
  }
  return null;
}

function getBHLPoint1X(element: any): number {
  if (element.kind === 'BHLProjection2D') {
    const geom = getBHLGeometry(element as BHLProjection2D);
    return geom?.point1.x ?? 0;
  }
  return 0;
}

function getBHLPoint1Y(element: any): number {
  if (element.kind === 'BHLProjection2D') {
    const geom = getBHLGeometry(element as BHLProjection2D);
    return geom?.point1.y ?? 0;
  }
  return 0;
}

function getBHLPoint2X(element: any): number {
  if (element.kind === 'BHLProjection2D') {
    const geom = getBHLGeometry(element as BHLProjection2D);
    return geom?.point2.x ?? 0;
  }
  return 0;
}

function getBHLPoint2Y(element: any): number {
  if (element.kind === 'BHLProjection2D') {
    const geom = getBHLGeometry(element as BHLProjection2D);
    return geom?.point2.y ?? 0;
  }
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

.element-label {
  font-size: 14px;
  font-weight: 500;
  pointer-events: none;
  user-select: none;
}
</style>
