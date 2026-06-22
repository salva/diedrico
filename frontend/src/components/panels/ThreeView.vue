<template>
  <div class="three-view-panel" ref="containerRef">
    <canvas ref="canvasRef" class="three-canvas"></canvas>
    <div class="three-controls">
      <div class="control-group">
        <label class="control-label" title="Show or hide projection plane surfaces in 3D view">
          <input type="checkbox" :checked="displayOptions.showPlanes" @change="onToggleOption('showPlanes')" />
          Show Planes
        </label>
        <label class="control-label" title="Display 2D geometric elements (points, lines, circles) positioned on their planes in 3D space">
          <input type="checkbox" :checked="displayOptions.show2DElementsOnPlanes" @change="onToggleOption('show2DElementsOnPlanes')" />
          Show 2D Elements on Planes
        </label>
        <label class="control-label" title="Show dotted connector lines from reconstructed 3D points to their 2D plane projections">
          <input type="checkbox" :checked="displayOptions.showLinkingVisuals" @change="onToggleOption('showLinkingVisuals')" />
          Show Projection Lines
        </label>
        <label class="control-label" title="Show coordinate grid on each projection plane for spatial reference">
          <input type="checkbox" :checked="displayOptions.showGrid" @change="onToggleOption('showGrid')" />
          Show Grid
        </label>
        <label class="control-label" title="Show coordinate axes (X/Y/Z) at origin for spatial reference and debugging">
          <input type="checkbox" :checked="displayOptions.showReferenceAxes" @change="onToggleOption('showReferenceAxes')" />
          Show Reference Axes
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { ThreePresentationInjectionKey } from '@/application/appShell/RuntimeInjectionKeys';
import { useSelectionStore } from '@/stores/selectionStore';
import { useViewStore } from '@/stores/viewStore';
import type { ThreeViewDisplayOptions } from '@/types/ThreeViewDisplayOptions';
import { ThreeViewRuntime } from '@/rendering/threeView/ThreeViewRuntime';

const containerRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const renderTick = ref(0);

const viewStore = useViewStore();
const displayOptions = viewStore.threeViewOptions;
const selectionStore = useSelectionStore();
const injectedThreePresentationPort = inject(ThreePresentationInjectionKey);
if (!injectedThreePresentationPort) {
  throw new Error('Three presentation port not provided');
}
const threePresentationPort = injectedThreePresentationPort;
const runtime = new ThreeViewRuntime();
let unsubscribeWorldChanges: (() => void) | undefined;

function selectedIds(): string[] { return [...selectionStore.selectedIdsArray]; }
function refreshThreeView(): void { runtime.refresh(threePresentationPort.buildThreePresentationModel(displayOptions.value, selectedIds())); }
function onToggleOption(key: keyof ThreeViewDisplayOptions): void {
  viewStore.updateThreeViewOption(key, !displayOptions.value[key]);
}
function handleResize(): void { runtime.resize(); }

onMounted(() => {
  if (!containerRef.value || !canvasRef.value) return;
  runtime.mount({ container: containerRef.value, canvas: canvasRef.value });
  refreshThreeView();
  window.addEventListener('resize', handleResize);

  const handleWorldChange = () => { renderTick.value++; };
  threePresentationPort.subscribeToChanges(handleWorldChange);
  unsubscribeWorldChanges = () => threePresentationPort.unsubscribeFromChanges(handleWorldChange);

  watch(renderTick, refreshThreeView);
  watch(() => selectionStore.selectedIdsArray, refreshThreeView);
  watch(displayOptions, refreshThreeView, { deep: true });
});

onUnmounted(() => {
  unsubscribeWorldChanges?.();
  window.removeEventListener('resize', handleResize);
  runtime.dispose();
});
</script>

<style scoped>
.three-view-panel {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  overflow: hidden;
}

.three-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.three-controls {
  pointer-events: auto;
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.control-label input[type="checkbox"] { cursor: pointer; }
</style>
