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
      @dblclick="handleDoubleClick"
      @mousemove="handleMouseMove"
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

import { ref, computed, watch, onMounted, inject, provide } from 'vue';
import { Matrix3, Vector3 } from 'three';
import { World } from '@/domain/world/World';
import { Paper } from '@/domain/presentation/Paper';
import { PaperService, type PrimitiveContext } from '@/services/PaperService';
import { SVGRenderer, type ViewportTransform } from '@/services/SVGRenderer';
import { InputService } from '@/services/InputService';
import { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import { PointTool } from '@/tools/PointTool';
import { LineTool } from '@/tools/LineTool';
import { SegmentTool } from '@/tools/SegmentTool';
import { CircleTool } from '@/tools/CircleTool';
import { GuideTool } from '@/tools/GuideTool';
import { IntersectionTool } from '@/tools/IntersectionTool';
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

// Active plane selection
const activePlane = ref<'proj_plane_H' | 'proj_plane_V'>('proj_plane_H');

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
useViewport({ element: svgElement });

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
  
  return element?.label || elementId;
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
 * Generate grid lines for background grid (T275)
 * 
 * Grid adapts to zoom level:
 * - Low zoom (< 0.5): 50 unit spacing
 * - Medium zoom (0.5-2.0): 20 unit spacing
 * - High zoom (> 2.0): 10 unit spacing
 * 
 * Every 5th line is emphasized (major line)
 */
const gridLines = computed(() => {
  if (!viewStore.gridVisible.value) return [];
  
  const zoom = viewport.value.zoom;
  
  // Determine grid spacing based on zoom level
  let spacing: number;
  if (zoom < 0.5) {
    spacing = 50;
  } else if (zoom < 2.0) {
    spacing = 20;
  } else {
    spacing = 10;
  }
  
  const lines: Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    major: boolean;
  }> = [];
  
  // Calculate viewport bounds in paper coordinates
  const viewportWidth = canvasWidth.value / zoom;
  const viewportHeight = canvasHeight.value / zoom;
  const offsetX = -viewport.value.panX;
  const offsetY = -viewport.value.panY;
  
  // Round to nearest grid spacing
  const startX = Math.floor(offsetX / spacing) * spacing;
  const endX = Math.ceil((offsetX + viewportWidth) / spacing) * spacing;
  const startY = Math.floor(offsetY / spacing) * spacing;
  const endY = Math.ceil((offsetY + viewportHeight) / spacing) * spacing;
  
  // Generate vertical lines
  for (let x = startX; x <= endX; x += spacing) {
    const isMajor = Math.abs(x % (spacing * 5)) < 0.01;
    const screenX = (x + viewport.value.panX) * zoom;
    
    lines.push({
      key: `v-${x}`,
      x1: screenX,
      y1: 0,
      x2: screenX,
      y2: canvasHeight.value,
      major: isMajor,
    });
  }
  
  // Generate horizontal lines
  for (let y = startY; y <= endY; y += spacing) {
    const isMajor = Math.abs(y % (spacing * 5)) < 0.01;
    const screenY = (y + viewport.value.panY) * zoom;
    
    lines.push({
      key: `h-${y}`,
      x1: 0,
      y1: screenY,
      x2: canvasWidth.value,
      y2: screenY,
      major: isMajor,
    });
  }
  
  return lines;
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
        visible: changes.visible
      }
    );
    
    cmd.addAndExecute(styleOp);
    cmd.commit();
    commandStack.push(cmd);
    
    // Trigger reactivity
    worldVersion.value++;
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
 */
function handleMouseMove(event: MouseEvent) {
  if (!svgElement.value) return;
  
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
  const selectionMask = activeTool?.getSelectionMask();
  
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
  const newHovered = hit?.elementId;
  
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
</style>
