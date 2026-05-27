<template>
  <div class="svg-canvas-container">
    <svg
      ref="svgElement"
      class="svg-canvas diedrico-canvas"
      data-testid="svg-canvas"
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
      
      <!-- Render all lines through canvas presentation model (including HL_HV projections) -->
      <line
        v-for="{ primitive, attrs } in renderedLines"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all segments through canvas presentation model -->
      <line
        v-for="{ primitive, attrs } in renderedSegments"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all guides through canvas presentation model -->
      <line
        v-for="{ primitive, attrs } in renderedGuides"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all circles through canvas presentation model -->
      <circle
        v-for="{ primitive, attrs } in renderedCircles"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all arcs through canvas presentation model -->
      <path
        v-for="{ primitive, attrs } in renderedArcs"
        :key="primitive.id"
        v-bind="attrs"
      />
      
      <!-- Render all points through canvas presentation model -->
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
      v-if="hoverHighlight.isHovering.value && hoverHighlight.hoveredElementLabel.value && !hoverHighlight.hoverState.value.temporary"
      class="hover-tooltip"
      :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px' }"
    >
      {{ hoverHighlight.hoveredElementLabel.value }}
    </div>
    
    <!-- Properties Dialog -->
    <PropertiesDialog
      :is-open="showPropertiesDialog"
      :view-model="canvasViewPortRequired.getPropertiesDialogViewModel(propertiesElementId)"
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
 * 2. → CanvasPresentationSelector (generates read-model primitives in paper coordinates)
 * 3. → SVGRenderer (applies viewport transform, generates SVG attributes)
 * 4. → SVG elements
 * 
 * Key requirements:
 * - SVG element, not HTML Canvas
 * - Rendering consumes the canvas presentation read model
 * - Generic rendering algorithms, with fixed elements represented by selectors
 * - Pan/zoom viewport transformations remain view state
 * - Element drawing policy comes from presentation selectors and SVGRenderer
 */

import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue';
import { Matrix3, Vector3 } from 'three';
import { SVGRenderer, type ViewportTransform } from '@/services/SVGRenderer';
import { InputService } from '@/services/InputService';
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
import { useToolStore } from '@/stores/toolStore';
import { useViewStore } from '@/stores/viewStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useViewport } from '@/composables/useViewport';
import { useGlobalHoverHighlight } from '@/composables/useHoverHighlight';
import PropertiesDialog from '@/components/dialogs/PropertiesDialog.vue';
import type { ITool } from '@/tools/ITool';
import type { FreePointMoveSession, ToolCommandSink } from '@/application/tools/ToolCommandIntents';
import { CanvasCommandProducerInjectionKey, CanvasViewInjectionKey } from '@/application/appShell/RuntimeInjectionKeys';
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';

// Define emits
const emit = defineEmits<{
  'update-3d-coordinates': [coords: { x: number; y: number; z: number } | null];
  'update-active-plane': [planeInfo: { id: string; name: string }];
}>();

const svgElement = ref<SVGSVGElement | null>(null);

// Active plane - derived from runtime view port.
const activePlane = computed(() => {
  renderTick.value;
  return canvasViewPortRequired.getActivePlaneId();
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
  return vp;
});

// Setup viewport interactions (pan/zoom)
const viewportComposable = useViewport({ element: svgElement });

