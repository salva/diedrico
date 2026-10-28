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

    <Create3DPointCoordinatesDialog
      :is-open="show3DPointCoordinatesDialog"
      :error="create3DPointCoordinatesError"
      @close="close3DPointCoordinatesDialog"
      @submit="handleCreate3DPointCoordinates"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue';
import { Matrix3, Vector3 } from 'three';
import { canvasToPlaneCoordinates, screenToCanvasPoint, type ViewportTransform } from '@/application/canvas/CanvasCoordinateConverter';
import { CanvasInteractionController } from '@/application/canvas/CanvasInteractionController';
import { renderSvgPrimitive } from '@/application/canvas/CanvasSvgRendering';
import { useViewStore } from '@/stores/viewStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useHoverHighlight } from '@/composables/useHoverHighlight';
import PropertiesDialog from '@/components/dialogs/PropertiesDialog.vue';
import Create3DPointCoordinatesDialog from '@/components/dialogs/Create3DPointCoordinatesDialog.vue';
import { CanvasCommandProducerInjectionKey, CanvasViewInjectionKey, SelectionActionsInjectionKey, ToolInteractionReadInjectionKey, ToolRuntimeInjectionKey } from '@/application/appShell/RuntimeInjectionKeys';
import { CanvasInteractionQuery } from '@/application/canvasPresentation/CanvasInteractionQuery';
import type { ParsedToolArgumentInput } from '@/types/ToolArgumentInput';

const emit = defineEmits<{
  'update-3d-coordinates': [coords: { x: number; y: number; z: number } | null];
  'update-plane-position-input-state': [state: { enabled: boolean; kind: 'plane-position' | 'scalar'; valueKind?: 'distance' | 'angle'; label: string; placeholder: string }];
  'clear-plane-position-input': [];
}>();

interface PlanePositionSubmitResult {
  success: boolean;
  message?: string;
}

const svgElement = ref<SVGSVGElement | null>(null);

// Stores (read-only for presentation model; viewport mutations delegated to controller)
const viewStore = useViewStore();
const selectionStore = useSelectionStore();
const hoverHighlight = useHoverHighlight();

// Active plane - derived from runtime view port.
const renderTick = ref(0);

// Injected ports
const canvasViewPort = inject(CanvasViewInjectionKey);
if (!canvasViewPort) throw new Error('Canvas view port not provided');
const canvasViewPortRequired = canvasViewPort;

const selectionActions = inject(SelectionActionsInjectionKey);
if (!selectionActions) throw new Error('Selection action port not provided');
const selectionActionsRequired = selectionActions;

const injectedCanvasToolController = inject(CanvasCommandProducerInjectionKey);
if (!injectedCanvasToolController) throw new Error('Canvas command producer port not provided');
const canvasToolController = injectedCanvasToolController;

const toolRuntime = inject(ToolRuntimeInjectionKey);
if (!toolRuntime) throw new Error('Tool runtime port not provided');
const toolRuntimeRequired = toolRuntime;

const toolInteractionReadPort = inject(ToolInteractionReadInjectionKey);
if (!toolInteractionReadPort) throw new Error('Tool interaction read port not provided');
const toolInteractionReadPortRequired = toolInteractionReadPort;

// Canvas interaction controller - owns tool lifecycle, selection, point drag, viewport pan, hover
const controller = new CanvasInteractionController({
  selection: {
    selectSingle: id => selectionActionsRequired.selectElement(id),
    addToSelection: id => selectionActionsRequired.addElementToSelection(id),
    clearSelection: () => selectionActionsRequired.clearSelection(),
  },
  toolLifecycle: {
    setToolStepMessage: msg => toolRuntimeRequired.setToolStepMessage(msg),
  },
  toolReadPort: toolInteractionReadPort,
  viewport: {
    adjustZoom: (delta, focusX, focusY) => viewStore.adjustZoom(delta, focusX, focusY),
    adjustPan: (dx, dy) => viewStore.adjustPan(dx, dy),
    setZoom: z => viewStore.setZoom(z),
    setPan: (x, y) => viewStore.setPan(x, y),
  },
  hover: {
    setHoveredElement: (id, type, label, temp) => hoverHighlight.setHoveredElement(id, type, label, temp),
    clearHover: () => hoverHighlight.clearHover(),
  },
  getElementLabel: (id, type, planeId) => canvasViewPortRequired.getElementLabel(id, type, planeId),
});

