<template>
  <div class="workspace-2d" ref="containerRef">
    <svg
      ref="svgRef"
      :class="['workspace-svg', `cursor-${cursorState}`]"
      :width="width"
      :height="height"
      @click="handleCanvasClick"
      @mousemove="handleMouseMove"
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
        <!-- Render each projection plane -->
        <g
          v-for="plane in viewStore.planes"
          :key="plane.id"
          :class="['projection-plane', { 'active': plane.id === viewStore.activePlaneId }]"
          :transform="getPlaneTransform(plane.id)"
          :opacity="getPlaneOpacity(plane.id)"
        >
          <!-- Plane background (subtle) -->
          <rect
            :x="planeBounds.minX"
            :y="planeBounds.minY"
            :width="planeBounds.width"
            :height="planeBounds.height"
            :fill="plane.color"
            :opacity="0.1"
            class="plane-background"
          />
          
          <!-- Plane label -->
          <text
            :x="getPlaneLabelX(plane.id)"
            :y="getPlaneLabelY(plane.id)"
            class="plane-label"
            :fill="plane.id === viewStore.activePlaneId ? '#000000' : '#888888'"
            font-size="14"
            font-weight="bold"
          >
            <template v-if="plane.name.includes('_')">
              <tspan>{{ plane.name.split('_')[0] }}</tspan>
              <tspan baseline-shift="sub" font-size="11">{{ plane.name.split('_')[1] }}</tspan>
            </template>
            <template v-else>
              {{ plane.name }}
            </template>
          </text>
          
          <!-- Render all 2D elements on this plane -->
          <g class="plane-elements">
            <ElementRenderer
              v-for="element in getElementsForPlane(plane.id)"
              :key="element.id"
              :element="element"
            />
          </g>
        </g>
      </g>
      
      <!-- Overlay for UI elements (not transformed) -->
      <g class="overlay">
        <!-- Cursor feedback, selection boxes, etc. -->
      </g>
    </svg>
    
    <!-- Active plane indicator -->
    <div class="plane-indicator">
      Active: <SubscriptText :text="activePlaneName" />
    </div>
    
    <!-- Tool feedback overlay -->
    <div v-if="toolFeedback" class="tool-feedback" :class="`feedback-${toolFeedback.type}`">
      {{ toolFeedback.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { useWorldStore } from '@/stores/worldStore';
import { useViewStore } from '@/stores/viewStore';
import { useToolStore } from '@/stores/toolStore';
import ElementRenderer from './ElementRenderer.vue';
import SubscriptText from '@/components/SubscriptText.vue';
import type { Element2D } from '@/types/ElementTypes';
import { CreateFreePointCommand } from '@/commands/CreateFreePointCommand';
import { CreateIntersectionPointCommand } from '@/commands/CreateIntersectionPointCommand';
import { CreateSegmentCommand } from '@/commands/CreateSegmentCommand';
import { CreateLineCommand } from '@/commands/CreateLineCommand';
import { CreateCircleCommand } from '@/commands/CreateCircleCommand';
import { useSnapping } from '@/composables/useSnapping';
import { useToolFeedback } from '@/composables/useToolFeedback';
import { useElementGeometry } from '@/composables/useElementGeometry';
import { useImplicitPointCreation } from '@/composables/useImplicitPointCreation';

const worldStore = useWorldStore();
const viewStore = useViewStore();
const toolStore = useToolStore();

const { snapToPoint } = useSnapping();
const { feedback: toolFeedback, showFeedback, clearFeedback } = useToolFeedback();
const { findNearestElement, closestPointOnElement, findIntersectingElements } = useElementGeometry();
const { createPointIfNeeded, detectPointAction } = useImplicitPointCreation();

// Component refs
const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const mainGroupRef = ref<SVGGElement | null>(null);

// Zoom behavior reference
let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;
let currentTransform = ref(zoomIdentity);

// Multi-click selection state (for segment/line tools)
const selectedPoints = ref<string[]>([]);

// Cursor state for visual feedback
const cursorState = ref<'default' | 'snap-to-point' | 'snap-to-intersection' | 'create-free-point'>('default');
const cursorPosition = ref<{ x: number; y: number } | null>(null);

// Dimensions
const width = ref(800);
const height = ref(600);
const gridSize = 20;

// Plane layout configuration (dihedral arrangement)
// Centered around origin for better initial view
const planeBounds = {
  minX: -300,
  minY: -200,
  width: 600,
  height: 400
};

// Compute elements for a specific plane
const getElementsForPlane = (planeId: string): Element2D[] => {
  return worldStore.allElements2D.filter((el: Element2D) => el.planeId === planeId);
};

// Get plane transform for dihedral layout
// Uses the canvas_layout from ProjectionPlane configuration
const getPlaneTransform = (planeId: string): string => {
  const plane = viewStore.getPlaneById(planeId);
  if (!plane) return 'translate(0, 0)';
  
  const layout = plane.canvas_layout;
  const transforms: string[] = [];
  
  // Translation
  if (layout.offset_x !== 0 || layout.offset_y !== 0) {
    transforms.push(`translate(${layout.offset_x}, ${layout.offset_y})`);
  }
  
  // Rotation (future: for auxiliary planes)
  if (layout.rotation !== 0) {
    transforms.push(`rotate(${layout.rotation * 180 / Math.PI})`);
  }
  
  // Scale/flip
  if (layout.scale_x !== 1 || layout.scale_y !== 1) {
    transforms.push(`scale(${layout.scale_x}, ${layout.scale_y})`);
  }
  
  return transforms.join(' ') || 'translate(0, 0)';
};

// Get plane opacity based on active state
const getPlaneOpacity = (planeId: string): number => {
  return planeId === viewStore.activePlaneId ? 1.0 : 0.5;
};

// Calculate visible viewport bounds in SVG coordinate space
const getViewportBounds = () => {
  const t = currentTransform.value;
  const k = t.k;
  const tx = t.x;
  const ty = t.y;
  
  // Transform viewport corners to SVG space
  const left = -tx / k;
  const top = -ty / k;
  const right = (width.value - tx) / k;
  const bottom = (height.value - ty) / k;
  
  return { left, top, right, bottom };
};

// Get dynamic plane label position based on viewport and plane offset
const getPlaneLabelX = (planeId: string): number => {
  const bounds = getViewportBounds();
  const plane = viewStore.getPlaneById(planeId);
  const planeOffset = plane ? { x: plane.canvas_layout.offset_x, y: plane.canvas_layout.offset_y } : { x: 0, y: 0 };
  
  // Position label at the left edge of visible area within this plane's coordinate system
  // Account for plane offset when calculating visible bounds
  const visibleLeftInPlane = Math.max(bounds.left - planeOffset.x, planeBounds.minX);
  return visibleLeftInPlane + 10;
};

const getPlaneLabelY = (planeId: string): number => {
  const bounds = getViewportBounds();
  const plane = viewStore.getPlaneById(planeId);
  const planeOffset = plane ? { x: plane.canvas_layout.offset_x, y: plane.canvas_layout.offset_y } : { x: 0, y: 0 };
  
  // Position label at the top edge of visible area within this plane's coordinate system
  const visibleTopInPlane = Math.max(bounds.top - planeOffset.y, planeBounds.minY);
  return visibleTopInPlane + 25;
};

// Compute elements on active plane (legacy, for backwards compatibility)
const elementsOnActivePlane = computed((): Element2D[] => {
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) return [];
  
  return worldStore.allElements2D.filter((el: Element2D) => el.planeId === activePlaneId);
});

const activePlaneName = computed(() => {
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) return '';
  
  const plane = viewStore.planes.find((p: any) => p.id === activePlaneId);
  return plane ? plane.name : '';
});