// Services
const svgRenderer = new SVGRenderer();
const inputService = new InputService();
const toolStore = useToolStore();
const selectionStore = useSelectionStore();
const hoverHighlight = useGlobalHoverHighlight();
const hoveredElementId = ref<string | undefined>(undefined);

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
  moveSession: FreePointMoveSession | null;
  startClientX: number;
  startClientY: number;
  moved: boolean;
}>({
  active: false,
  planeId: null,
  pointId: null,
  moveSession: null,
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

function hasStatusMessage(tool: ITool): tool is ITool & { getStatusMessage: () => string } {
  return 'getStatusMessage' in tool && typeof tool.getStatusMessage === 'function';
}

function endPointDrag(commit: boolean): void {
  if (!pointDrag.value.active) return;

  const moveSession = pointDrag.value.moveSession;

  try {
    if (moveSession) {
      if (commit) {
        const result = moveSession.commit();
        if (!result.success) console.error('[SvgCanvas] Point move commit failed:', result.message);
      } else {
        moveSession.cancel();
      }
    }
  } finally {
    pointDrag.value = {
      active: false,
      planeId: null,
      pointId: null,
      moveSession: null,
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

const canvasViewPort = inject(CanvasViewInjectionKey);
if (!canvasViewPort) {
  throw new Error('Canvas view port not provided');
}

const canvasViewPortRequired = canvasViewPort;
const injectedCanvasToolController = inject(CanvasCommandProducerInjectionKey) as ToolCommandSink | undefined;
if (!injectedCanvasToolController) {
  throw new Error('Canvas command producer port not provided');
}
const canvasToolController = injectedCanvasToolController;

// Tool factory registry - map tool names to factory functions
// Creates new instances instead of reusing singletons to avoid state leakage
const toolFactories: Record<string, () => ITool> = {
  'point': () => new PointTool(),
  'line': () => new LineTool(),
  'segment': () => new SegmentTool(),
  'circle': () => new CircleTool(),
  'guide': () => new GuideTool(),
  'intersection': () => new IntersectionTool(),
  'parallel-line': () => new ParallelLineTool(),
  'perpendicular-line': () => new PerpendicularLineTool(),
  'tangent-line-to-circle-through-point': () => new TangentLineToCircleThroughPointTool(),
  'tangent-line-to-circle-parallel': () => new TangentLineToCircleParallelToLineTool(),
  // 3D element creation tools
  'create3dpoint': () => new Create3DPointTool(),
  'create3dline': () => new Create3DLineTool(),
  'create3dsegment': () => new Create3DSegmentTool(),
  'create3dplane': () => new Create3DPlaneTool(),
  // Auxiliary projection plane tool
  'createprojectionplane': () => new CreateProjectionPlaneTool(),
};

// Current tool instance - created fresh when tool is selected
const currentToolInstance = ref<ITool | null>(null);

// Reactivity trigger - increment this to force re-render when non-reactive world/read-model state changes
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

  canvasViewPortRequired.subscribeToChanges(handleRuntimeViewChange);
  console.log('Runtime canvas view port initialized');
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('keydown', handleGlobalKeyDown);
  canvasViewPortRequired.unsubscribeFromChanges(handleRuntimeViewChange);
});

// Global key handling (Esc cancels point-drag)
onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
});

// Watch for tool changes and create new tool instance
// This prevents state leakage by creating fresh instances instead of reusing singletons
watch(() => toolStore.currentTool.value, (newTool) => {
  const factory = toolFactories[newTool];
  if (factory) {
    currentToolInstance.value = factory();
    console.log(`[SvgCanvas] Created new tool instance: ${newTool}`);
    // Show initial tool feedback (e.g. "Creating line: pick point1, point2")
    if (currentToolInstance.value && hasStatusMessage(currentToolInstance.value)) {
      const msg = currentToolInstance.value.getStatusMessage();
      if (msg) toolStore.setToolStepMessage(msg);
    }
  } else {
    currentToolInstance.value = null;
    if (newTool !== 'select') {
      console.warn(`[SvgCanvas] No tool factory for: ${newTool}`);
    }
  }
}, { immediate: true }); // Create initial tool instance

// Get plane transforms for INPUT (canvas click → plane coordinates)
function getPlaneTransformsForInput(): Map<string, Matrix3> {
  return canvasViewPortRequired.getPlaneTransformsForInput();
}

function handleRuntimeViewChange(): void {
  renderTick.value++;
}

// Canvas presentation read model derived from one world/view snapshot.
const canvasPresentation = computed(() => {
  renderTick.value;
  const hoveredId = hoveredElementId.value;
  const selectedIds = selectionStore.selectedIdsArray;
  const cascadeHighlightIds = selectionStore.cascadeHighlightIdsArray;
  return canvasViewPortRequired.buildPresentationModel(
    { ...viewport.value, width: canvasWidth.value, height: canvasHeight.value },
    {
      hoveredElementId: hoveredId,
      selectedIds,
      cascadeHighlightIds,
      activePlaneId: activePlane.value,
      showProjectedElements: viewStore.showProjectedElements.value,
      gridVisible: viewStore.gridVisible.value
    }
  );
});

const interactionQuery = computed(() => new CanvasInteractionQuery(canvasPresentation.value.queryItems));
const primitives = computed(() => canvasPresentation.value.renderItems.map(item => item.primitive));
const gridLines = computed(() => canvasPresentation.value.gridLines);
const gridLabels = computed(() => canvasPresentation.value.gridLabels);

// Render primitives to SVG attributes
const renderedPoints = computed(() => {
  return primitives.value
    .filter(p => p.type === 'point')
    .map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value, { width: canvasWidth.value, height: canvasHeight.value });
      // console.log('Rendering point primitive:', p, '→ SVG attrs:', result.attributes);
      return {
        primitive: p,
        attrs: result.attributes
      };
    });
});

