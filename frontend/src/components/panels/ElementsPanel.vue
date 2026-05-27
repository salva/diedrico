<template>
  <aside class="elements-panel">
    <header class="panel-header">
      <h2 class="panel-title">Elements</h2>
    </header>

    <!-- Elements Tree -->
    <div class="elements-tree">
      <!-- 2D Elements Section -->
      <div class="section">
        <div class="section-header" @click="toggle2DSection">
          <span class="collapse-icon">{{ is2DSectionCollapsed ? '▶' : '▼' }}</span>
          <span class="section-title">2D Elements</span>
        </div>
        
        <div v-if="!is2DSectionCollapsed" class="section-content">
          <!-- Empty state message -->
          <div v-if="!projectionPlanesList.some(p => p.hasElements)" class="empty-state">
            <p>No elements yet. Use the tools to create points, lines, and other geometric objects.</p>
          </div>
          
          <!-- Dynamic Projection Planes Loop -->
          <template v-for="planeGroup in projectionPlanesList" :key="planeGroup.id">
            <div v-if="planeGroup.hasElements" class="plane-group">
              <div class="plane-header" @click="togglePlane(planeGroup.id)">
                <span class="collapse-icon">{{ planeGroup.isCollapsed ? '▶' : '▼' }}</span>
                <span class="plane-name">
                  <span v-html="formatElementLabel(planeGroup.name)"></span>
                </span>
              </div>
              
              <div v-if="!planeGroup.isCollapsed" class="plane-content">
                <ElementTypeGroup
                  v-if="planeGroup.elements.points.length > 0"
                  title="Points"
                  :elements="planeGroup.elements.points"
                  @select="handleElementSelect"
                  @toggle-visibility="handleVisibilityToggle"
                />
                <ElementTypeGroup
                  v-if="planeGroup.elements.lines.length > 0"
                  title="Lines"
                  :elements="planeGroup.elements.lines"
                  @select="handleElementSelect"
                  @toggle-visibility="handleVisibilityToggle"
                />
                <ElementTypeGroup
                  v-if="planeGroup.elements.segments.length > 0"
                  title="Segments"
                  :elements="planeGroup.elements.segments"
                  @select="handleElementSelect"
                  @toggle-visibility="handleVisibilityToggle"
                />
                <ElementTypeGroup
                  v-if="planeGroup.elements.circles.length > 0"
                  title="Circles"
                  :elements="planeGroup.elements.circles"
                  @select="handleElementSelect"
                  @toggle-visibility="handleVisibilityToggle"
                />
                <ElementTypeGroup
                  v-if="planeGroup.elements.guides.length > 0"
                  title="Guides"
                  :elements="planeGroup.elements.guides"
                  @select="handleElementSelect"
                  @toggle-visibility="handleVisibilityToggle"
                />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 3D Elements Section -->
      <div class="section">
        <div class="section-header" @click="toggle3DSection">
          <span class="collapse-icon">{{ is3DSectionCollapsed ? '▶' : '▼' }}</span>
          <span class="section-title">3D Elements</span>
        </div>
        
        <div v-if="!is3DSectionCollapsed" class="section-content">
          <!-- Empty state message for 3D -->
          <div v-if="!threeDElements.hasElements" class="empty-state">
            <p>No 3D elements yet. Use the 3D tools to create points, lines, and other objects from projections.</p>
          </div>
          
          <ElementTypeGroup
            v-if="threeDElements.points.length > 0"
            title="Points"
            :elements="threeDElements.points"
            @select="handleElementSelect"
            @toggle-visibility="handleVisibilityToggle"
          />
          <ElementTypeGroup
            v-if="threeDElements.lines.length > 0"
            title="Lines"
            :elements="threeDElements.lines"
            @select="handleElementSelect"
            @toggle-visibility="handleVisibilityToggle"
          />
          <ElementTypeGroup
            v-if="threeDElements.segments.length > 0"
            title="Segments"
            :elements="threeDElements.segments"
            @select="handleElementSelect"
            @toggle-visibility="handleVisibilityToggle"
          />
          <ElementTypeGroup
            v-if="threeDElements.planes.length > 0"
            title="Planes"
            :elements="threeDElements.planes"
            @select="handleElementSelect"
            @toggle-visibility="handleVisibilityToggle"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!hasAnyElements" class="empty-state">
        <p>No elements yet. Start creating geometry!</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted } from 'vue';
