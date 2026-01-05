<template>
  <div class="svg-canvas-container">
    <!-- Plane selector -->
    <div class="plane-selector">
      <label>Active Plane:</label>
      <button 
        :class="{ active: activePlane === 'proj_plane_H' }"
        @click="activePlane = 'proj_plane_H'"
      >
        P_H (Horizontal)
      </button>
      <button 
        :class="{ active: activePlane === 'proj_plane_V' }"
        @click="activePlane = 'proj_plane_V'"
      >
        P_V (Vertical)
      </button>
    </div>
    
    <svg
      ref="svgElement"
      class="svg-canvas"
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
      preserveAspectRatio="xMidYMid meet"
      @click="handleCanvasClick"
      @mousemove="handleMouseMove"
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
      
      <!-- Render all lines through Paper pipeline (including HL_HV projections) -->
      <line
        v-for="{ primitive, attrs } in renderedLines"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all segments through Paper pipeline -->
      <line
        v-for="{ primitive, attrs } in renderedSegments"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all guides through Paper pipeline -->
      <line
        v-for="{ primitive, attrs } in renderedGuides"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all circles through Paper pipeline -->
      <circle
        v-for="{ primitive, attrs } in renderedCircles"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all arcs through Paper pipeline -->
      <path
        v-for="{ primitive, attrs } in renderedArcs"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all points through Paper pipeline -->
      <circle
        v-for="{ primitive, attrs } in renderedPoints"
        :key="primitive.id"
        v-bind="attrs"
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
 * Rendering Pipeline:
 * 1. World (domain objects + realizations) 
 * 2. → PaperService (generates Paper primitives in paper coordinates)
 * 3. → SVGRenderer (applies viewport transform, generates SVG attributes)
 * 4. → SVG elements
 * 
 * Key requirements:
 * - SVG element (not HTML Canvas) per ui-spec.md
 * - All rendering goes through Paper abstraction layer
 * - Generic rendering algorithms (no special cases for fixed elements)
 * - Will support pan/zoom viewport transformations in Phase 6
 * - Elements rendered using principle-based algorithms (Constitution Principle IV)
 * 
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#canvas-component
 */

import { ref, computed, watch, onMounted, inject, provide } from 'vue';
import { Matrix3, Vector3 } from 'three';
import { World } from '@/domain/world/World';
import { Paper } from '@/domain/presentation/Paper';
import { PaperService, type PrimitiveContext } from '@/services/PaperService';
import { SVGRenderer, type ViewportTransform } from '@/services/SVGRenderer';
import { InputService } from '@/services/InputService';
import { CommandStack } from '@/commands/CommandStack';
import { PointTool } from '@/tools/PointTool';
import { LineTool } from '@/tools/LineTool';
import { SegmentTool } from '@/tools/SegmentTool';
import { CircleTool } from '@/tools/CircleTool';
import { GuideTool } from '@/tools/GuideTool';
import { IntersectionTool } from '@/tools/IntersectionTool';
import { TransportTool } from '@/tools/TransportTool';
import { useToolStore } from '@/stores/toolStore';
import { useViewStore } from '@/stores/viewStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useViewport } from '@/composables/useViewport';
import { useGlobalHoverHighlight } from '@/composables/useHoverHighlight';
import { screenTo3D } from '@/utils/coordinateTransform';
import type { ITool } from '@/tools/ITool';

// Define emits
const emit = defineEmits<{
  'update-3d-coordinates': [coords: { x: number; y: number; z: number } | null];
  'update-active-plane': [planeInfo: { id: string; name: string }];
}>();

const svgElement = ref<SVGSVGElement | null>(null);

// Active plane selection
const activePlane = ref<'proj_plane_H' | 'proj_plane_V'>('proj_plane_H');

// Dynamic canvas dimensions - updated based on container size
const canvasWidth = ref(1600);
const canvasHeight = ref(1000);

// Viewport transformation (pan/zoom)
const viewStore = useViewStore();
const viewport = computed<ViewportTransform>(() => {
  const vp = viewStore.viewportState.value;
  // Update Paper's viewport transform when it changes
  paper.setViewportTransform(vp);
  return vp;
});

// Setup viewport interactions (pan/zoom)
useViewport({ element: svgElement });

// Services
const paperService = new PaperService();
const svgRenderer = new SVGRenderer();
const inputService = new InputService();
const toolStore = useToolStore();
const selectionStore = useSelectionStore();
const hoverHighlight = useGlobalHoverHighlight();

// World instance - injected from App.vue
const world = inject<World>('world')!;
if (!world) {
  throw new Error('World not provided');
}

// Paper instance for spatial queries and rendering
const paper = new Paper();

