<template>
  <div class="svg-canvas-container">
    <svg
      ref="svgElement"
      class="svg-canvas"
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
      preserveAspectRatio="xMidYMid meet"
      @mousedown="handleMouseDown"
      @click="handleCanvasClick"
      @dblclick="handleDoubleClick"
      @mousemove="handleMouseMove"
      @wheel.prevent="handleWheel"
    >
      <!-- Background grid (T275) - Zoom-adaptive grid display -->
      <g v-if="viewStore.gridVisible.value" class="background-grid">
        <line
          v-for="line in gridLines"
          :key="line.key"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
          :stroke="line.major ? '#C0C0C0' : '#E0E0E0'"
          :stroke-width="line.major ? 1 : 0.5"
        />
      </g>
      
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
      
      <!-- Snap preview indicator - orange glow around snap target point -->
      <circle
        v-if="snapTarget.pointId && snapTarget.position"
        :cx="snapTarget.position.x"
        :cy="snapTarget.position.y"
        :r="8"
        fill="none"
        stroke="#FF6B35"
        stroke-width="2"
        opacity="0.8"
        class="snap-indicator"
      />
      
      <!-- Grid coordinate labels (Phase 78) - Display u,v values at viewport borders -->
      <g v-if="viewStore.gridVisible.value" class="grid-labels">
        <!-- Top edge labels (U-coordinates) -->
        <text
          v-for="label in gridLabels.top"
          :key="label.key"
          :x="label.position"
          :y="12"
          class="grid-label"
          text-anchor="middle"
        >
          {{ label.value }}
        </text>
        
        <!-- Bottom edge labels (U-coordinates) -->
        <text
          v-for="label in gridLabels.bottom"
          :key="label.key"
          :x="label.position"
          :y="canvasHeight - 4"
          class="grid-label"
          text-anchor="middle"
        >
          {{ label.value }}
        </text>
        
        <!-- Left edge labels (V-coordinates) -->
        <text
          v-for="label in gridLabels.left"
          :key="label.key"
          :x="4"
          :y="label.position"
          class="grid-label"
          text-anchor="start"
          dominant-baseline="middle"
        >
          {{ label.value }}
        </text>
        
        <!-- Right edge labels (V-coordinates) -->
        <text
          v-for="label in gridLabels.right"
          :key="label.key"
          :x="canvasWidth - 4"
          :y="label.position"
          class="grid-label"
          text-anchor="end"
          dominant-baseline="middle"
        >
          {{ label.value }}
        </text>
      </g>
    </svg>
    
    <!-- Hover tooltip -->
    <div 
      v-if="hoverHighlight.isHovering.value && hoverHighlight.hoveredElementLabel.value && hoverHighlight.temporary && !hoverHighlight.temporary.value"
      class="hover-tooltip"
      :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }"
    >
      {{ hoverHighlight.hoveredElementLabel.value }}
    </div>
    
    <!-- Properties Dialog -->
    <PropertiesDialog
      :is-open="showPropertiesDialog"
      :element-id="propertiesElementId"
      :world="world"
      @close="showPropertiesDialog = false"
      @save="handleSaveProperties"
    />
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

import { ref, computed, watch, onMounted, onUnmounted, inject, provide } from 'vue';
import { Matrix3, Vector3 } from 'three';
import { World } from '@/domain/world/World';
import { Paper } from '@/domain/presentation/Paper';
import { PaperService, type PrimitiveContext } from '@/services/PaperService';
import { SVGRenderer, type ViewportTransform } from '@/services/SVGRenderer';
import { InputService } from '@/services/InputService';
import { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import { PointTool } from '@/tools/PointTool';
import { LineTool } from '@/tools/LineTool';
import { SegmentTool } from '@/tools/SegmentTool';
import { CircleTool } from '@/tools/CircleTool';
import { GuideTool } from '@/tools/GuideTool';
import { IntersectionTool } from '@/tools/IntersectionTool';
import { ParallelLineTool } from '@/tools/ParallelLineTool';
import { PerpendicularLineTool } from '@/tools/PerpendicularLineTool';
import { TangentLineToCircleThroughPointTool } from '@/tools/TangentLineToCircleThroughPointTool';
import { TangentLineToCircleParallelToLineTool } from '@/tools/TangentLineToCircleParallelToLineTool';
import { Create3DPointTool } from '@/tools/Create3DPointTool';
import { Create3DLineTool } from '@/tools/Create3DLineTool';
import { Create3DSegmentTool } from '@/tools/Create3DSegmentTool';
import { Create3DPlaneTool } from '@/tools/Create3DPlaneTool';
import { CreateProjectionPlaneTool } from '@/tools/CreateProjectionPlaneTool';
import { InteractiveProjectionSetupTool } from '@/tools/ExampleConstructionsTool';
import { QuickProjectionSetupTool } from '@/tools/QuickProjectionSetupTool';
import { FreePoint2D } from '@/domain/world/Point';
import { useToolStore } from '@/stores/toolStore';
import { useViewStore } from '@/stores/viewStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useViewport } from '@/composables/useViewport';
import { useGlobalHoverHighlight } from '@/composables/useHoverHighlight';
import { screenTo3D } from '@/utils/coordinateTransform';
import PropertiesDialog from '@/components/dialogs/PropertiesDialog.vue';
import type { ITool } from '@/tools/ITool';

// Define emits
const emit = defineEmits<{
  'update-3d-coordinates': [coords: { x: number; y: number; z: number } | null];
  'update-active-plane': [planeInfo: { id: string; name: string }];
}>();

const svgElement = ref<SVGSVGElement | null>(null);

// Track World version changes (World is not reactive by itself)
const worldVersion = ref(0);
let versionPollId: number | null = null;
let lastWorldVersion = 0;

// Active plane - derived from World (managed by App.vue)
const activePlane = computed(() => {
  // Depend on worldVersion so plane switching triggers recomputation
  const _ = worldVersion.value;
  return world.getActivePlaneId();
});

// Dynamic canvas dimensions - updated based on container size
const canvasWidth = ref(1600);
const canvasHeight = ref(1000);

// Properties dialog state
const showPropertiesDialog = ref(false);
const propertiesElementId = ref<string | null>(null);

// Viewport transformation (pan/zoom)
const viewStore = useViewStore();
const viewport = computed<ViewportTransform>(() => {
  const vp = viewStore.viewportState.value;
  // Update Paper's viewport transform when it changes
  paper.setViewportTransform(vp);
  return vp;
});

// Setup viewport interactions (pan/zoom)
const viewportComposable = useViewport({ element: svgElement });

// Services
const paperService = new PaperService();
const svgRenderer = new SVGRenderer();
const inputService = new InputService();
const toolStore = useToolStore();
const selectionStore = useSelectionStore();
const hoverHighlight = useGlobalHoverHighlight();

// Tooltip position (offset from cursor)
const tooltipPosition = ref({ x: 0, y: 0 });

// Snap target tracking - shows visual indicator when hovering near a point
const snapTarget = ref<{ pointId: string | null; position: { x: number; y: number } | null }>({
  pointId: null,
  position: null
});

// Drag-to-move (Select mode)
const pointDrag = ref<{
  active: boolean;
  planeId: string | null;
  pointId: string | null;
  cmd: Command | null;
  startClientX: number;
  startClientY: number;
  moved: boolean;
}>({
  active: false,
  planeId: null,
  pointId: null,
  cmd: null,
  startClientX: 0,
  startClientY: 0,
  moved: false
});

// Viewport pan in select mode (T965: drag empty space pans)
const viewportPan = ref<{
  active: boolean;
  startX: number;
  startY: number;
}>({
  active: false,
  startX: 0,
  startY: 0
});

let ignoreNextClick = false;

function isMovableFreePoint(point: any): point is FreePoint2D {
  return point instanceof FreePoint2D && !point.locked;
}

function endPointDrag(commit: boolean): void {
  if (!pointDrag.value.active) return;

  const cmd = pointDrag.value.cmd;

  try {
    if (cmd) {
      if (commit && (cmd as any).operations && (cmd as any).operations.length > 0) {
        cmd.commit();
        commandStack.push(cmd);
      } else {
        cmd.rollback();
      }
    }
  } finally {
    pointDrag.value = {
      active: false,
      planeId: null,
      pointId: null,
      cmd: null,
      startClientX: 0,
      startClientY: 0,
      moved: false
    };
    renderTick.value++;
  }
}

function handleGlobalKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    // T956: Cancel viewport pan on Esc
    if (viewportPan.value.active) {
      viewportPan.value = {
        active: false,
        startX: 0,
        startY: 0
      };
      return;
    }
    
    // T956: Cancel point drag on Esc
    if (pointDrag.value.active) {
      ignoreNextClick = true;
      endPointDrag(false);
    }
  }
}