/**
 * Handle mouse move for cursor feedback
 */
const handleMouseMove = (event: MouseEvent) => {
  if (!svgRef.value || !mainGroupRef.value) return;
  
  const activeTool = toolStore.activeTool;
  if (!activeTool) {
    cursorState.value = 'default';
    return;
  }
  
  // Only show cursor feedback for tools that need point input
  const pointInputTools = ['segment', 'line', 'circle-center-radius'];
  if (!pointInputTools.includes(activeTool)) {
    cursorState.value = 'default';
    return;
  }
  
  // Get coordinates in workspace space
  const svg = svgRef.value;
  const mainGroup = mainGroupRef.value;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const ctm = mainGroup.getScreenCTM();
  if (!ctm) return;
  const transformedPoint = point.matrixTransform(ctm.inverse());
  
  // Get active plane offset
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) return;
  
  const activePlane = viewStore.getPlaneById(activePlaneId);
  const planeOffset = activePlane ? { x: activePlane.canvas_layout.offset_x, y: activePlane.canvas_layout.offset_y } : { x: 0, y: 0 };
  const workspaceX = transformedPoint.x - planeOffset.x;
  const workspaceY = transformedPoint.y - planeOffset.y;
  
  // Store cursor position
  cursorPosition.value = { x: workspaceX, y: workspaceY };
  
  // Detect what action would occur at this location
  cursorState.value = detectPointAction(workspaceX, workspaceY, activePlaneId);
};