import { ElementsPanelInjectionKey } from '@/application/appShell/RuntimeInjectionKeys';
import { useSelectionStore } from '@/stores/selectionStore';
import ElementTypeGroup from './ElementTypeGroup.vue';
import { formatElementLabel } from '@/utils/formatUtils';

// Emits
const emit = defineEmits<{
  highlightElements: [elementIds: string[], temporary: boolean];
  clearHighlight: [];
}>();

// Injected dependencies
const elementsPanelPort = inject(ElementsPanelInjectionKey);
if (!elementsPanelPort) {
  throw new Error('Elements panel port not provided');
}

const elementsPanelPortRequired = elementsPanelPort;
// Selection store for bidirectional sync
const selectionStore = useSelectionStore();

// Local state
const is2DSectionCollapsed = ref(false);
const is3DSectionCollapsed = ref(false);
const planeCollapsedStates = ref(new Map<string, boolean>());

// Runtime read model refresh trigger
const forceUpdate = ref(0);

function handleRuntimeChange(): void {
  forceUpdate.value++;
}

onMounted(() => {
  elementsPanelPortRequired.subscribeToChanges(handleRuntimeChange);
});

onUnmounted(() => {
  elementsPanelPortRequired.unsubscribeFromChanges(handleRuntimeChange);
});

const readModel = computed(() => {
  forceUpdate.value;
  return elementsPanelPortRequired.getReadModel();
});

const projectionPlanesList = computed(() => readModel.value.projectionPlanes.map(plane => {
  if (!planeCollapsedStates.value.has(plane.id)) planeCollapsedStates.value.set(plane.id, false);
  return {
    ...plane,
    isCollapsed: planeCollapsedStates.value.get(plane.id) || false,
  };
}));

const threeDElements = computed(() => readModel.value.threeDElements);

const hasAnyElements = computed(() => {
  return projectionPlanesList.value.some(p => p.hasElements) ||
         threeDElements.value.hasElements;
});

// Event handlers
function toggle2DSection() {
  is2DSectionCollapsed.value = !is2DSectionCollapsed.value;
}

function toggle3DSection() {
  is3DSectionCollapsed.value = !is3DSectionCollapsed.value;
}

function togglePlane(planeId: string) {
  const currentState = planeCollapsedStates.value.get(planeId) || false;
  planeCollapsedStates.value.set(planeId, !currentState);
  // Trigger update manually since Map isn't deeply reactive in this specific usage context without reassignment or deep watch
  // Actually, forceUpdate should trigger the computed property which reads the Map.
  // But changing the Map value doesn't automatically trigger the computed property recheck unless the Map itself is reactive.
  // Since we used Ref<Map>, modifying key/value doesn't trigger unless we reassign the map or use Reactive<Map>.
  // Simpler trick: Just increment forceUpdate
  forceUpdate.value++;
}

function handleElementSelect(elementId: string) {
  // Sync with selectionStore for bidirectional selection
  selectionStore.selectSingle(elementId);
  
  // Emit for highlighting on canvas
  emit('highlightElements', [elementId], false);
}

function handleVisibilityToggle(elementId: string) {
  // Architecture: Get element polymorphically and check type with instanceof
  // Try 2D elements first, then 3D elements, then projection planes
  elementsPanelPortRequired.toggleVisibility(elementId);
}
</script>

<style scoped>
.elements-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  border-left: 1px solid #dee2e6;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #dee2e6;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #212529;
}

.elements-tree {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.section {
  margin-bottom: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: #e9ecef;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: background 0.2s;
}

.section-header:hover {
  background: #dee2e6;
}

.section-content {
  padding-left: 12px;
  margin-top: 4px;
}

.plane-group {
  margin-bottom: 8px;
}

.plane-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: #f8f9fa;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 500;
  font-size: 12px;
  transition: background 0.2s;
}

.plane-header:hover {
  background: #e9ecef;
}

.plane-name sub {
  font-size: 0.75em;
}

.plane-content {
  padding-left: 12px;
  margin-top: 2px;
}

.collapse-icon {
  font-size: 10px;
  color: #666;
  width: 12px;
  display: inline-block;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #6c757d;
  font-size: 0.875rem;
}
</style>