// Dynamic canvas dimensions
const canvasWidth = ref(1600);
const canvasHeight = ref(1000);

// Properties dialog state
const showPropertiesDialog = ref(false);
const propertiesElementId = ref<string | null>(null);
const show3DPointCoordinatesDialog = ref(false);
const create3DPointCoordinatesError = ref('');

// Viewport transformation (pan/zoom) - read-only from store
const viewport = computed<ViewportTransform>(() => viewStore.viewportState.value);

// Active plane - derived from runtime view port
const activePlane = computed(() => {
  renderTick.value;
  return canvasViewPortRequired.getActivePlaneId();
});

// Hover state for presentation model (reactive ref kept for template binding)
const hoveredElementId = ref<string | undefined>(undefined);

// Tooltip position (offset from cursor)
const tooltipPosition = ref({ x: 0, y: 0 });

// Snap target tracking for visual indicator
const snapTarget = ref<{ pointId: string | null; position: { x: number; y: number } | null }>({
  pointId: null,
  position: null,
});

let ignoreNextClick = false;

function handleGlobalKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (controller.isViewportPanning()) {
      controller.cancelViewportPan();
      return;
    }
    if (controller.getFreePointDragState().active) {
      ignoreNextClick = true;
      controller.cancelFreePointDrag();
    }
  }
}

// Reactivity trigger
let lastCoordinateUpdate = 0;
const COORDINATE_UPDATE_THROTTLE_MS = 50;

// Watch for tool changes and forward to controller
watch(() => toolRuntimeRequired.currentTool.value, (newTool) => {
  controller.setToolName(newTool);
  if (newTool === 'create3dpoint-by-coordinates') {
    create3DPointCoordinatesError.value = '';
    show3DPointCoordinatesDialog.value = true;
  }
  if (newTool === 'quick-yz-projection-plane') {
    handleCreateYZProjectionPlane();
  }
  emitPlanePositionInputState();
}, { immediate: true });

function updateCanvasDimensions() {
  if (!svgElement.value) return;
  const rect = svgElement.value.getBoundingClientRect();
  canvasWidth.value = rect.width;
  canvasHeight.value = rect.height;
}

const resizeHandler = () => updateCanvasDimensions();

onMounted(() => {
  updateCanvasDimensions();
  window.addEventListener('resize', resizeHandler);
  canvasViewPortRequired.subscribeToChanges(handleRuntimeViewChange);
});

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeyDown);
});

onMounted(() => {
  window.addEventListener('mouseup', handleGlobalMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('keydown', handleGlobalKeyDown);
  window.removeEventListener('mouseup', handleGlobalMouseUp);
  canvasViewPortRequired.unsubscribeFromChanges(handleRuntimeViewChange);
});

function handleRuntimeViewChange(): void {
  renderTick.value++;
  emitPlanePositionInputState();
}

function emitPlanePositionInputState(): void {
  const request = controller.getToolArgumentInputRequest();
  emit('update-plane-position-input-state', {
    enabled: !!request,
    kind: request?.kind ?? 'plane-position',
    valueKind: request?.valueKind,
    label: request?.label ?? 'position',
    placeholder: request?.placeholder ?? 'u,v',
  });
}

// Presentation model
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
      gridVisible: viewStore.gridVisible.value,
    },
  );
});

const interactionQuery = computed(() => new CanvasInteractionQuery(canvasPresentation.value.queryItems));
const renderItems = computed(() => canvasPresentation.value.renderItems);
const gridLines = computed(() => canvasPresentation.value.gridLines);
const gridLabels = computed(() => canvasPresentation.value.gridLabels);
const paperToPlaneTransforms = computed(() => new Map(
  Array.from(canvasPresentation.value.planeTransforms.entries()).map(([planeId, transform]) => [planeId, transform.paperToPlane]),
));