/**
 * Handle canvas click for tool interactions
 */
const handleCanvasClick = (event: MouseEvent) => {
  if (!svgRef.value || !mainGroupRef.value) return;
  
  // Get the active tool
  const activeTool = toolStore.activeTool;
  if (!activeTool) return;
  
  // Get click coordinates in SVG space, accounting for zoom/pan transform
  const svg = svgRef.value;
  const mainGroup = mainGroupRef.value;
  
  // Get click position relative to SVG
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  
  // Transform through the screen CTM to get coordinates in the transformed group space
  const ctm = mainGroup.getScreenCTM();
  if (!ctm) return;
  
  const transformedPoint = point.matrixTransform(ctm.inverse());
  
  // Get active plane offset to adjust coordinates to plane-local space
  const activePlaneId = viewStore.activePlaneId;
  const activePlane = viewStore.getPlaneById(activePlaneId);
  const planeOffset = activePlane ? { x: activePlane.canvas_layout.offset_x, y: activePlane.canvas_layout.offset_y } : { x: 0, y: 0 };
  
  const workspaceX = transformedPoint.x - planeOffset.x;
  const workspaceY = transformedPoint.y - planeOffset.y;
  
  // Handle different tool types
  switch (activeTool) {
    case 'point-free':
      handleFreePointTool(workspaceX, workspaceY);
      break;
    case 'point-on-element':
      handlePointOnElementTool(workspaceX, workspaceY);
      break;
    case 'point-intersection':
      handleIntersectionPointTool(workspaceX, workspaceY);
      break;
    case 'segment':
      handleSegmentTool(workspaceX, workspaceY);
      break;
    case 'line':
      handleLineTool(workspaceX, workspaceY);
      break;
    case 'circle-center-radius':
      handleCircleCenterPointTool(workspaceX, workspaceY);
      break;
    default:
      break;
  }
};

/**
 * Handle free point tool - create a point at click location
 */
const handleFreePointTool = (x: number, y: number) => {
  // Apply snapping
  const snapped = snapToPoint(x, y);
  const finalX = snapped.x;
  const finalY = snapped.y;
  
  // Get active plane
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) {
    showFeedback('error', 'No active plane selected');
    setTimeout(clearFeedback, 2000);
    return;
  }
  
  // Create command
  const command = new CreateFreePointCommand(
    {
      x: finalX,
      y: finalY,
      planeId: activePlaneId,
      actionId: 'user-action-001'  // TODO: Get from current action context
    },
    worldStore
  );
  
  // Execute command
  const result = command.execute();
  
  if (result.success) {
    showFeedback('success', `Point created at (${finalX.toFixed(1)}, ${finalY.toFixed(1)})`);
    setTimeout(clearFeedback, 1500);
  } else {
    showFeedback('error', result.error || 'Failed to create point');
    setTimeout(clearFeedback, 2000);
  }
};

/**
};

/**
 * Handle intersection point tool - create points at element intersections
 * (FR-023: Automatic intersection point creation)
 */