// Command infrastructure - injected from App.vue
const commandStack = inject<CommandStack>('commandStack')!;
if (!commandStack) {
  throw new Error('CommandStack not provided');
}

// Tool registry - map tool names to tool instances
const tools: Record<string, ITool> = {
  'point': new PointTool(),
  'line': new LineTool(),
  'segment': new SegmentTool(),
  'circle': new CircleTool(),
  'guide': new GuideTool(),
  'intersection': new IntersectionTool(),
  'transport': new TransportTool(),
  // Future tools: etc.
};

// Reactivity trigger - increment this to force re-render after World changes
const worldVersion = ref(0);

// Throttle for coordinate updates (limits update frequency)
let lastCoordinateUpdate = 0;
const COORDINATE_UPDATE_THROTTLE_MS = 50; // 20fps for coordinate updates

// Watch active plane changes and emit to parent
watch(activePlane, (newPlane) => {
  const planeName = newPlane === 'proj_plane_H' ? 'P_H (Horizontal)' : 'P_V (Vertical)';
  emit('update-active-plane', { id: newPlane, name: planeName });
});

// Update canvas dimensions based on container size
function updateCanvasDimensions() {
  if (!svgElement.value) return;
  
  const rect = svgElement.value.getBoundingClientRect();
  // Use container dimensions as logical coordinates (1:1 mapping)
  canvasWidth.value = rect.width;
  canvasHeight.value = rect.height;
}

// Initialize fixed elements on mount
onMounted(() => {
  world.initializeFixedElements();
  worldVersion.value++; // Trigger initial render
  
  // Set initial canvas dimensions
  updateCanvasDimensions();
  
  // Update dimensions on window resize
  const resizeHandler = () => updateCanvasDimensions();
  window.addEventListener('resize', resizeHandler);
  
  console.log('World initialized');
  console.log('Points in world:', world.getAllPoints2D().length);
  console.log('Points:', world.getAllPoints2D().map(p => ({ id: p.id, type: p.type, planeId: p.planeId })));
  
  // Cleanup on unmount
  return () => {
    window.removeEventListener('resize', resizeHandler);
  };
});

// Get plane transforms for INPUT (canvas click → plane coordinates)
function getPlaneTransformsForInput(): Map<string, Matrix3> {
  const transforms = new Map<string, Matrix3>();
  
  const realizationH = world.getProjectionPlane2DRealization('proj_plane_H');
  const realizationV = world.getProjectionPlane2DRealization('proj_plane_V');
  
  if (realizationH) {
    transforms.set('proj_plane_H', realizationH.paperToPlane2D);  // paperToPlane2D for input
  }
  if (realizationV) {
    transforms.set('proj_plane_V', realizationV.paperToPlane2D);  // paperToPlane2D for input
  }
  
  return transforms;
}

// Get plane transforms for RENDERING (plane coordinates → paper coordinates)
function getPlaneTransformsForRendering(): Map<string, Matrix3> {
  const transforms = new Map<string, Matrix3>();
  
  const realizationH = world.getProjectionPlane2DRealization('proj_plane_H');
  const realizationV = world.getProjectionPlane2DRealization('proj_plane_V');
  
  if (realizationH) {
    transforms.set('proj_plane_H', realizationH.planeToPaper2D);  // planeToPaper2D for rendering
  }
  if (realizationV) {
    transforms.set('proj_plane_V', realizationV.planeToPaper2D);  // planeToPaper2D for rendering
  }
  
  return transforms;
}

// Generate primitives from World using PaperService
const primitives = computed(() => {
  // Access worldVersion to make this computed reactive to World changes
  worldVersion.value;
  
  // PaperService uses plane-to-paper transforms for rendering
  const planeTransforms = getPlaneTransformsForRendering();
  
  // Get hovered element from Paper for hover highlight styling
  const hoveredId = paper.getHoveredElement();
  let highlightedEntityIds: Set<string> | undefined;
  
  if (hoveredId) {
    highlightedEntityIds = new Set([hoveredId]);
  }
  
  // Add selected elements to highlighted set for selection highlight
  // Per ui-spec.md: Selection highlight uses blue outline (#0066CC, 2px)
  const selectedIds = selectionStore.selectedIdsArray;
  if (selectedIds.length > 0) {
    if (!highlightedEntityIds) {
      highlightedEntityIds = new Set();
    }
    selectedIds.forEach(id => highlightedEntityIds!.add(id));
  }
  
  const context: PrimitiveContext = {
    world,
    planeTransforms,
    highlightedEntityIds,
    activePlaneId: activePlane.value,  // FR-002: Active plane visual emphasis
  };
  
  const prims = paperService.generatePrimitives(context);
  // console.log('Generated primitives:', prims.length, prims);
  
  // Sort primitives by layer first, then z-index (same as Paper.getPrimitives())
  prims.sort((a, b) => {
    if (a.layer !== b.layer) {
      return a.layer - b.layer;
    }
    return a.style.zIndex - b.style.zIndex;
  });
  
  // Update Paper with primitives for spatial queries (hit testing)
  paper.setPrimitives(prims);
  
  return prims;
});

