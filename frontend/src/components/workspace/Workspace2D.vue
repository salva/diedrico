<template>
  <div class="workspace-2d" ref="containerRef">
    <svg
      ref="svgRef"
      class="workspace-svg"
      :width="width"
      :height="height"
      @click="handleCanvasClick"
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
import type { Element2D } from '@/types/ElementTypes';
import { CreateFreePointCommand } from '@/commands/CreateFreePointCommand';
import { CreatePointOnElementCommand } from '@/commands/CreatePointOnElementCommand';
import { CreateIntersectionPointCommand } from '@/commands/CreateIntersectionPointCommand';
import { CreateSegmentCommand } from '@/commands/CreateSegmentCommand';
import { CreateLineCommand } from '@/commands/CreateLineCommand';
import { useSnapping } from '@/composables/useSnapping';
import { useToolFeedback } from '@/composables/useToolFeedback';
import { useElementGeometry } from '@/composables/useElementGeometry';

const worldStore = useWorldStore();
const viewStore = useViewStore();
const toolStore = useToolStore();

const { snapToPoint } = useSnapping();
const { feedback: toolFeedback, showFeedback, clearFeedback } = useToolFeedback();
const { findNearestElement, closestPointOnElement, findIntersectingElements } = useElementGeometry();

// Component refs
const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const mainGroupRef = ref<SVGGElement | null>(null);

// Zoom behavior reference
let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;

// Multi-click selection state (for segment/line tools)
const selectedPoints = ref<string[]>([]);

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
  
  const plane = viewStore.planes.find((p: any) => p.id === activePlaneId);
  return plane ? plane.name : '';
});

/**
 * Handle canvas click for tool interactions
 */
const handleCanvasClick = (event: MouseEvent) => {
  if (!svgRef.value || !mainGroupRef.value) return;
  
  // Get the active tool
  const activeTool = toolStore.activeTool;
  if (!activeTool) return;
  
  // Get click coordinates in SVG space
  const svg = svgRef.value;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  
  // Parse transform to get actual coordinates
  // For now, using client coordinates relative to SVG
  const rect = svg.getBoundingClientRect();
  const workspaceX = event.clientX - rect.left;
  const workspaceY = event.clientY - rect.top;
  
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
 * Handle point-on-element tool - create a point constrained to an element
 */
const handlePointOnElementTool = (x: number, y: number) => {
  // Find nearest element
  const nearestElement = findNearestElement(x, y, 20);
  
  if (!nearestElement) {
    showFeedback('warning', 'No element found nearby. Click near a segment, line, or circle.');
    setTimeout(clearFeedback, 2000);
    return;
  }
  
  // Calculate closest point on element
  const closestPoint = closestPointOnElement(x, y, nearestElement);
  
  if (!closestPoint) {
    showFeedback('error', 'Could not calculate point on element');
    setTimeout(clearFeedback, 2000);
    return;
  }
  
  // Get active plane
  const activePlaneId = viewStore.activePlaneId;
  if (!activePlaneId) {
    showFeedback('error', 'No active plane selected');
    setTimeout(clearFeedback, 2000);
    return;
  }
  
  // Create command
  const command = new CreatePointOnElementCommand(
    {
      hostElementId: nearestElement.id,
      parameter: closestPoint.parameter,
      planeId: activePlaneId,
      actionId: 'user-action-001'  // TODO: Get from current action context
    },
    worldStore
  );
  
  // Execute command
  const result = command.execute();
  
  if (result.success) {
    showFeedback('success', `Point created on ${nearestElement.name}`);
    setTimeout(clearFeedback, 1500);
  } else {
    showFeedback('error', result.error || 'Failed to create point on element');
    setTimeout(clearFeedback, 2000);
  }
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
 * Requires two clicks to select endpoints
 */
const handleSegmentTool = (x: number, y: number) => {
  // Find nearest point to click
  const snapped = snapToPoint(x, y);
  const nearestPoint = worldStore.allElements2D.find((el: any) => {
    if (!el.kind.startsWith('Point2D')) return false;
    if (el.kind === 'Point2DFree' || el.kind === 'Point2DDerived') {
      const dx = el.x - snapped.x;
      const dy = el.y - snapped.y;
      return Math.sqrt(dx * dx + dy * dy) < 10;
    }
    return false;
  });

  if (!nearestPoint) {
    showFeedback('warning', 'Click on a point to select endpoint');
    setTimeout(clearFeedback, 2000);
    return;
  }

  // Add to selected points
  selectedPoints.value.push(nearestPoint.id);

  if (selectedPoints.value.length === 1) {
    showFeedback('info', `Point ${nearestPoint.name} selected. Click second point.`);
    return;
  }

  if (selectedPoints.value.length === 2) {
    // Create segment
    const activePlaneId = viewStore.activePlaneId;
    if (!activePlaneId) {
      showFeedback('error', 'No active plane selected');
      setTimeout(clearFeedback, 2000);
      selectedPoints.value = [];
      return;
    }

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
  // Find nearest point to click
  const snapped = snapToPoint(x, y);
  const nearestPoint = worldStore.allElements2D.find((el: any) => {
    if (!el.kind.startsWith('Point2D')) return false;
    if (el.kind === 'Point2DFree' || el.kind === 'Point2DDerived') {
      const dx = el.x - snapped.x;
      const dy = el.y - snapped.y;
      return Math.sqrt(dx * dx + dy * dy) < 10;
    }
    return false;
  });

  if (!nearestPoint) {
    showFeedback('warning', 'Click on a point to select line point');
    setTimeout(clearFeedback, 2000);
    return;
  }

  // Add to selected points
  selectedPoints.value.push(nearestPoint.id);

  if (selectedPoints.value.length === 1) {
    showFeedback('info', `Point ${nearestPoint.name} selected. Click second point.`);
    return;
  }

  if (selectedPoints.value.length === 2) {
    // Create line by two points
    const activePlaneId = viewStore.activePlaneId;
    if (!activePlaneId) {
      showFeedback('error', 'No active plane selected');
      setTimeout(clearFeedback, 2000);
      selectedPoints.value = [];
      return;
    }

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
</style>