const handleIntersectionPointTool = (x: number, y: number) => {
  // Find intersecting elements near the click point
  const intersections = findIntersectingElements(x, y, 20);
  
  if (intersections.length === 0) {
    showFeedback('warning', 'No intersecting elements found. Click near an intersection.');
    setTimeout(clearFeedback, 2000);
    return;
  }
  
  // Use the first intersection found
  const { element1, element2 } = intersections[0];
  
  // Get active plane
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) {
    showFeedback('error', 'No active plane selected');
    setTimeout(clearFeedback, 2000);
    return;
  }
  
  // Create intersection point (index 0 for first intersection)
  const command = new CreateIntersectionPointCommand(
    {
      element1Id: element1.id,
      element2Id: element2.id,
      intersectionIndex: 0,
      planeId: activePlaneId,
      actionId: 'user-action-001'  // TODO: Get from current action context
    },
    worldStore
  );
  
  // Execute command
  const result = command.execute();
  
  if (result.success) {
    const infeasible = result.outputs.infeasible;
    if (infeasible) {
      showFeedback('warning', `Intersection point created but infeasible (no intersection exists)`);
    } else {
      showFeedback('success', `Intersection point created`);
    }
    setTimeout(clearFeedback, 2000);
  } else {
    showFeedback('error', result.error || 'Failed to create intersection point');
    setTimeout(clearFeedback, 2000);
  }
};

/**
 * Handle segment tool - create a segment between two points
 * Automatically creates points if needed (intersections or free points)
 */
const handleSegmentTool = (x: number, y: number) => {
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) {
    showFeedback('error', 'No active plane selected');
    setTimeout(clearFeedback, 2000);
    return;
  }

  // Create or find point at click location (automatic point creation)
  const pointResult = createPointIfNeeded(x, y, activePlaneId, 'user-action-001');
  
  if (!pointResult) {
    showFeedback('error', 'Failed to create/find point');
    setTimeout(clearFeedback, 2000);
    return;
  }

  // Add to selected points
  selectedPoints.value.push(pointResult.pointId);

  if (selectedPoints.value.length === 1) {
    const point = worldStore.elements2D.get(pointResult.pointId);
    const pointName = point?.name || 'point';
    if (pointResult.isExisting) {
      showFeedback('info', `Point ${pointName} selected. Click second point.`);
    } else if (pointResult.isIntersection) {
      showFeedback('info', `Intersection point created. Click second point.`);
    } else {
      showFeedback('info', `Point created at (${x.toFixed(0)}, ${y.toFixed(0)}). Click second point.`);
    }
    return;
  }

  if (selectedPoints.value.length === 2) {
    // Create segment
    const command = new CreateSegmentCommand(
      {
        point1Id: selectedPoints.value[0],
        point2Id: selectedPoints.value[1],
        planeId: activePlaneId,
        actionId: 'user-action-001'
      },
      worldStore
    );

    const result = command.execute();

    if (result.success) {
      const infeasible = result.outputs.infeasible;
      if (infeasible) {
        showFeedback('warning', 'Segment created but infeasible (coincident points)');
      } else {
        showFeedback('success', 'Segment created');
      }
      setTimeout(clearFeedback, 1500);
    } else {
      showFeedback('error', result.error || 'Failed to create segment');
      setTimeout(clearFeedback, 2000);
    }

    // Reset selection
    selectedPoints.value = [];
  }
};

/**
 * Handle line tool - create a line through two points
 * Requires two clicks to select points
 */
const handleLineTool = (x: number, y: number) => {
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) {
    showFeedback('error', 'No active plane selected');
    setTimeout(clearFeedback, 2000);
    return;
  }

  // Create or find point at click location (automatic point creation)
  const pointResult = createPointIfNeeded(x, y, activePlaneId, 'user-action-001');
  
  if (!pointResult) {
    showFeedback('error', 'Failed to create/find point');
    setTimeout(clearFeedback, 2000);
    return;
  }

  // Add to selected points
  selectedPoints.value.push(pointResult.pointId);

  if (selectedPoints.value.length === 1) {
    const point = worldStore.elements2D.get(pointResult.pointId);
    const pointName = point?.name || 'point';
    if (pointResult.isExisting) {
      showFeedback('info', `Point ${pointName} selected. Click second point.`);
    } else if (pointResult.isIntersection) {
      showFeedback('info', `Intersection point created. Click second point.`);
    } else {
      showFeedback('info', `Point created. Click second point.`);
    }
    return;
  }

  if (selectedPoints.value.length === 2) {
    // Create line by two points
    const command = new CreateLineCommand(
      {
        method: {
          type: 'by-two-points',
          point1Id: selectedPoints.value[0],
          point2Id: selectedPoints.value[1]
        },
        planeId: activePlaneId,
        actionId: 'user-action-001'
      },
      worldStore
    );

    const result = command.execute();

    if (result.success) {
      const infeasible = result.outputs.infeasible;
      if (infeasible) {
        showFeedback('warning', 'Line created but infeasible (coincident points)');
      } else {
        showFeedback('success', 'Line created');
      }
      setTimeout(clearFeedback, 1500);
    } else {
      showFeedback('error', result.error || 'Failed to create line');
      setTimeout(clearFeedback, 2000);
    }

    // Reset selection
    selectedPoints.value = [];
  }
};

