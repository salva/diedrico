<template>
  <div class="svg-canvas-container">
    <!-- Plane selector -->
    <div class="plane-selector">
      <label>Active Plane:</label>
      <button 
        :class="{ active: activePlane === 'plane_H' }"
        @click="activePlane = 'plane_H'"
      >
        P_H (Horizontal)
      </button>
      <button 
        :class="{ active: activePlane === 'plane_V' }"
        @click="activePlane = 'plane_V'"
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
      
      <!-- Reference axes (canvas center) -->
      <line x1="0" :y1="canvasHeight / 2" :x2="canvasWidth" :y2="canvasHeight / 2" stroke="#ccc" stroke-width="1" stroke-dasharray="5,5" />
      <line :x1="canvasWidth / 2" y1="0" :x2="canvasWidth / 2" :y2="canvasHeight" stroke="#ccc" stroke-width="1" stroke-dasharray="5,5" />
      
      <!-- Render all lines through Paper pipeline -->
      <line
        v-for="{ primitive, attrs } in renderedLines"
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

import { ref, computed, onMounted } from 'vue';
import { Matrix3 } from 'three';
import { World } from '@/domain/world/World';
import { PaperService, type PrimitiveContext } from '@/services/PaperService';
import { SVGRenderer, type ViewportTransform } from '@/services/SVGRenderer';
import { InputService } from '@/services/InputService';
import { useToolStore } from '@/stores/toolStore';
import { useViewStore } from '@/stores/viewStore';
import { useViewport } from '@/composables/useViewport';
import { CommandStack } from '@/commands/CommandStack';
import { PointTool } from '@/tools/PointTool';
import { LineTool } from '@/tools/LineTool';
import type { ITool } from '@/tools/ITool';

const svgElement = ref<SVGSVGElement | null>(null);

// Active plane selection
const activePlane = ref<'plane_H' | 'plane_V'>('plane_H');

// Dynamic canvas dimensions - updated based on container size
const canvasWidth = ref(1600);
const canvasHeight = ref(1000);

// Viewport transformation (pan/zoom)
const viewStore = useViewStore();
const viewport = computed<ViewportTransform>(() => viewStore.viewportState.value);

// Setup viewport interactions (pan/zoom)
useViewport({ element: svgElement });

// Services
const paperService = new PaperService();
const svgRenderer = new SVGRenderer();
const inputService = new InputService();
const toolStore = useToolStore();

// World instance (will be managed by store in later phases)
const world = new World();

// Command infrastructure (Phase 6.5)
const commandStack = new CommandStack();

// Tool registry - map tool names to tool instances
const tools: Record<string, ITool> = {
  'point': new PointTool(),
  'line': new LineTool(),
  // Future tools: 'circle', 'segment', etc.
};

// Reactivity trigger - increment this to force re-render after World changes
const worldVersion = ref(0);

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
  console.log('Points in world:', world.getAllPoints().length);
  console.log('Points:', world.getAllPoints().map(p => ({ id: p.id, type: p.type, planeId: p.planeId })));
  
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
    transforms.set('plane_H', realizationH.paperToPlane);  // paperToPlane for input
  }
  if (realizationV) {
    transforms.set('plane_V', realizationV.paperToPlane);  // paperToPlane for input
  }
  
  return transforms;
}

// Get plane transforms for RENDERING (plane coordinates → paper coordinates)
function getPlaneTransformsForRendering(): Map<string, Matrix3> {
  const transforms = new Map<string, Matrix3>();
  
  const realizationH = world.getProjectionPlane2DRealization('proj_plane_H');
  const realizationV = world.getProjectionPlane2DRealization('proj_plane_V');
  
  if (realizationH) {
    transforms.set('plane_H', realizationH.planeToPaper);  // planeToPaper for rendering
  }
  if (realizationV) {
    transforms.set('plane_V', realizationV.planeToPaper);  // planeToPaper for rendering
  }
  
  return transforms;
}

// Generate primitives from World using PaperService
const primitives = computed(() => {
  // Access worldVersion to make this computed reactive to World changes
  worldVersion.value;
  
  // PaperService uses plane-to-paper transforms for rendering
  const planeTransforms = getPlaneTransformsForRendering();
  
  const context: PrimitiveContext = {
    world,
    planeTransforms,
    // TODO: Add highlighted/snap state from stores
  };
  
  const prims = paperService.generatePrimitives(context);
  console.log('Generated primitives:', prims.length, prims);
  return prims;
});

// Render primitives to SVG attributes
const renderedPoints = computed(() => {
  return primitives.value
    .filter(p => p.type === 'point')
    .map(p => {
      const result = svgRenderer.renderPrimitive(p, viewport.value);
      console.log('Rendering point primitive:', p, '→ SVG attrs:', result.attributes);
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
      console.log('Rendering line primitive:', p, '→ SVG attrs:', result.attributes);
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
  
  // Phase 6.5: Delegate to active tool instead of direct World mutation
  const activeToolName = toolStore.currentTool.value;
  const activeTool = tools[activeToolName];
  
  if (!activeTool) {
    console.warn(`[SvgCanvas] No tool implementation for: ${activeToolName}`);
    return;
  }
  
  // Delegate to tool with context
  const result = activeTool.handleClick(planePos, {
    planeId: activePlaneId,
    commandStack,
    world
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
</style>