// Render primitives to SVG attributes
const renderedPoints = computed(() => {
  return renderItems.value
    .filter(item => item.primitive.type === 'point')
    .map(item => renderSvgPrimitive(item, { ...viewport.value, width: canvasWidth.value, height: canvasHeight.value }))
    .filter(item => item !== null);
});

const renderedLines = computed(() => {
  return renderItems.value
    .filter(item => item.primitive.type === 'line' && !item.primitive.id.startsWith('guide-'))
    .map(item => renderSvgPrimitive(item, { ...viewport.value, width: canvasWidth.value, height: canvasHeight.value }))
    .filter(item => item !== null);
});

const renderedSegments = computed(() => {
  return renderItems.value
    .filter(item => item.primitive.type === 'segment')
    .map(item => renderSvgPrimitive(item, { ...viewport.value, width: canvasWidth.value, height: canvasHeight.value }))
    .filter(item => item !== null);
});

const renderedCircles = computed(() => {
  return renderItems.value
    .filter(item => item.primitive.type === 'circle')
    .map(item => renderSvgPrimitive(item, { ...viewport.value, width: canvasWidth.value, height: canvasHeight.value }))
    .filter(item => item !== null);
});

const renderedGuides = computed(() => {
  return renderItems.value
    .filter(item => item.primitive.type === 'line' && item.primitive.id.startsWith('guide-'))
    .map(item => renderSvgPrimitive(item, { ...viewport.value, width: canvasWidth.value, height: canvasHeight.value }))
    .filter(item => item !== null);
});

const renderedArcs = computed(() => {
  return renderItems.value
    .filter(item => item.primitive.type === 'arc')
    .map(item => renderSvgPrimitive(item, { ...viewport.value, width: canvasWidth.value, height: canvasHeight.value }))
    .filter(item => item !== null);
});

function handleCanvasClick(event: MouseEvent) {
  if (ignoreNextClick) {
    ignoreNextClick = false;
    return;
  }
  if (!svgElement.value) return;

  const canvasPoint = screenToCanvasPoint(svgElement.value, event.clientX, event.clientY);
  if (!canvasPoint) return;

  const activePlaneId = activePlane.value;
  if (!activePlaneId) return;
  const planeTransforms = paperToPlaneTransforms.value;
  const planeTransform = planeTransforms.get(activePlaneId);
  if (!planeTransform) return;

  const planePos = canvasToPlaneCoordinates(canvasPoint, planeTransform, viewport.value);
  if (!planePos) return;

  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const paperToPlane = planeTransforms.get(activePlaneId);

  if (controller.isSelectMode()) {
    controller.handleSelectClick({
      canvasPos,
      activePlaneId,
      paperToPlaneTransform: paperToPlane,
      viewport: viewport.value,
      interactionQuery: interactionQuery.value,
      shiftKey: event.shiftKey,
    });
    return;
  }

  const result = controller.handleCanvasClick({
    canvasPos,
    canvasPoint: { x: canvasPoint.x, y: canvasPoint.y },
    activePlaneId,
    planePos,
    paperToPlaneTransform: paperToPlane,
    viewport: viewport.value,
    interactionQuery: interactionQuery.value,
    commandSink: canvasToolController,
  });
  if (result?.success) emit('clear-plane-position-input');
  emitPlanePositionInputState();
}

function handleWheel(event: WheelEvent) {
  if (!svgElement.value) return;

  const canvasPoint = screenToCanvasPoint(svgElement.value, event.clientX, event.clientY);
  if (!canvasPoint) return;

  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  controller.handleWheelZoom(delta, canvasPoint.x, canvasPoint.y);
}

function handleMouseDown(event: MouseEvent) {
  if (!svgElement.value) return;
  if (!controller.isSelectMode()) return;

  if (event.button !== 0) return;
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;

  const canvasPoint = screenToCanvasPoint(svgElement.value, event.clientX, event.clientY);
  if (!canvasPoint) return;

  const planeTransforms = paperToPlaneTransforms.value;
  const activePlaneId = activePlane.value;
  if (!activePlaneId) return;

  const paperToPlane = planeTransforms.get(activePlaneId);
  if (!paperToPlane) return;

  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);
  const startedPointDrag = controller.tryStartFreePointDrag({
    canvasPos,
    activePlaneId,
    paperToPlaneTransform: paperToPlane,
    viewport: viewport.value,
    interactionQuery: interactionQuery.value,
    commandSink: canvasToolController,
    getMoveSession: args => canvasViewPortRequired.getMovableFreePointMoveSession(args),
    startClientX: event.clientX,
    startClientY: event.clientY,
  });
  if (startedPointDrag) return;

  controller.startViewportPan(event.clientX, event.clientY);
}