const renderedLines = computed(() => {
  const linePrimitives = primitives.value.filter(p => p.type === 'line');
  return linePrimitives.map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value, { width: canvasWidth.value, height: canvasHeight.value });
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
      const result = svgRenderer.renderPrimitive(p, viewport.value, { width: canvasWidth.value, height: canvasHeight.value });
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
      const result = svgRenderer.renderPrimitive(p, viewport.value, { width: canvasWidth.value, height: canvasHeight.value });
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
      const result = svgRenderer.renderPrimitive(p, viewport.value, { width: canvasWidth.value, height: canvasHeight.value });
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
      const result = svgRenderer.renderPrimitive(p, viewport.value, { width: canvasWidth.value, height: canvasHeight.value });
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
  
  // Step 2-3: Canvas → read model → Plane using InputService
  const activePlaneId = activePlane.value;
  if (!activePlaneId) {
    console.error('[SvgCanvas] No active plane for canvas click');
    return;
  }
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
  
  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const paperToPlane = planeTransforms.get(activePlaneId);
  
  // Phase 20: Handle selection mode when 'select' tool is active
  const activeToolName = toolStore.currentTool.value;
  
  if (activeToolName === 'select') {
    // Selection mode: click selects, Shift+click extends, empty click clears.
    // Click element: Select (Shift+click: add to selection)
    // Click empty: Deselect all
    
    const hit = interactionQuery.value.hitTest(canvasPos, 20, { viewport: viewport.value, activePlaneId, paperToPlaneTransform: paperToPlane });
    
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
  // Use current tool instance (created fresh on tool switch to avoid state leakage)
  const activeTool = currentToolInstance.value;
  
  if (!activeTool) {
    console.warn(`[SvgCanvas] No tool instance for: ${activeToolName}`);
    return;
  }
  
  // Delegate to tool with context including both canvas and plane coordinates
  const result = canvasViewPortRequired.invokeToolClick(activeTool, {
    planeId: activePlaneId,
    planeCoords: planePos,
    canvasCoords: { x: canvasPoint.x, y: canvasPoint.y },
    commandSink: canvasToolController,

    interactionQuery: interactionQuery.value,
    paperToPlaneTransform: paperToPlane,
    viewport: viewport.value,
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

  // Phase 115: Update tool step message for contextual feedback
  toolStore.setToolStepMessage(result.message || '');
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
  const activePlaneId = activePlane.value;
  if (!activePlaneId) return;

  const paperToPlane = planeTransforms.get(activePlaneId);
  if (!paperToPlane) return;

  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const hit = interactionQuery.value.hitTest(canvasPos, 20, { viewport: viewport.value, activePlaneId, paperToPlaneTransform: paperToPlane });
  
  // Check if we hit a movable point
  if (hit && hit.elementType === 'point') {
    const moveSession = canvasViewPortRequired.getMovableFreePointMoveSession({ planeId: activePlaneId, pointId: hit.elementId, commandSink: canvasToolController });
    if (moveSession) {
      // Start point drag (T954)
      selectionStore.selectSingle(hit.elementId);

      pointDrag.value = {
        active: true,
        planeId: activePlaneId,
        pointId: hit.elementId,
        moveSession,
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
  const activePlaneId = activePlane.value;
  if (!activePlaneId) return;
  const planeTransforms = getPlaneTransformsForInput();
  const paperToPlane = planeTransforms.get(activePlaneId);
  
  // Hit test to find element under cursor
  const hit = interactionQuery.value.hitTest(canvasPos, 20, { viewport: viewport.value, activePlaneId, paperToPlaneTransform: paperToPlane });
  
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
  const activePlaneId = activePlane.value;
  if (!activePlaneId) {
    console.error('[SvgCanvas] Cannot save properties without active plane');
    return;
  }

  console.log('[SvgCanvas] Saving property changes:', changes);
  const result = canvasToolController.updateElementStyle({
    elementId: changes.elementId,
    planeId: activePlaneId,
    style: {
      color: changes.color,
      lineWidth: changes.lineWidth,
      lineStyle: changes.lineStyle,
      opacity: changes.opacity,
      visible: changes.visible
    }
  });

  if (result.success) {
    renderTick.value++;
    console.log('[SvgCanvas] Style updated and command added to stack');
  } else {
    console.error('[SvgCanvas] Style update failed:', result.message);
  }
}

/**
 * Handle mouse movement for hover feedback and 3D coordinate display
 * Uses CanvasInteractionQuery to detect elements near cursor
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
  if (pointDrag.value.active && pointDrag.value.planeId && pointDrag.value.pointId && pointDrag.value.moveSession) {
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

    // Preview update delegated to application use-case.
    const result = pointDrag.value.moveSession.preview(planePos);
    if (!result.success) {
      console.error('[SvgCanvas] Point move preview failed:', result.message);
      return;
    }
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
  const activePlaneId = activePlane.value;
  if (!activePlaneId) return;
  const paperToPlane = planeTransformsInput.get(activePlaneId);
  
  // Get active tool's selection mask
  const activeTool = currentToolInstance.value;
  // 'select' is a special mode (not a tool), allow hover on all elements
  const selectionMask = activeTool?.getSelectionMask?.();
  
  // Use CanvasInteractionQuery to find element near cursor (filtered by selection mask)
  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const hit = interactionQuery.value.hitTest(canvasPos, 20, { viewport: viewport.value, activePlaneId, paperToPlaneTransform: paperToPlane }, selectionMask);
  
  // Update snap target if hovering over a point within snap radius
  // Point snap preview when the cursor is within snap radius of an existing point.
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
  
  const previousHovered = hoveredElementId.value;
  const newHovered = hit ? hit.elementId : undefined;
  
  if (previousHovered !== newHovered) {
    hoveredElementId.value = newHovered;
    
    // Update global hover state for UI feedback
    if (newHovered && hit) {
      const label = canvasViewPortRequired.getElementLabel(newHovered, hit.elementType, activePlaneId);
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
  const result = canvasViewPortRequired.screenTo3D({
    clientX: event.clientX,
    clientY: event.clientY,
    svg,
    viewportMatrix,
    activePlaneId
  });
  
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
    if (prim.type === 'point') {
      minX = Math.min(minX, prim.position.x);
      minY = Math.min(minY, prim.position.y);
      maxX = Math.max(maxX, prim.position.x);
      maxY = Math.max(maxY, prim.position.y);
    } else if (prim.type === 'segment') {
      minX = Math.min(minX, prim.point1.x, prim.point2.x);
      minY = Math.min(minY, prim.point1.y, prim.point2.y);
      maxX = Math.max(maxX, prim.point1.x, prim.point2.x);
      maxY = Math.max(maxY, prim.point1.y, prim.point2.y);
    } else if (prim.type === 'circle' || prim.type === 'arc') {
      minX = Math.min(minX, prim.cx - prim.radius);
      minY = Math.min(minY, prim.cy - prim.radius);
      maxX = Math.max(maxX, prim.cx + prim.radius);
      maxY = Math.max(maxY, prim.cy + prim.radius);
    }
    // Infinite lines, guides, paths, and text do not contribute stable element bounds.
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
