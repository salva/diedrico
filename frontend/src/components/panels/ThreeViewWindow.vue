<template>
  <div
    ref="windowRef"
    class="three-view-window"
    :class="`is-${windowState.mode}`"
    :style="windowStyle"
    data-testid="three-view-overlay"
    data-window-mode="three-view"
    @pointerdown.stop
  >
    <div
      class="three-view-titlebar"
      data-testid="three-view-titlebar"
      title="Drag 3D view"
      @dblclick="toggleMaximized"
      @pointerdown="startMove"
    >
      <span class="three-view-title">3D</span>
      <div class="three-view-window-actions">
        <button
          class="window-button"
          type="button"
          title="Minimize 3D view"
          aria-label="Minimize 3D view"
          data-testid="three-view-minimize"
          @click.stop="minimize"
          @pointerdown.stop
        >
          _
        </button>
        <button
          class="window-button"
          type="button"
          :title="windowState.mode === 'maximized' ? 'Restore 3D view' : 'Maximize 3D view'"
          :aria-label="windowState.mode === 'maximized' ? 'Restore 3D view' : 'Maximize 3D view'"
          data-testid="three-view-maximize"
          @click.stop="toggleMaximized"
          @pointerdown.stop
        >
          {{ windowState.mode === 'maximized' ? '[]' : '[ ]' }}
        </button>
        <button
          v-if="windowState.mode === 'minimized'"
          class="window-button"
          type="button"
          title="Restore 3D view"
          aria-label="Restore 3D view"
          data-testid="three-view-restore"
          @click.stop="restore"
          @pointerdown.stop
        >
          ^
        </button>
      </div>
    </div>

    <div v-if="windowState.mode !== 'minimized'" class="three-view-window-content">
      <ThreeView />
    </div>

    <template v-if="windowState.mode === 'floating'">
      <div class="resize-handle resize-handle-right" data-testid="three-view-resize-right" @pointerdown="startResize('right', $event)"></div>
      <div class="resize-handle resize-handle-bottom" data-testid="three-view-resize-bottom" @pointerdown="startResize('bottom', $event)"></div>
      <div class="resize-handle resize-handle-corner" data-testid="three-view-resize-corner" @pointerdown="startResize('corner', $event)"></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import ThreeView from './ThreeView.vue';
import { useViewStore, type ThreeViewWindowContainer } from '@/stores/viewStore';

type ResizeHandle = 'right' | 'bottom' | 'corner';

const viewStore = useViewStore();
const windowState = viewStore.threeViewWindow;
const windowRef = ref<HTMLElement | null>(null);

let parentResizeObserver: ResizeObserver | undefined;
let activePointerId: number | null = null;
let dragStart:
  | {
      kind: 'move';
      clientX: number;
      clientY: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      kind: 'resize';
      handle: ResizeHandle;
      clientX: number;
      clientY: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | null = null;

const windowStyle = computed(() => ({
  left: `${windowState.value.x}px`,
  top: `${windowState.value.y}px`,
  width: `${windowState.value.width}px`,
  height: `${windowState.value.height}px`,
}));

onMounted(() => {
  viewStore.initializeThreeViewWindow(containerSize());
  const parent = parentElement();
  if (!parent) return;
  parentResizeObserver = new ResizeObserver(() => viewStore.clampThreeViewWindow(containerSize()));
  parentResizeObserver.observe(parent);
});

onUnmounted(() => {
  parentResizeObserver?.disconnect();
  stopPointerInteraction();
});

function parentElement(): HTMLElement | null {
  return windowRef.value?.parentElement ?? null;
}

function containerSize(): ThreeViewWindowContainer {
  const parent = parentElement();
  return {
    width: parent?.clientWidth ?? window.innerWidth,
    height: parent?.clientHeight ?? window.innerHeight,
  };
}

function startMove(event: PointerEvent): void {
  if (event.button !== 0 || windowState.value.mode === 'maximized') return;
  event.preventDefault();
  event.stopPropagation();
  activePointerId = event.pointerId;
  dragStart = {
    kind: 'move',
    clientX: event.clientX,
    clientY: event.clientY,
    x: windowState.value.x,
    y: windowState.value.y,
    width: windowState.value.width,
    height: windowState.value.height,
  };
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopPointerInteraction);
  window.addEventListener('pointercancel', stopPointerInteraction);
}