function handleDoubleClick(event: MouseEvent) {
  if (!svgElement.value) return;

  const canvasPoint = screenToCanvasPoint(svgElement.value, event.clientX, event.clientY);
  if (!canvasPoint) return;
  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);

  const activePlaneId = activePlane.value;
  if (!activePlaneId) return;
  const planeTransforms = paperToPlaneTransforms.value;
  const paperToPlane = planeTransforms.get(activePlaneId);

  const hit = interactionQuery.value.hitTest(canvasPos, 20, { viewport: viewport.value, activePlaneId, paperToPlaneTransform: paperToPlane });
  if (hit) {
    propertiesElementId.value = hit.elementId;
    showPropertiesDialog.value = true;
  }
}

function handleSaveProperties(changes: any) {
  const targetPlaneId = changes.planeId ?? activePlane.value;
  if (!targetPlaneId) return;

  const hasStyleChanges = ['color', 'lineWidth', 'lineStyle', 'opacity', 'visible'].some(key => changes[key] !== undefined);
  const result = canvasToolController.updateElementProperties({
    elementId: changes.elementId,
    planeId: targetPlaneId,
    position: changes.position ? new Vector3(changes.position.u, changes.position.v, 1) : undefined,
    parameter: changes.parameter
      ? changes.parameter.kind === 'radius'
        ? { kind: 'radius', value: changes.parameter.value }
        : { kind: 'angle', degrees: changes.parameter.value }
      : undefined,
    style: hasStyleChanges ? {
      color: changes.color,
      lineWidth: changes.lineWidth,
      lineStyle: changes.lineStyle,
      opacity: changes.opacity,
      visible: changes.visible,
    } : undefined,
  });
  if (!result.success) console.error('[SvgCanvas] Properties update failed:', result.message);
}

function close3DPointCoordinatesDialog(): void {
  show3DPointCoordinatesDialog.value = false;
  create3DPointCoordinatesError.value = '';
  if (toolRuntimeRequired.currentTool.value === 'create3dpoint-by-coordinates') {
    toolRuntimeRequired.setTool('select');
  }
}

function handleCreate3DPointCoordinates(coordinates: { x: number; y: number; z: number }): void {
  const result = canvasToolController.executeConstructionIntent({
    type: 'create3dpoint-by-coordinates',
    coordinates: new Vector3(coordinates.x, coordinates.y, coordinates.z),
    description: `Create 3D point (${coordinates.x}, ${coordinates.y}, ${coordinates.z})`,
  });

  if (!result.success) {
    create3DPointCoordinatesError.value = result.message || 'Could not create 3D point.';
    return;
  }

  close3DPointCoordinatesDialog();
}

function handleCreateYZProjectionPlane(): void {
  const result = canvasToolController.executeConstructionIntent({
    type: 'create-yz-projection-plane',
    description: 'Add YZ projection plane',
  });

  if (!result.success) {
    console.error('[SvgCanvas] YZ projection plane creation failed:', result.message);
  }

  if (toolRuntimeRequired.currentTool.value === 'quick-yz-projection-plane') {
    toolRuntimeRequired.setTool('select');
  }
}

function submitPlanePositionInput(coords: { u: number; v: number }): PlanePositionSubmitResult {
  return submitToolArgumentInput({ kind: 'plane-position', position: new Vector3(coords.u, coords.v, 1) });
}

function submitToolArgumentInput(input: ParsedToolArgumentInput): PlanePositionSubmitResult {
  const activePlaneId = activePlane.value;
  if (!activePlaneId) return { success: false, message: 'No active plane selected.' };

  const planeTransforms = paperToPlaneTransforms.value;
  const paperToPlane = planeTransforms.get(activePlaneId);
  if (!paperToPlane) return { success: false, message: `Active plane ${activePlaneId} is not available.` };

  const result = controller.submitToolArgumentInput({
    activePlaneId,
    commandSink: canvasToolController,
    readPort: toolInteractionReadPortRequired,
    interactionQuery: interactionQuery.value,
    paperToPlaneTransform: paperToPlane,
    viewport: viewport.value,
    input,
  });

  emitPlanePositionInputState();
  return result;
}

