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
import type { World } from '@/domain/world/World';
import { useSelectionStore } from '@/stores/selectionStore';
import ElementTypeGroup from './ElementTypeGroup.vue';
import { Point2D } from '@/domain/world/Point';
import { Line2D } from '@/domain/world/Line';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { Circle2D } from '@/domain/world/Circle';
import { Guide2D } from '@/domain/world/Guide';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { formatElementLabel } from '@/utils/formatUtils';

// Emits
const emit = defineEmits<{
  highlightElements: [elementIds: string[], temporary: boolean];
  clearHighlight: [];
}>();

// Injected dependencies
const world = inject<World>('world')!;

// Selection store for bidirectional sync
const selectionStore = useSelectionStore();

// Local state
const is2DSectionCollapsed = ref(false);
const is3DSectionCollapsed = ref(false);
const planeCollapsedStates = ref(new Map<string, boolean>());

// Track World version for reactivity
const worldVersion = computed(() => world.getVersion());

// Force re-render by polling world version changes
const forceUpdate = ref(0);
let intervalId: number | null = null;
let lastVersion = world.getVersion();

onMounted(() => {
  console.log('[ElementsPanel] Mounted, initial World version:', world.getVersion());
  const allPlanes = world.getAllProjectionPlanes();
  const totalPoints = allPlanes.reduce((sum, plane) => sum + plane.getAllPoints().length, 0);
  const totalLines = allPlanes.reduce((sum, plane) => sum + plane.getAllLines().length, 0);
  // console.log('[ElementsPanel] Initial points:', totalPoints);
  // console.log('[ElementsPanel] Initial lines:', totalLines);
  
  intervalId = window.setInterval(() => {
    const currentVersion = world.getVersion();
    if (currentVersion !== lastVersion) {
      console.log('[ElementsPanel] World version changed:', lastVersion, '→', currentVersion);
      lastVersion = currentVersion;
      forceUpdate.value++;
    }
  }, 100);
});

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});

// Get elements from World
const projectionPlanesList = computed(() => {
  const version = worldVersion.value; // Create dependency
  const update = forceUpdate.value; // Create dependency
  
  // Phase 90: Dynamic projection planes list
  console.log('[ElementsPanel] Computing projection planes list, version:', version, 'forceUpdate:', update);
  
  const allPlanes = world.getAllProjectionPlanes();
  
  // Sort planes: P_H, P_V first, then others
  const sortedPlanes = [...allPlanes].sort((a, b) => {
    // P_H always first
    if (a.name === 'P_H') return -1;
    if (b.name === 'P_H') return 1;
    // P_V second
    if (a.name === 'P_V') return -1;
    if (b.name === 'P_V') return 1;
    // Others by name/creation order
    return a.name.localeCompare(b.name);
  });
  
  return sortedPlanes.map(plane => {
    const points = plane.getAllPoints();
    const allLines = plane.getAllLines();
    const lines = allLines.filter(l => !(l instanceof HalfHingeLine2D) && !(l instanceof Segment2DByPoints) && !(l instanceof Guide2D));
    const segments = allLines.filter(l => l instanceof Segment2DByPoints);
    const circles = plane.getAllCircles();
    const guides = allLines.filter(l => l instanceof Guide2D);
    
    // Check collapse state (default expanded for P_H/P_V, maybe collapsed for others? Let's default all expanded or based on map)
    // Initialize if not present
    if (!planeCollapsedStates.value.has(plane.id!)) {
        // Default to OPEN (false)
        planeCollapsedStates.value.set(plane.id!, false);
    }
    const isCollapsed = planeCollapsedStates.value.get(plane.id!) || false;

    return {
      id: plane.id!,
      name: plane.name,
      label: plane.name === 'P_H' ? 'Horizontal' : (plane.name === 'P_V' ? 'Vertical' : 'Auxiliary'),
      isCollapsed,
      elements: {
        points: points.map(formatElement),
        lines: lines.map(formatElement),
        segments: segments.map(formatElement),
        circles: circles.map(formatElement),
        guides: guides.map(formatElement)
      },
      hasElements: points.length + lines.length + segments.length + circles.length + guides.length > 0
    };
  });
});

const threeDElements = computed(() => {
  worldVersion.value; // Create dependency
  forceUpdate.value; // Create dependency
  
  console.log('[ElementsPanel] Computing 3D elements');
  
  // Fetch 3D elements from World (Phase 78)
  const points = world.getAll3DPoints();
  const lines = world.getAll3DLines();
  const segments = world.getAll3DSegments();
  const planes = world.getAllPlanes();
  
  console.log('[ElementsPanel] 3D elements:', {
    points: points.length,
    lines: lines.length,
    segments: segments.length,
    planes: planes.length
  });
  
  return {
    points: points.map(formatElement),
    lines: lines.map(formatElement),
    segments: segments.map(formatElement),
    planes: planes.map(formatElement),
    hasElements: points.length + lines.length + segments.length + planes.length > 0
  };
});

const hasAnyElements = computed(() => {
  return projectionPlanesList.value.some(p => p.hasElements) ||
         threeDElements.value.hasElements;
});

// Helper functions
function formatElement(element: any): any {
  // Determine type using instanceof checks
  let type = 'unknown';
  if (element instanceof Guide2D) {
    type = 'guide';
  } else if (element instanceof Segment2DByPoints) {
    type = 'segment';
  } else if (element instanceof Line2D) {
    type = 'line';
  } else if (element instanceof Circle2D) {
    type = 'circle';
  } else if (element instanceof Point2D) {
    type = 'point';
  }
  
  return {
    id: element.id,
    label: formatLabel(element),
    type: type,
    visible: element.visualStyle?.visible !== false,
    properties: getElementProperties(element)
  };
}

function formatLabel(element: any): string {
  // Use element label if available, otherwise use unaltered hierarchical ID
  // Hierarchical IDs (e.g., "proj_plane_H/point2d_1") are self-documenting
  // and show which plane the element belongs to
  return element.label || element.id;
}

function getElementProperties(element: any): string {
  // Format key properties for display
  if ('position' in element) {
    const pos = element.position;
    return `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
  }
  if ('radius' in element) {
    return `r=${element.radius.toFixed(2)}`;
  }
  return '';
}

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
  // Architecture: Handle both 2D and 3D elements
  // 2D elements have format "containerId/localId", 3D elements don't have "/"
  
  let element: any;
  if (elementId.includes('/')) {
    // 2D element - use getElement2D
    element = world.getElement2D(elementId);
  } else {
    // 3D element, projection plane, or hinge line - use getElement3DById or getProjectionPlaneById
    element = world.getElement3DById(elementId) || world.getProjectionPlaneById(elementId);
  }
  
  if (element) {
    if (!element.visualStyle) {
      element.visualStyle = { color: '#000000', lineWidth: 2, lineStyle: 'solid', opacity: 1.0, visible: false, inherited: true };
    } else {
      element.visualStyle.visible = !element.visualStyle.visible;
    }
    // Notify world of change for reactivity
    world.markDirty();
  }
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