// Render primitives to SVG attributes
const renderedPoints = computed(() => {
  return primitives.value
    .filter(p => p.type === 'point')
    .map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value);
      // console.log('Rendering point primitive:', p, '→ SVG attrs:', result.attributes);
      return {
        primitive: p,
        attrs: result.attributes
      };
    });
});

const renderedLines = computed(() => {
  return primitives.value
    .filter(p => p.type === 'line')
    .map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value);
      // console.log('Rendering line primitive:', p, '→ SVG attrs:', result.attributes);
      return {
        primitive: p,
        attrs: result.attributes
      };
    });
});

const renderedSegments = computed(() => {
  return primitives.value
    .filter(p => p.type === 'segment')
    .map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value);
      // console.log('Rendering segment primitive:', p, '→ SVG attrs:', result.attributes);
      return {
        primitive: p,
        attrs: result.attributes
      };
    });
});

const renderedCircles = computed(() => {
  return primitives.value
    .filter(p => p.type === 'circle')
    .map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value);
      // console.log('Rendering circle primitive:', p, '→ SVG attrs:', result.attributes);
      return {
        primitive: p,
        attrs: result.attributes
      };
    });
});

const renderedGuides = computed(() => {
  return primitives.value
    .filter(p => p.type === 'guide')
    .map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value);
      return {
        primitive: p,
        attrs: result.attributes
      };
    });
});

const renderedArcs = computed(() => {
  return primitives.value
    .filter(p => p.type === 'arc')
    .map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value);
      return {
        primitive: p,
        attrs: result.attributes
      };
    });
});

/**
 * Handle canvas click - delegate to active tool
 * Phase 6.5: Unified tool delegation for all tools (point, line, circle, etc.)
 */
function handleCanvasClick(event: MouseEvent) {
  // Get SVG element for coordinate conversion
  if (!svgElement.value) return;
  
  // T030: Transform coordinates: Screen → Canvas using SVG's native methods
  // Use SVG's built-in coordinate transformation
  const svg = svgElement.value;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  
  // Transform screen coordinates to SVG coordinates
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  
  const canvasPoint = pt.matrixTransform(ctm.inverse());
  
  console.log('[SvgCanvas] Click at canvas coords:', { x: canvasPoint.x, y: canvasPoint.y });
  
  // Step 2-3: Canvas → Paper → Plane using InputService
  const activePlaneId = activePlane.value;
  const planeTransforms = getPlaneTransformsForInput();
  const planeTransform = planeTransforms.get(activePlaneId);
  
  if (!planeTransform) {
    console.error('[SvgCanvas] No transform for active plane:', activePlaneId);
    return;
  }
  
  const planePos = inputService.canvasToPlaneCoordinates(
    canvasPoint.x,
    canvasPoint.y,
    planeTransform,
    viewport.value
  );
  
  if (!planePos) {
    console.error('[SvgCanvas] Failed to convert canvas to plane coordinates');
    return;
  }
  
  console.log('[SvgCanvas] Plane coords (u,v,w):', planePos);
  
  // Debug: Check what Paper.hitTest() would return for this click
  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const paperToPlane = planeTransforms.get(activePlane.value);
  const hit = paper.hitTest(canvasPos, 20, activePlane.value, paperToPlane, world);  // FR-002: Hit test in plane space
  console.log('[SvgCanvas] Paper.hitTest() result:', hit);
  console.log('[SvgCanvas] Paper has', paper.size, 'primitives');
  
  // Phase 20: Handle selection mode when 'select' tool is active
  const activeToolName = toolStore.currentTool.value;
  
  if (activeToolName === 'select') {
    // Selection mode per ui-spec.md §Element Interaction
    // Click element: Select (Shift+click: add to selection)
    // Click empty: Deselect all
    
    const hit = paper.hitTest(canvasPos, 20, activePlane.value, paperToPlane, world);
    
    if (hit) {
      // Element clicked - handle selection
      if (event.shiftKey) {
        // Shift+click: Add to selection (multi-select)
        selectionStore.addToSelection(hit.elementId);
        console.log('[SvgCanvas] Added to selection:', hit.elementId);
      } else {
        // Regular click: Single selection (replaces current selection)
        selectionStore.selectSingle(hit.elementId);
        console.log('[SvgCanvas] Selected:', hit.elementId);
      }
    } else {
      // Clicked empty space - clear selection
      selectionStore.clearSelection();
      console.log('[SvgCanvas] Cleared selection');
    }
    return;
  }
  
  // Phase 6.5: Delegate to active tool instead of direct World mutation
  const activeTool = tools[activeToolName];
  
  if (!activeTool) {
    console.warn(`[SvgCanvas] No tool implementation for: ${activeToolName}`);
    return;
  }
  
  // Delegate to tool with context including both canvas and plane coordinates
  const result = activeTool.handleClick({
    planeId: activePlaneId,
    planeCoords: planePos,
    canvasCoords: { x: canvasPoint.x, y: canvasPoint.y },
    commandStack,
    world,
    paper,
    paperToPlaneTransform: paperToPlane
  });
  
  if (result.success) {
    console.log('[SvgCanvas] Tool operation succeeded:', result.message);
    // Trigger reactivity - World was mutated via command
    worldVersion.value++;
    console.log('[SvgCanvas] Reactivity triggered, worldVersion:', worldVersion.value);
  } else {
    console.error('[SvgCanvas] Tool operation failed:', result.message);
  }
}