function startResize(handle: ResizeHandle, event: PointerEvent): void {
  if (event.button !== 0 || windowState.value.mode !== 'floating') return;
  event.preventDefault();
  event.stopPropagation();
  activePointerId = event.pointerId;
  dragStart = {
    kind: 'resize',
    handle,
    clientX: event.clientX,
    clientY: event.clientY,
    x: windowState.value.x,
    y: windowState.value.y,
    width: windowState.value.width,
    height: windowState.value.height,
  };
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', stopPointerInteraction);
  window.addEventListener('pointercancel', stopPointerInteraction);
}

function handlePointerMove(event: PointerEvent): void {
  if (!dragStart || activePointerId !== event.pointerId) return;
  event.preventDefault();
  const dx = event.clientX - dragStart.clientX;
  const dy = event.clientY - dragStart.clientY;
  if (dragStart.kind === 'move') {
    viewStore.moveThreeViewWindow(
      dragStart.x + dx - windowState.value.x,
      dragStart.y + dy - windowState.value.y,
      containerSize(),
    );
    return;
  }
  const width = dragStart.handle === 'bottom' ? dragStart.width : dragStart.width + dx;
  const height = dragStart.handle === 'right' ? dragStart.height : dragStart.height + dy;
  viewStore.resizeThreeViewWindow(width, height, containerSize());
}

function stopPointerInteraction(): void {
  activePointerId = null;
  dragStart = null;
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', stopPointerInteraction);
  window.removeEventListener('pointercancel', stopPointerInteraction);
}

function minimize(): void {
  viewStore.minimizeThreeViewWindow(containerSize());
}

function restore(): void {
  viewStore.restoreThreeViewWindow(containerSize());
}

function toggleMaximized(): void {
  if (windowState.value.mode === 'maximized') {
    restore();
    return;
  }
  viewStore.maximizeThreeViewWindow(containerSize());
}
</script>

<style scoped>
.three-view-window {
  pointer-events: auto;
  position: absolute;
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 320px;
  min-height: 34px;
  border: 1px solid #9aa6b4;
  border-radius: 6px;
  background: #f7f9fb;
  box-shadow: 0 6px 18px rgba(18, 33, 52, 0.24);
}

.three-view-window.is-maximized {
  border-radius: 4px;
}

.three-view-window.is-minimized {
  min-height: 34px;
  box-shadow: 0 4px 12px rgba(18, 33, 52, 0.22);
}

.three-view-titlebar {
  height: 34px;
  flex: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 6px 0 10px;
  border-bottom: 1px solid #c8d0da;
  background: #314255;
  color: #f5f8fb;
  cursor: move;
  user-select: none;
}

.three-view-window.is-minimized .three-view-titlebar {
  border-bottom: 0;
}

.three-view-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}

.three-view-window-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.window-button {
  width: 26px;
  height: 24px;
  padding: 0;
  border-radius: 3px;
  color: #f5f8fb;
  font-size: 12px;
  line-height: 24px;
  text-align: center;
}

.window-button:hover {
  background: rgba(255, 255, 255, 0.16);
}

.three-view-window-content {
  flex: 1;
  min-height: 0;
  position: relative;
}

.resize-handle {
  position: absolute;
  z-index: 2;
}

.resize-handle-right {
  top: 34px;
  right: 0;
  width: 8px;
  bottom: 8px;
  cursor: ew-resize;
}

.resize-handle-bottom {
  left: 0;
  right: 8px;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
}

.resize-handle-corner {
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}

.resize-handle-corner::after {
  content: "";
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 7px;
  height: 7px;
  border-right: 2px solid #7e8a98;
  border-bottom: 2px solid #7e8a98;
}
</style>