/**
 * Handle circle center-point tool - create a circle through center and circumference point
 * Requires two clicks to select center and circumference points
 */
const handleCircleCenterPointTool = (x: number, y: number) => {
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) {
    showFeedback('error', 'No active plane selected');
    setTimeout(clearFeedback, 2000);
    return;
  }

  // Create or find point at click location (automatic point creation)
  const pointResult = createPointIfNeeded(x, y, activePlaneId, 'user-action-001');
  
  if (!pointResult) {
    showFeedback('error', 'Failed to create/find point');
    setTimeout(clearFeedback, 2000);
    return;
  }

  // Add to selected points
  selectedPoints.value.push(pointResult.pointId);

  if (selectedPoints.value.length === 1) {
    const point = worldStore.elements2D.get(pointResult.pointId);
    const pointName = point?.name || 'point';
    if (pointResult.isExisting) {
      showFeedback('info', `Center point ${pointName} selected. Click circumference point.`);
    } else if (pointResult.isIntersection) {
      showFeedback('info', `Intersection point created as center. Click circumference point.`);
    } else {
      showFeedback('info', `Center point created. Click circumference point.`);
    }
    return;
  }

  if (selectedPoints.value.length === 2) {
    // Create circle by center and point
    const command = new CreateCircleCommand(
      {
        method: {
          type: 'center-point',
          centerPointId: selectedPoints.value[0],
          circumferencePointId: selectedPoints.value[1]
        },
        planeId: activePlaneId,
        actionId: 'user-action-001'
      },
      worldStore
    );

    const result = command.execute();

    if (result.success) {
      const infeasible = result.outputs.infeasible;
      if (infeasible) {
        showFeedback('warning', 'Circle created but infeasible (coincident points)');
      } else {
        showFeedback('success', 'Circle created');
      }
      setTimeout(clearFeedback, 1500);
    } else {
      showFeedback('error', result.error || 'Failed to create circle');
      setTimeout(clearFeedback, 2000);
    }

    // Reset selection
    selectedPoints.value = [];
  }
};

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
  zoomBehavior = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 10])  // Min and max zoom levels
    .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
      // Update current transform for viewport calculations
      currentTransform.value = event.transform;
      // Apply transform to main group
      mainGroup.attr('transform', event.transform.toString());
    });
  
  // Apply zoom behavior to SVG
  svg.call(zoomBehavior);
  
  // Set initial transform (center content in viewport)
  const initialTransform = zoomIdentity
    .translate(width.value / 2, height.value / 2)
    .scale(1.0);
  currentTransform.value = initialTransform;
  svg.call(zoomBehavior.transform, initialTransform);
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

.projection-plane {
  transition: opacity 0.3s ease;
}

.projection-plane.active {
  opacity: 1.0 !important;
}

.plane-background {
  pointer-events: none;
}

.plane-label {
  pointer-events: none;
  user-select: none;
  font-family: system-ui, -apple-system, sans-serif;
}

.plane-elements {
  /* Container for all elements on this plane */
}

.hinge-lines {
  /* Container for hinge lines */
}

.hinge-line {
  pointer-events: none;
}

.hinge-line-label {
  pointer-events: none;
  user-select: none;
  font-family: system-ui, -apple-system, sans-serif;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tool-feedback {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  transition: all 0.2s ease;
}

.feedback-info {
  background-color: #2196f3;
  color: white;
}

.feedback-success {
  background-color: #4caf50;
  color: white;
}

.feedback-warning {
  background-color: #ff9800;
  color: white;
}

.feedback-error {
  background-color: #f44336;
  color: white;
}

/* Cursor state styles for automatic point creation */
.workspace-svg {
  cursor: default;
}

.workspace-svg.cursor-snap-to-point {
  cursor: crosshair;
}

.workspace-svg.cursor-snap-to-intersection {
  cursor: cell;
}

.workspace-svg.cursor-create-free-point {
  cursor: crosshair;
}
</style>