/**
 * Get display label for an element
 * @param elementId - ID of the element
 * @param elementType - Type of the element (point, line, segment, etc.)
 * @param planeId - ID of the plane containing the element (optional, will search all planes if not provided)
 */
function getElementLabel(elementId: string, elementType: string, planeId?: string): string {
  let element: any;
  
  // If planeId is provided, only search that plane
  if (planeId) {
    const plane = world.getProjectionPlaneById(planeId);
    if (plane) {
      switch (elementType) {
        case 'point':
          element = plane.getPoint(elementId);
          break;
        case 'line':
        case 'half-hinge-line':
        case 'segment':  // Segments are Line2D objects, use getLine
        case 'guide':  // Guides are Line2D objects, use getLine
          element = plane.getLine(elementId);
          break;
        case 'circle':
          element = plane.getCircle(elementId);
          break;
        case 'arc':
          element = plane.getArc(elementId);
          break;
      }
    }
  } else {
    // Search all planes if no planeId provided
    for (const plane of world.projectionPlanes.values()) {
      switch (elementType) {
        case 'point':
          element = plane.getPoint(elementId);
          break;
        case 'line':
        case 'half-hinge-line':
        case 'segment':  // Segments are Line2D objects, use getLine
        case 'guide':  // Guides are Line2D objects, use getLine
          element = plane.getLine(elementId);
          break;
        case 'circle':
          element = plane.getCircle(elementId);
          break;
        case 'arc':
          element = plane.getArc(elementId);
          break;
      }
      if (element) break; // Found it
    }
  }
  
  return element ? element.label || elementId : elementId;
}

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
  'parallel-line': new ParallelLineTool(),
  'perpendicular-line': new PerpendicularLineTool(),
  'tangent-line-to-circle-through-point': new TangentLineToCircleThroughPointTool(),
  'tangent-line-to-circle-parallel': new TangentLineToCircleParallelToLineTool(),
  // Phase 78: 3D Element Creation Tools
  'create3dpoint': new Create3DPointTool(),
  'create3dline': new Create3DLineTool(),
  'create3dsegment': new Create3DSegmentTool(),
  'create3dplane': new Create3DPlaneTool(),
  // Phase 82: Auxiliary Projection Plane Tool
  'createprojectionplane': new CreateProjectionPlaneTool(),
  'interactiveprojectionsetup': new InteractiveProjectionSetupTool(),
  'quickprojectionsetup': new QuickProjectionSetupTool(),
};

// Reactivity trigger - increment this to force re-render when non-reactive state changes (e.g. Paper hover)
const renderTick = ref(0);

// Throttle for coordinate updates (limits update frequency)
let lastCoordinateUpdate = 0;
const COORDINATE_UPDATE_THROTTLE_MS = 50; // 20fps for coordinate updates

// Update canvas dimensions based on container size
function updateCanvasDimensions() {
  if (!svgElement.value) return;
  
  const rect = svgElement.value.getBoundingClientRect();
  // Use container dimensions as logical coordinates (1:1 mapping)
  canvasWidth.value = rect.width;
  canvasHeight.value = rect.height;
}

// Initialize canvas on mount
const resizeHandler = () => updateCanvasDimensions();

onMounted(() => {
  // World is already initialized by initialization factory in constructor
  // Just trigger initial render
  renderTick.value++;

  // Set initial canvas dimensions
  updateCanvasDimensions();

  // Update dimensions on window resize
  window.addEventListener('resize', resizeHandler);

  // Poll World version so UI reacts to domain changes (e.g. active plane switching)
  lastWorldVersion = world.getVersion();
  worldVersion.value = lastWorldVersion;
  versionPollId = window.setInterval(() => {
    const current = world.getVersion();
    if (current !== lastWorldVersion) {
      lastWorldVersion = current;
      worldVersion.value = current;
      renderTick.value++;
    }
  }, 100);

  console.log('World initialized');
  const allPlanes = world.getAllProjectionPlanes();
  const totalPoints = allPlanes.reduce((sum, plane) => sum + plane.getAllPoints().length, 0);
  console.log('Points in world:', totalPoints);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('keydown', handleGlobalKeyDown);
  if (versionPollId !== null) {
    clearInterval(versionPollId);
  }
});

// Global key handling (Esc cancels point-drag)
onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
});

// Get plane transforms for INPUT (canvas click → plane coordinates)
function getPlaneTransformsForInput(): Map<string, Matrix3> {
  const transforms = new Map<string, Matrix3>();
  
  // Get all projection planes dynamically
  for (const plane of world.getAllProjectionPlanes()) {
    const realization = world.getProjectionPlane2DRealization(plane.id);
    if (realization) {
      transforms.set(plane.id, realization.paperToPlane2D);
    }
  }
  
  return transforms;
}