function handleMouseMove(event: MouseEvent) {
  if (!svgElement.value) return;

  if (controller.isViewportPanning()) {
    const zoom = viewport.value.zoom;
    controller.updateViewportPan(event.clientX, event.clientY, zoom);
    return;
  }

  const pointDrag = controller.getFreePointDragState();
  if (pointDrag.active && pointDrag.planeId && pointDrag.pointId) {
    const canvasPoint = screenToCanvasPoint(svgElement.value, event.clientX, event.clientY);
    if (!canvasPoint) return;

    const planeTransforms = paperToPlaneTransforms.value;
    const paperToPlane = planeTransforms.get(pointDrag.planeId);
    if (!paperToPlane) return;

    const planePos = canvasToPlaneCoordinates(canvasPoint, paperToPlane, viewport.value);
    const result = controller.previewFreePointDrag({
      clientX: event.clientX,
      clientY: event.clientY,
      planePosition: planePos,
    });
    if (!result) return;
    if (!result.success) return;
    return;
  }

  tooltipPosition.value = { x: event.clientX + 15, y: event.clientY + 15 };

  const svg = svgElement.value;
  const canvasPoint = screenToCanvasPoint(svg, event.clientX, event.clientY);
  if (!canvasPoint) return;

  const planeTransformsInput = paperToPlaneTransforms.value;
  const currentActivePlaneId = activePlane.value;
  if (!currentActivePlaneId) return;
  const paperToPlane = planeTransformsInput.get(currentActivePlaneId);

  const canvasPos = new Vector3(canvasPoint.x, canvasPoint.y, 1);

  const hoverResult = controller.updateHover(
    canvasPos,
    interactionQuery.value,
    currentActivePlaneId,
    paperToPlane,
    viewport.value,
  );

  if (hoverResult.isSnapPoint && hoverResult.hitElementId) {
    snapTarget.value = { pointId: hoverResult.hitElementId, position: { x: canvasPoint.x, y: canvasPoint.y } };
  } else {
    snapTarget.value = { pointId: null, position: null };
  }

  const previousHovered = hoveredElementId.value;
  const newHovered = hoverResult.hitElementId;
  if (previousHovered !== newHovered) {
    hoveredElementId.value = newHovered;
  }

  const now = Date.now();
  if (now - lastCoordinateUpdate < COORDINATE_UPDATE_THROTTLE_MS) return;
  lastCoordinateUpdate = now;

  const viewportState = viewport.value;
  const s = 1 / viewportState.zoom;
  const tx = -viewportState.panX;
  const ty = -viewportState.panY;
  const viewportMatrix = new Matrix3().set(s, 0, tx, 0, s, ty, 0, 0, 1);

  const coordResult = canvasViewPortRequired.screenTo3D({
    clientX: event.clientX,
    clientY: event.clientY,
    svg,
    viewportMatrix,
    activePlaneId: currentActivePlaneId,
  });

  if (coordResult.success && coordResult.coordinates) {
    emit('update-3d-coordinates', coordResult.coordinates);
  } else {
    emit('update-3d-coordinates', null);
  }
}

function handleGlobalMouseUp() {
  const panEnd = controller.endViewportPan();
  if (panEnd.active) {
    if (panEnd.moved) ignoreNextClick = true;
    return;
  }

  const pointDrag = controller.getFreePointDragState();
  if (!pointDrag.active) return;
  if (pointDrag.moved) {
    ignoreNextClick = true;
  }
  const finish = controller.finishFreePointDrag();
  if (finish.result && !finish.result.success) console.error('[SvgCanvas] Point move commit failed:', finish.result.message);
}

function fitToView() {
  controller.fitToView(renderItems.value.map(item => item.primitive), canvasWidth.value, canvasHeight.value);
}

defineExpose({ fitToView, submitPlanePositionInput, submitToolArgumentInput });
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