/**
 * Handle mouse movement for hover feedback and 3D coordinate display
 * Uses Paper.hitTest() to detect elements near cursor
 * Computes 3D coordinates from cursor position with debouncing
 */
function handleMouseMove(event: MouseEvent) {
  if (!svgElement.value) return;
  
  // Get canvas position (in SVG user space)
  const svg = svgElement.value;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  
  const canvasPoint = pt.matrixTransform(ctm.inverse());
  
  // Get paperToPlane transform for active plane
  const planeTransformsInput = getPlaneTransformsForInput();
  const paperToPlane = planeTransformsInput.get(activePlane.value);
  
  // Get active tool's selection mask
  const activeToolName = toolStore.currentTool.value;
  const activeTool = tools[activeToolName];
  const selectionMask = activeTool?.getSelectionMask();
  
  // Use Paper.hitTest() to find element near cursor (filtered by selection mask)
  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const hit = paper.hitTest(canvasPos, 20, activePlane.value, paperToPlane, world, selectionMask); // FR-002: Hit test in plane space
  
  // Update hover state in Paper only if it changed
  const previousHovered = paper.getHoveredElement();
  const newHovered = hit?.elementId;
  
  if (previousHovered !== newHovered) {
    paper.setHoveredElement(newHovered);
    
    // Update global hover state for UI feedback
    if (newHovered && hit) {
      hoverHighlight.setHoveredElement(
        newHovered,
        hit.elementType,
        newHovered, // Use element ID as label for now
        false // Not temporary - show tooltip
      );
    } else {
      hoverHighlight.clearHover();
    }
    
    // Trigger re-render only when hover state actually changes
    worldVersion.value++;
  }
  
  // Compute 3D coordinates with throttling (limits update frequency)
  const now = Date.now();
  if (now - lastCoordinateUpdate < COORDINATE_UPDATE_THROTTLE_MS) {
    return; // Skip this update, too soon since last one
  }
  lastCoordinateUpdate = now;
  
  // Get viewport transform matrix
  const viewportState = viewport.value;
  
  // Convert ViewportTransform to Matrix3
  const s = 1 / viewportState.zoom;
  const tx = -viewportState.panX;
  const ty = -viewportState.panY;
  const viewportMatrix = new Matrix3().set(
    s,  0,  tx,
    0,  s,  ty,
    0,  0,  1
  );
  
  // Compute 3D coordinates through full transformation pipeline
  const result = screenTo3D(
    event.clientX,
    event.clientY,
    svg,
    viewportMatrix,
    activePlane.value,
    world
  );
  
  if (result.success && result.coordinates) {
    emit('update-3d-coordinates', result.coordinates);
  } else {
    // Cursor not over plane or error - emit null
    emit('update-3d-coordinates', null);
  }
}

</script>

<style scoped>
.svg-canvas-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  overflow: hidden;
  position: relative;
}

.plane-selector {
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
  align-items: center;
}

.plane-selector label {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.plane-selector button {
  padding: 6px 12px;
  border: 1px solid #999;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.plane-selector button:hover {
  background-color: #e8e8e8;
}

.plane-selector button.active {
  background-color: #4A90E2;
  color: #fff;
  border-color: #4A90E2;
  font-weight: 600;
}

.svg-canvas {
  flex: 1;
  width: 100%;
  display: block;
}

/* FR-002: Smooth opacity transitions for active plane emphasis */
.svg-canvas circle,
.svg-canvas line,
.svg-canvas path,
.svg-canvas rect {
  transition: opacity 0.2s ease-in-out;
}
</style>