// Get plane transforms for RENDERING (plane coordinates → paper coordinates)
function getPlaneTransformsForRendering(): Map<string, Matrix3> {
  const transforms = new Map<string, Matrix3>();
  
  // Get all projection planes dynamically
  for (const plane of world.getAllProjectionPlanes()) {
    const realization = world.getProjectionPlane2DRealization(plane.id);
    if (realization) {
      transforms.set(plane.id, realization.planeToPaper2D);
    }
  }
  
  return transforms;
}

// Generate primitives from World using PaperService
const primitives = computed(() => {
  // Access renderTick to make this computed reactive to non-reactive sources (World + Paper)
  renderTick.value;
  
  // PaperService uses plane-to-paper transforms for rendering
  const planeTransforms = getPlaneTransformsForRendering();
  
  // Get hovered and selected elements for visual highlighting
  // Per ui-spec.md: Hover = #4A90E2 (lighter), Selection = #0066CC (bold)
  const hoveredId = paper.getHoveredElement();
  const hoveredIds = hoveredId ? new Set([hoveredId]) : undefined;
  
  const selectedIds = selectionStore.selectedIdsArray;
  const selectedIdsSet = selectedIds.length > 0 ? new Set(selectedIds) : undefined;
  
  const cascadeHighlightIds = selectionStore.cascadeHighlightIdsArray;
  const cascadeHighlightIdsSet = cascadeHighlightIds.length > 0 ? new Set(cascadeHighlightIds) : undefined;
  
  const context: PrimitiveContext = {
    world,
    planeTransforms,
    hoveredIds,              // Hover state (lighter highlight)
    selectedIds: selectedIdsSet,  // Selection state (bold highlight)
    cascadeHighlightIds: cascadeHighlightIdsSet,  // Cascade delete preview (orange warning)
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

/**
 * Phase 79: Plane-Based Grid with Adaptive Spacing/Subdivisions
 * 
 * Grid uses the active projection plane's intrinsic (u,v) coordinate system
 * Transformation pipeline: Plane (u,v) → Paper (x,y) → Screen (pixels)
 * 
 * Major Grid Lines (Powers of 10):
 * - Major lines always at multiples of 10^n (e.g., 0.1, 1, 10, 100, 1000)
 * - Power of 10 chosen based on zoom level to keep reasonable density
 * 
 * Subdivisions (2, 5, or 10):
 * - Minor lines divide each major interval by 2, 5, or 10
 * - Subdivision chosen to keep minor cells >= minimum pixel threshold (15px)
 * - Preference: smallest subdivision that meets threshold (10 > 5 > 2)
 * 
 * Algorithm:
 * - Calculate minimum spacing in plane units: minSpacing = minPixelsPerCell / zoom
 * - Find smallest value from sequence: 10^n/10, 10^n/5, 10^n/2 that is >= minSpacing
 * - This determines both minor spacing and major spacing (10^n)
 * - Example at zoom=1.0: minSpacing=15, chooses 20 (=100/5), major=100, subdivision=5
 * - Example at zoom=0.1: minSpacing=150, chooses 200 (=1000/5), major=1000, subdivision=5
 */

/**
 * Compute adaptive grid parameters based on zoom level
 * Major lines at powers of 10, subdivisions are 2, 5, or 10
 */
function computeAdaptiveGridParams(zoom: number): {
  spacing: number;
  subdivision: number;
  majorSpacing: number;
} {
  const minPixelsPerCell = 15; // Minimum pixels per minor grid cell
  const minSpacing = minPixelsPerCell / zoom; // Minimum spacing in plane units
  
  // Find the smallest spacing from sequence: ..., 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, ...
  // These are 10^n/10, 10^n/5, 10^n/2 for integer n
  
  const logMin = Math.log10(minSpacing);
  const basePower = Math.floor(logMin);
  
  // Try powers of 10 starting from basePower
  for (let n = basePower; n < basePower + 3; n++) {
    const base = Math.pow(10, n);
    
    // Try subdivisions in order of preference (10 > 5 > 2 gives smallest cells)
    for (const subdivision of [10, 5, 2]) {
      const spacing = base / subdivision; // Minor line spacing
      if (spacing >= minSpacing) {
        return {
          spacing,           // Minor line spacing (spacing between all lines)
          subdivision,       // Number of minor intervals per major interval
          majorSpacing: base // Major line spacing (10^n)
        };
      }
    }
  }
  
  // Fallback (shouldn't reach here)
  return { spacing: 1, subdivision: 10, majorSpacing: 10 };
}

const gridLines = computed(() => {
  if (!viewStore.gridVisible.value) return [];

  // Depend on worldVersion to trigger recomputation when active plane changes
  const _ = worldVersion.value;
  
  const activePlaneId = world.getActivePlaneId();
  const plane = world.getProjectionPlaneById(activePlaneId);
  if (!plane) return [];

  // Get plane realization which contains transformation matrices
  const planeRealization = plane.realize2D(world);

  const zoom = viewport.value.zoom;
  const { spacing, subdivision, majorSpacing } = computeAdaptiveGridParams(zoom);

  const lines: Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    major: boolean;
  }> = [];

  // Phase 82.2: Transform intrinsic basis to paper space
  // This approach works for both base planes (identity-like) and auxiliary planes (rotated)
  const origin_paper = new Vector3(0, 0, 1).applyMatrix3(planeRealization.planeToPaper2D);
  const u_paper = new Vector3(1, 0, 0).applyMatrix3(planeRealization.planeToPaper2D);
  const v_paper = new Vector3(0, 1, 0).applyMatrix3(planeRealization.planeToPaper2D);

  // DEBUG: Log the transformed basis vectors and viewport state
  // console.log('[gridLines] origin_paper:', origin_paper);
  // console.log('[gridLines] u_paper:', u_paper);
  // console.log('[gridLines] v_paper:', v_paper);
  // console.log('[gridLines] viewport.panX:', viewport.value.panX, 'panY:', viewport.value.panY);
  // console.log('[gridLines] viewport.zoom:', viewport.value.zoom);
  // console.log('[gridLines] canvasWidth:', canvasWidth.value, 'canvasHeight:', canvasHeight.value);

  // Calculate viewport bounds in paper coordinates
  const viewportWidth = canvasWidth.value / zoom;
  const viewportHeight = canvasHeight.value / zoom;
  const offsetX = -viewport.value.panX;
  const offsetY = -viewport.value.panY;
  
  // console.log('[gridLines] viewportWidth:', viewportWidth, 'viewportHeight:', viewportHeight);
  // console.log('[gridLines] offsetX:', offsetX, 'offsetY:', offsetY);
  // console.log('[gridLines] viewport top-left corner in paper:', offsetX, offsetY);
  // console.log('[gridLines] viewport center in paper:', offsetX + viewportWidth/2, offsetY + viewportHeight/2);

  // Viewport corners in paper coordinates
  const viewport_corners_paper = [
    new Vector3(offsetX, offsetY, 1),
    new Vector3(offsetX + viewportWidth, offsetY, 1),
    new Vector3(offsetX, offsetY + viewportHeight, 1),
    new Vector3(offsetX + viewportWidth, offsetY + viewportHeight, 1)
  ];

  // Project viewport corners onto intrinsic axes to find (u,v) range
  // For each corner: solve (corner - origin_paper) = a*u_paper + b*v_paper
  const u_coords = viewport_corners_paper.map(corner => {
    const offset = new Vector3().subVectors(corner, origin_paper);
    return offset.dot(u_paper) / u_paper.lengthSq();
  });
  const v_coords = viewport_corners_paper.map(corner => {
    const offset = new Vector3().subVectors(corner, origin_paper);
    return offset.dot(v_paper) / v_paper.lengthSq();
  });

  const uMin = Math.min(...u_coords);
  const uMax = Math.max(...u_coords);
  const vMin = Math.min(...v_coords);
  const vMax = Math.max(...v_coords);

  // Round to nearest grid spacing (add margin for partial grid lines at edges)
  const uStart = Math.floor(uMin / spacing) * spacing;
  const uEnd = Math.ceil(uMax / spacing) * spacing;
  const vStart = Math.floor(vMin / spacing) * spacing;
  const vEnd = Math.ceil(vMax / spacing) * spacing;

  // Generate grid lines parallel to v-axis (constant u, extending along v)
  for (let u = uStart; u <= uEnd; u += spacing) {
    const isMajor = Math.abs(u % majorSpacing) < 0.01;

    // Line in paper space: origin + u*u_paper + t*v_paper (t varies from vMin to vMax)
    const base_paper = new Vector3()
      .addVectors(origin_paper, new Vector3().copy(u_paper).multiplyScalar(u));
    
    const p1_paper = new Vector3()
      .addVectors(base_paper, new Vector3().copy(v_paper).multiplyScalar(vMin));
    const p2_paper = new Vector3()
      .addVectors(base_paper, new Vector3().copy(v_paper).multiplyScalar(vMax));

    // Transform to screen coordinates
    const screenX1 = (p1_paper.x + viewport.value.panX) * zoom;
    const screenY1 = (p1_paper.y + viewport.value.panY) * zoom;
    const screenX2 = (p2_paper.x + viewport.value.panX) * zoom;
    const screenY2 = (p2_paper.y + viewport.value.panY) * zoom;

    lines.push({
      key: `u-${u}`,
      x1: screenX1,
      y1: screenY1,
      x2: screenX2,
      y2: screenY2,
      major: isMajor,
    });
  }

  // Generate grid lines parallel to u-axis (constant v, extending along u)
  for (let v = vStart; v <= vEnd; v += spacing) {
    const isMajor = Math.abs(v % majorSpacing) < 0.01;

    // Line in paper space: origin + t*u_paper + v*v_paper (t varies from uMin to uMax)
    const base_paper = new Vector3()
      .addVectors(origin_paper, new Vector3().copy(v_paper).multiplyScalar(v));
    
    const p1_paper = new Vector3()
      .addVectors(base_paper, new Vector3().copy(u_paper).multiplyScalar(uMin));
    const p2_paper = new Vector3()
      .addVectors(base_paper, new Vector3().copy(u_paper).multiplyScalar(uMax));

    // Transform to screen coordinates
    const screenX1 = (p1_paper.x + viewport.value.panX) * zoom;
    const screenY1 = (p1_paper.y + viewport.value.panY) * zoom;
    const screenX2 = (p2_paper.x + viewport.value.panX) * zoom;
    const screenY2 = (p2_paper.y + viewport.value.panY) * zoom;

    lines.push({
      key: `v-${v}`,
      x1: screenX1,
      y1: screenY1,
      x2: screenX2,
      y2: screenY2,
      major: isMajor,
    });
  }

  return lines;
});

/**
 * Phase 78: Grid Coordinate Labels (Updated for Phase 79 plane-based grid)
 * GridLabel interface for coordinate label display at viewport borders
 */
interface GridLabel {
  key: string;
  value: number;
  position: number;
  edge: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Computed property: Grid coordinate labels for all four viewport edges
 * Displays plane-local (u,v) coordinates aligned with the plane-based grid
 * Labels are placed along major grid lines only
 */
const gridLabels = computed(() => {
  if (!viewStore.gridVisible.value) {
    return { top: [], bottom: [], left: [], right: [] };
  }

  // Depend on worldVersion to trigger recomputation when active plane changes
  const _ = worldVersion.value;
  
  const activePlaneId = world.getActivePlaneId();
  const plane = world.getProjectionPlaneById(activePlaneId);
  if (!plane) {
    return { top: [], bottom: [], left: [], right: [] };
  }

  // Get plane realization which contains transformation matrices
  const planeRealization = plane.realize2D(world);

  const zoom = viewport.value.zoom;
  const { majorSpacing } = computeAdaptiveGridParams(zoom);

  // Phase 82.2: Transform intrinsic basis to paper space
  const origin_paper = new Vector3(0, 0, 1).applyMatrix3(planeRealization.planeToPaper2D);
  const u_paper = new Vector3(1, 0, 0).applyMatrix3(planeRealization.planeToPaper2D);
  const v_paper = new Vector3(0, 1, 0).applyMatrix3(planeRealization.planeToPaper2D);

  // Step 1: Determine which coordinate is more aligned with horizontal/vertical
  // If |u_paper.x| / |u_paper.y| > 1, u is more horizontal
  const uHorizontalRatio = Math.abs(u_paper.x) / (Math.abs(u_paper.y) + 1e-10);
  const uIsHorizontal = uHorizontalRatio > 1;
  
  // Helper: Convert screen coordinates to paper coordinates
  const screenToPaper = (screenX: number, screenY: number): Vector3 => {
    return new Vector3(
      screenX / zoom - viewport.value.panX,
      screenY / zoom - viewport.value.panY,
      1
    );
  };
  
  // Helper: Project paper point onto (u,v) basis
  const paperToUV = (p_paper: Vector3): { u: number; v: number } => {
    const offset = new Vector3().subVectors(p_paper, origin_paper);
    return {
      u: offset.dot(u_paper) / u_paper.lengthSq(),
      v: offset.dot(v_paper) / v_paper.lengthSq()
    };
  };
  
  // Helper: Find where grid line with constant u intersects a horizontal line (y_paper = constant)
  // Returns screen x position
  const findULineIntersectionWithHorizontal = (u: number, y_paper: number): number | null => {
    // Line: origin_paper + u*u_paper + v*v_paper
    // Want: origin_paper.y + u*u_paper.y + v*v_paper.y = y_paper
    // Solve for v: v = (y_paper - origin_paper.y - u*u_paper.y) / v_paper.y
    if (Math.abs(v_paper.y) < 1e-10) return null; // Grid line parallel to horizontal
    const v = (y_paper - origin_paper.y - u * u_paper.y) / v_paper.y;
    const x_paper = origin_paper.x + u * u_paper.x + v * v_paper.x;
    return (x_paper + viewport.value.panX) * zoom;
  };
  
  // Helper: Find where grid line with constant v intersects a horizontal line (y_paper = constant)
  // Returns screen x position
  const findVLineIntersectionWithHorizontal = (v: number, y_paper: number): number | null => {
    // Line: origin_paper + u*u_paper + v*v_paper
    // Want: origin_paper.y + u*u_paper.y + v*v_paper.y = y_paper
    // Solve for u: u = (y_paper - origin_paper.y - v*v_paper.y) / u_paper.y
    if (Math.abs(u_paper.y) < 1e-10) return null; // Grid line parallel to horizontal
    const u = (y_paper - origin_paper.y - v * v_paper.y) / u_paper.y;
    const x_paper = origin_paper.x + u * u_paper.x + v * v_paper.x;
    return (x_paper + viewport.value.panX) * zoom;
  };
  
  // Helper: Find where grid line with constant u intersects a vertical line (x_paper = constant)
  // Returns screen y position
  const findULineIntersectionWithVertical = (u: number, x_paper: number): number | null => {
    // Line: origin_paper + u*u_paper + v*v_paper
    // Want: origin_paper.x + u*u_paper.x + v*v_paper.x = x_paper
    // Solve for v: v = (x_paper - origin_paper.x - u*u_paper.x) / v_paper.x
    if (Math.abs(v_paper.x) < 1e-10) return null; // Grid line parallel to vertical
    const v = (x_paper - origin_paper.x - u * u_paper.x) / v_paper.x;
    const y_paper = origin_paper.y + u * u_paper.y + v * v_paper.y;
    return (y_paper + viewport.value.panY) * zoom;
  };
  
  // Helper: Find where grid line with constant v intersects a vertical line (x_paper = constant)
  // Returns screen y position
  const findVLineIntersectionWithVertical = (v: number, x_paper: number): number | null => {
    // Line: origin_paper + u*u_paper + v*v_paper
    // Want: origin_paper.x + u*u_paper.x + v*v_paper.x = x_paper
    // Solve for u: u = (x_paper - origin_paper.x - v*v_paper.x) / u_paper.x
    if (Math.abs(u_paper.x) < 1e-10) return null; // Grid line parallel to vertical
    const u = (x_paper - origin_paper.x - v * v_paper.x) / u_paper.x;
    const y_paper = origin_paper.y + u * u_paper.y + v * v_paper.y;
    return (y_paper + viewport.value.panY) * zoom;
  };

  const topLabels: GridLabel[] = [];
  const bottomLabels: GridLabel[] = [];
  const leftLabels: GridLabel[] = [];
  const rightLabels: GridLabel[] = [];

  if (uIsHorizontal) {
    // U varies along top/bottom edges, V varies along left/right edges
    
    // TOP EDGE (y_screen = 0 → y_paper = -panY)
    const y_paper_top = 0 / zoom - viewport.value.panY;
    const topLeft_uv = paperToUV(screenToPaper(0, 0));
    const topRight_uv = paperToUV(screenToPaper(canvasWidth.value, 0));
    const uMin_top = Math.min(topLeft_uv.u, topRight_uv.u);
    const uMax_top = Math.max(topLeft_uv.u, topRight_uv.u);
    const uStart_top = Math.floor(uMin_top / majorSpacing) * majorSpacing;
    const uEnd_top = Math.ceil(uMax_top / majorSpacing) * majorSpacing;
    
    for (let u = uStart_top; u <= uEnd_top; u += majorSpacing) {
      const screenX = findULineIntersectionWithHorizontal(u, y_paper_top);
      if (screenX !== null && screenX >= -10 && screenX <= canvasWidth.value + 10) {
        topLabels.push({ key: `top-${u}`, value: u, position: screenX, edge: 'top' });
      }
    }
    
    // BOTTOM EDGE (y_screen = canvasHeight → y_paper = canvasHeight/zoom - panY)
    const y_paper_bottom = canvasHeight.value / zoom - viewport.value.panY;
    const bottomLeft_uv = paperToUV(screenToPaper(0, canvasHeight.value));
    const bottomRight_uv = paperToUV(screenToPaper(canvasWidth.value, canvasHeight.value));
    const uMin_bottom = Math.min(bottomLeft_uv.u, bottomRight_uv.u);
    const uMax_bottom = Math.max(bottomLeft_uv.u, bottomRight_uv.u);
    const uStart_bottom = Math.floor(uMin_bottom / majorSpacing) * majorSpacing;
    const uEnd_bottom = Math.ceil(uMax_bottom / majorSpacing) * majorSpacing;
    
    for (let u = uStart_bottom; u <= uEnd_bottom; u += majorSpacing) {
      const screenX = findULineIntersectionWithHorizontal(u, y_paper_bottom);
      if (screenX !== null && screenX >= -10 && screenX <= canvasWidth.value + 10) {
        bottomLabels.push({ key: `bottom-${u}`, value: u, position: screenX, edge: 'bottom' });
      }
    }
    
    // LEFT EDGE (x_screen = 0 → x_paper = -panX)
    const x_paper_left = 0 / zoom - viewport.value.panX;
    const leftTop_uv = paperToUV(screenToPaper(0, 0));
    const leftBottom_uv = paperToUV(screenToPaper(0, canvasHeight.value));
    const vMin_left = Math.min(leftTop_uv.v, leftBottom_uv.v);
    const vMax_left = Math.max(leftTop_uv.v, leftBottom_uv.v);
    const vStart_left = Math.floor(vMin_left / majorSpacing) * majorSpacing;
    const vEnd_left = Math.ceil(vMax_left / majorSpacing) * majorSpacing;
    
    for (let v = vStart_left; v <= vEnd_left; v += majorSpacing) {
      const screenY = findVLineIntersectionWithVertical(v, x_paper_left);
      if (screenY !== null && screenY >= -10 && screenY <= canvasHeight.value + 10) {
        leftLabels.push({ key: `left-${v}`, value: v, position: screenY, edge: 'left' });
      }
    }
    
    // RIGHT EDGE (x_screen = canvasWidth → x_paper = canvasWidth/zoom - panX)
    const x_paper_right = canvasWidth.value / zoom - viewport.value.panX;
    const rightTop_uv = paperToUV(screenToPaper(canvasWidth.value, 0));
    const rightBottom_uv = paperToUV(screenToPaper(canvasWidth.value, canvasHeight.value));
    const vMin_right = Math.min(rightTop_uv.v, rightBottom_uv.v);
    const vMax_right = Math.max(rightTop_uv.v, rightBottom_uv.v);
    const vStart_right = Math.floor(vMin_right / majorSpacing) * majorSpacing;
    const vEnd_right = Math.ceil(vMax_right / majorSpacing) * majorSpacing;
    
    for (let v = vStart_right; v <= vEnd_right; v += majorSpacing) {
      const screenY = findVLineIntersectionWithVertical(v, x_paper_right);
      if (screenY !== null && screenY >= -10 && screenY <= canvasHeight.value + 10) {
        rightLabels.push({ key: `right-${v}`, value: v, position: screenY, edge: 'right' });
      }
    }
    
  } else {
    // V varies along top/bottom edges, U varies along left/right edges
    
    // TOP EDGE
    const y_paper_top = 0 / zoom - viewport.value.panY;
    const topLeft_uv = paperToUV(screenToPaper(0, 0));
    const topRight_uv = paperToUV(screenToPaper(canvasWidth.value, 0));
    const vMin_top = Math.min(topLeft_uv.v, topRight_uv.v);
    const vMax_top = Math.max(topLeft_uv.v, topRight_uv.v);
    const vStart_top = Math.floor(vMin_top / majorSpacing) * majorSpacing;
    const vEnd_top = Math.ceil(vMax_top / majorSpacing) * majorSpacing;
    
    for (let v = vStart_top; v <= vEnd_top; v += majorSpacing) {
      const screenX = findVLineIntersectionWithHorizontal(v, y_paper_top);
      if (screenX !== null && screenX >= -10 && screenX <= canvasWidth.value + 10) {
        topLabels.push({ key: `top-${v}`, value: v, position: screenX, edge: 'top' });
      }
    }
    
    // BOTTOM EDGE
    const y_paper_bottom = canvasHeight.value / zoom - viewport.value.panY;
    const bottomLeft_uv = paperToUV(screenToPaper(0, canvasHeight.value));
    const bottomRight_uv = paperToUV(screenToPaper(canvasWidth.value, canvasHeight.value));
    const vMin_bottom = Math.min(bottomLeft_uv.v, bottomRight_uv.v);
    const vMax_bottom = Math.max(bottomLeft_uv.v, bottomRight_uv.v);
    const vStart_bottom = Math.floor(vMin_bottom / majorSpacing) * majorSpacing;
    const vEnd_bottom = Math.ceil(vMax_bottom / majorSpacing) * majorSpacing;
    
    for (let v = vStart_bottom; v <= vEnd_bottom; v += majorSpacing) {
      const screenX = findVLineIntersectionWithHorizontal(v, y_paper_bottom);
      if (screenX !== null && screenX >= -10 && screenX <= canvasWidth.value + 10) {
        bottomLabels.push({ key: `bottom-${v}`, value: v, position: screenX, edge: 'bottom' });
      }
    }
    
    // LEFT EDGE
    const x_paper_left = 0 / zoom - viewport.value.panX;
    const leftTop_uv = paperToUV(screenToPaper(0, 0));
    const leftBottom_uv = paperToUV(screenToPaper(0, canvasHeight.value));
    const uMin_left = Math.min(leftTop_uv.u, leftBottom_uv.u);
    const uMax_left = Math.max(leftTop_uv.u, leftBottom_uv.u);
    const uStart_left = Math.floor(uMin_left / majorSpacing) * majorSpacing;
    const uEnd_left = Math.ceil(uMax_left / majorSpacing) * majorSpacing;
    
    for (let u = uStart_left; u <= uEnd_left; u += majorSpacing) {
      const screenY = findULineIntersectionWithVertical(u, x_paper_left);
      if (screenY !== null && screenY >= -10 && screenY <= canvasHeight.value + 10) {
        leftLabels.push({ key: `left-${u}`, value: u, position: screenY, edge: 'left' });
      }
    }
    
    // RIGHT EDGE
    const x_paper_right = canvasWidth.value / zoom - viewport.value.panX;
    const rightTop_uv = paperToUV(screenToPaper(canvasWidth.value, 0));
    const rightBottom_uv = paperToUV(screenToPaper(canvasWidth.value, canvasHeight.value));
    const uMin_right = Math.min(rightTop_uv.u, rightBottom_uv.u);
    const uMax_right = Math.max(rightTop_uv.u, rightBottom_uv.u);
    const uStart_right = Math.floor(uMin_right / majorSpacing) * majorSpacing;
    const uEnd_right = Math.ceil(uMax_right / majorSpacing) * majorSpacing;
    
    for (let u = uStart_right; u <= uEnd_right; u += majorSpacing) {
      const screenY = findULineIntersectionWithVertical(u, x_paper_right);
      if (screenY !== null && screenY >= -10 && screenY <= canvasHeight.value + 10) {
        rightLabels.push({ key: `right-${u}`, value: u, position: screenY, edge: 'right' });
      }
    }
  }

  return {
    top: topLabels,
    bottom: bottomLabels,
    left: leftLabels,
    right: rightLabels,
  };
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
    .filter(p => p.type === 'line' && p.id.startsWith('guide-'))
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
  if (ignoreNextClick) {
    ignoreNextClick = false;
    return;
  }

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
  
  // console.log('[SvgCanvas] Click at canvas coords:', { x: canvasPoint.x, y: canvasPoint.y });
  
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
  
  // console.log('[SvgCanvas] Plane coords (u,v,w):', planePos);
  
  // Debug: Check what Paper.hitTest() would return for this click
  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const paperToPlane = planeTransforms.get(activePlane.value);
  const hit = paper.hitTest(canvasPos, 20, activePlane.value, paperToPlane, world);  // FR-002: Hit test in plane space
  // console.log('[SvgCanvas] Paper.hitTest() result:', hit);
  // console.log('[SvgCanvas] Paper has', paper.size, 'primitives');
  
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
        // console.log('[SvgCanvas] Added to selection:', hit.elementId);
      } else {
        // Regular click: Single selection (replaces current selection)
        selectionStore.selectSingle(hit.elementId);
        // console.log('[SvgCanvas] Selected:', hit.elementId);
      }
    } else {
      // Clicked empty space - clear selection
      selectionStore.clearSelection();
      // console.log('[SvgCanvas] Cleared selection');
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
    paperToPlaneTransform: paperToPlane,
    toolStore
  });
  
  // Trigger reactivity regardless of success/failure
  // Even on failure, rollback or partial state changes may need visual refresh
  renderTick.value++;
  // console.log('[SvgCanvas] Reactivity triggered, renderTick:', renderTick.value);
  
  if (result.success) {
    console.log('[SvgCanvas] Tool operation succeeded:', result.message);
  } else {
    console.error('[SvgCanvas] Tool operation failed:', result.message);
  }
}

/**
 * Handle mouse wheel for zoom with mouse position as center (Phase 70)
 * Prevents default page scroll and zooms toward cursor position
 */
function handleWheel(event: WheelEvent) {
  if (!svgElement.value) return;

  // Get mouse position in canvas coordinates
  const svg = svgElement.value;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  
  const canvasPoint = pt.matrixTransform(ctm.inverse());

  // Get current viewport state BEFORE zoom
  const oldViewport = viewStore.viewportState.value;
  console.log('[Zoom] BEFORE:', {
    mouseCanvas: { x: canvasPoint.x, y: canvasPoint.y },
    zoom: oldViewport.zoom,
    pan: { x: oldViewport.panX, y: oldViewport.panY }
  });

  // Zoom factor: 10% per wheel notch (finer control than buttons' 20%)
  // deltaY > 0 = scroll down = zoom out (negative delta)
  // deltaY < 0 = scroll up = zoom in (positive delta)
  const delta = event.deltaY > 0 ? -0.1 : 0.1;

  // Use mouse position as zoom focus point
  viewStore.adjustZoom(delta, canvasPoint.x, canvasPoint.y);

  // Get viewport state AFTER zoom
  const newViewport = viewStore.viewportState.value;
  console.log('[Zoom] AFTER:', {
    zoom: newViewport.zoom,
    pan: { x: newViewport.panX, y: newViewport.panY },
    delta: delta
  });
}

/**
 * Handle mouse down for select-mode drag-to-move of free points.
 * T954: Check if clicking on movable point, start drag if so
 * T965: Otherwise, prepare for viewport pan
 */
function handleMouseDown(event: MouseEvent) {
  if (!svgElement.value) return;

  const activeToolName = toolStore.currentTool.value;
  if (activeToolName !== 'select') return;

  // Only left button drag, no modifiers (Shift is handled by useViewport)
  if (event.button !== 0) return;
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;

  const svg = svgElement.value;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const canvasPoint = pt.matrixTransform(ctm.inverse());

  const planeTransforms = getPlaneTransformsForInput();
  const paperToPlane = planeTransforms.get(activePlane.value);
  if (!paperToPlane) return;

  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const hit = paper.hitTest(canvasPos, 20, activePlane.value, paperToPlane, world);
  
  // Check if we hit a movable point
  if (hit && hit.elementType === 'point') {
    const plane = world.getProjectionPlaneById(activePlane.value);
    if (!plane) throw new Error(`Active plane not found: ${activePlane.value}`);
    const point = plane.getPoint(hit.elementId);
    
    if (point && isMovableFreePoint(point)) {
      // Start point drag (T954)
      selectionStore.selectSingle(hit.elementId);

      pointDrag.value = {
        active: true,
        planeId: activePlane.value,
        pointId: hit.elementId,
        cmd: new Command(`Move point ${point.label ?? hit.elementId}`, world),
        startClientX: event.clientX,
        startClientY: event.clientY,
        moved: false
      };
      return;
    }
  }
  
  // No movable point hit - start viewport pan (T965: Drag empty space pans)
  // Note: useViewport composable handles Shift+drag pan automatically
  // Here we handle non-Shift drag when selection tool is active
  viewportPan.value = {
    active: true,
    startX: event.clientX,
    startY: event.clientY
  };
}

/**
 * Handle double-click to show properties dialog
 * T188: Show properties dialog when user double-clicks an element
 */
function handleDoubleClick(event: MouseEvent) {
  // Get SVG element for coordinate conversion
  if (!svgElement.value) return;
  
  // Transform screen coordinates to SVG coordinates
  const svg = svgElement.value;
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  
  const canvasPoint = pt.matrixTransform(ctm.inverse());
  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  
  // Get plane transform for hit testing
  const planeTransforms = getPlaneTransformsForInput();
  const paperToPlane = planeTransforms.get(activePlane.value);
  
  // Hit test to find element under cursor
  const hit = paper.hitTest(canvasPos, 20, activePlane.value, paperToPlane, world);
  
  if (hit) {
    // Element found - show properties dialog
    propertiesElementId.value = hit.elementId;
    showPropertiesDialog.value = true;
    console.log('[SvgCanvas] Opening properties dialog for:', hit.elementId);
  }
}

/**
 * Handle property changes from the properties dialog
 * T193: Apply property changes and record as command
 */
function handleSaveProperties(changes: any) {
  console.log('[SvgCanvas] Saving property changes:', changes);
  
  // Create command using base Command + Operation pattern per data-model.md
  const cmd = new Command(`Update style: ${changes.elementId}`, world);
  
  try {
    // Create and execute style update operation
    const styleOp = new UpdateElementStyleOp(
      changes.elementId,
      activePlane.value, // TODO: Get actual planeId from element
      {
        color: changes.color,
        lineWidth: changes.lineWidth,
        lineStyle: changes.lineStyle,
        opacity: changes.opacity,
        visible: changes.visible
      }
    );
    
    cmd.addAndExecute(styleOp);
    cmd.commit();
    commandStack.push(cmd);
    
    // Trigger reactivity
    renderTick.value++;
    console.log('[SvgCanvas] Style updated and command added to stack');
  } catch (error) {
    console.error('[SvgCanvas] Style update failed:', error);
    cmd.rollback();
  }
}

/**
 * Handle mouse movement for hover feedback and 3D coordinate display
 * Uses Paper.hitTest() to detect elements near cursor
 * Computes 3D coordinates from cursor position with debouncing
 * T955: Continuous feedback for point dragging
 * T965: Viewport pan when dragging empty space
 */
function handleMouseMove(event: MouseEvent) {
  if (!svgElement.value) return;

  // T965: Handle viewport pan in select mode (drag empty space)
  if (viewportPan.value.active) {
    const dx = event.clientX - viewportPan.value.startX;
    const dy = event.clientY - viewportPan.value.startY;
    
    // Adjust pan by dividing by zoom - at high zoom, screen pixels translate to smaller world movement
    const zoom = viewport.value.zoom;
    viewStore.adjustPan(dx / zoom, dy / zoom);
    
    viewportPan.value.startX = event.clientX;
    viewportPan.value.startY = event.clientY;
    return;
  }

  // T955: Live preview for point dragging (Select mode)
  if (pointDrag.value.active && pointDrag.value.planeId && pointDrag.value.pointId && pointDrag.value.cmd) {
    // Small drag threshold to avoid turning clicks into moves
    const dx = event.clientX - pointDrag.value.startClientX;
    const dy = event.clientY - pointDrag.value.startClientY;
    if (!pointDrag.value.moved && (dx * dx + dy * dy) < 9) {
      return;
    }
    pointDrag.value.moved = true;

    const svg = svgElement.value;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const canvasPoint = pt.matrixTransform(ctm.inverse());

    const planeTransforms = getPlaneTransformsForInput();
    const paperToPlane = planeTransforms.get(pointDrag.value.planeId);
    if (!paperToPlane) return;

    const planePos = inputService.canvasToPlaneCoordinates(
      canvasPoint.x,
      canvasPoint.y,
      paperToPlane,
      viewport.value
    );
    if (!planePos) return;

    // Preview update: rollback previous op and apply the new one.
    pointDrag.value.cmd.rollback();
    pointDrag.value.cmd.addAndExecute(
      new UpdateFreePoint2DPositionOp(pointDrag.value.planeId, pointDrag.value.pointId, planePos)
    );
    renderTick.value++;
    return;
  }
  
  // Update tooltip position (offset from cursor)
  tooltipPosition.value = {
    x: event.clientX + 15,
    y: event.clientY + 15
  };
  
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
  // 'select' is a special mode (not a tool), allow hover on all elements
  const selectionMask = activeTool ? activeTool.getSelectionMask() : undefined;
  
  // Use Paper.hitTest() to find element near cursor (filtered by selection mask)
  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const hit = paper.hitTest(canvasPos, 20, activePlane.value, paperToPlane, world, selectionMask); // FR-002: Hit test in plane space
  
  // Update snap target if hovering over a point within snap radius
  // Per ui-spec.md: "Point Snap: When cursor within snap radius of existing point: bright outline or glow"
  if (hit && hit.elementType === 'point') {
    // Point is within snap radius - show snap preview indicator
    snapTarget.value = {
      pointId: hit.elementId,
      position: { x: canvasPoint.x, y: canvasPoint.y }
    };
  } else {
    // No point nearby - clear snap indicator
    snapTarget.value = {
      pointId: null,
      position: null
    };
  }
  
  // Update hover state in Paper only if it changed
  const previousHovered = paper.getHoveredElement();
  const newHovered = hit ? hit.elementId : undefined;
  
  if (previousHovered !== newHovered) {
    paper.setHoveredElement(newHovered);
    
    // Update global hover state for UI feedback
    if (newHovered && hit) {
      const label = getElementLabel(newHovered, hit.elementType, activePlane.value);
      hoverHighlight.setHoveredElement(
        newHovered,
        hit.elementType,
        label,
        false // Not temporary - show tooltip
      );
    } else {
      hoverHighlight.clearHover();
    }
    
    // Trigger re-render only when hover state actually changes
    renderTick.value++;
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

// Commit point move on global mouseup (even if mouseup happens outside SVG)
// T957: Handle viewport pan end
function handleGlobalMouseUp() {
  // Check if viewport pan via useViewport (Shift+drag or middle-click drag) was active
  // If so, suppress next click to prevent unwanted tool actions
  if (viewportComposable.isPanning.value) {
    ignoreNextClick = true;
  }
  
  // End viewport pan
  if (viewportPan.value.active) {
    viewportPan.value = {
      active: false,
      startX: 0,
      startY: 0
    };
    return;
  }
  
  // End point drag
  if (!pointDrag.value.active) return;
  if (pointDrag.value.moved) {
    ignoreNextClick = true;
    endPointDrag(true);
  } else {
    endPointDrag(false);
  }
}

onMounted(() => {
  window.addEventListener('mouseup', handleGlobalMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mouseup', handleGlobalMouseUp);
});

/**
 * Fit to View - Zoom and pan to show all elements (T274)
 * 
 * Calculates bounding box of all rendered elements and adjusts viewport
 * to fit them with 10% padding on all sides.
 */
function fitToView() {
  console.log('[SvgCanvas] fitToView called');
  
  // Get all rendered primitives
  const allPrimitives = primitives.value;
  
  if (allPrimitives.length === 0) {
    // No elements - reset to default view
    console.log('[SvgCanvas] No elements to fit, resetting to default view');
    viewStore.setZoom(1.0);
    viewStore.setPan(0, 0);
    return;
  }
  
  // Calculate bounding box of all primitives in paper coordinates
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const prim of allPrimitives) {
    // Skip primitives with undefined geometry
    if (!prim.geometry) {
      continue;
    }
    
    if (prim.type === 'point') {
      const p = prim.geometry as { x: number; y: number };
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    } else if (prim.type === 'line' || prim.type === 'segment') {
      const line = prim.geometry as { p1: { x: number; y: number }; p2: { x: number; y: number } };
      minX = Math.min(minX, line.p1.x, line.p2.x);
      minY = Math.min(minY, line.p1.y, line.p2.y);
      maxX = Math.max(maxX, line.p1.x, line.p2.x);
      maxY = Math.max(maxY, line.p1.y, line.p2.y);
    } else if (prim.type === 'circle') {
      const circle = prim.geometry as { center: { x: number; y: number }; radius: number };
      minX = Math.min(minX, circle.center.x - circle.radius);
      minY = Math.min(minY, circle.center.y - circle.radius);
      maxX = Math.max(maxX, circle.center.x + circle.radius);
      maxY = Math.max(maxY, circle.center.y + circle.radius);
    }
    // Note: Guides extend to infinity, so we skip them in bounding box calculation
  }
  
  // Check if we found any valid bounds
  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    console.log('[SvgCanvas] No valid bounds found, resetting to default view');
    viewStore.setZoom(1.0);
    viewStore.setPan(0, 0);
    return;
  }
  
  // Calculate bounding box dimensions
  const boxWidth = maxX - minX;
  const boxHeight = maxY - minY;
  
  // Add padding (10% on each side = 0.9 content fill factor)
  const paddingFactor = 0.9;
  
  // Calculate zoom to fit both dimensions
  const zoomX = (canvasWidth.value / boxWidth) * paddingFactor;
  const zoomY = (canvasHeight.value / boxHeight) * paddingFactor;
  const newZoom = Math.min(zoomX, zoomY, 4.0); // Cap at 4x zoom
  
  // Calculate pan to center the bounding box
  const boxCenterX = (minX + maxX) / 2;
  const boxCenterY = (minY + maxY) / 2;
  const newPanX = (canvasWidth.value / (2 * newZoom)) - boxCenterX;
  const newPanY = (canvasHeight.value / (2 * newZoom)) - boxCenterY;
  
  console.log('[SvgCanvas] Fit to view:', {
    bounds: { minX, minY, maxX, maxY },
    boxSize: { width: boxWidth, height: boxHeight },
    viewport: { width: canvasWidth.value, height: canvasHeight.value },
    newZoom,
    newPan: { x: newPanX, y: newPanY },
  });
  
  // Apply new viewport transform
  viewStore.setZoom(newZoom);
  viewStore.setPan(newPanX, newPanY);
}

// Expose methods to parent component
defineExpose({
  fitToView,
});

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

/* Hover tooltip */
.hover-tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Phase 78: Grid coordinate labels */
.grid-label {
  font-family: sans-serif;
  font-size: 11px;
  fill: #333333;
  stroke: #ffffff;
  stroke-width: 3;
  paint-order: stroke;
  pointer-events: none;
  user-select: none;
}
</style>
