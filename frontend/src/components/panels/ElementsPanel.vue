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
          <div v-if="!horizontalElements.hasElements && !verticalElements.hasElements" class="empty-state">
            <p>No elements yet. Use the tools to create points, lines, and other geometric objects.</p>
          </div>
          
          <!-- Horizontal Plane -->
          <div v-if="horizontalElements.hasElements" class="plane-group">
            <div class="plane-header" @click="toggleHPlane">
              <span class="collapse-icon">{{ isHPlaneCollapsed ? '▶' : '▼' }}</span>
              <span class="plane-name">P<sub>H</sub> (Horizontal)</span>
            </div>
            
            <div v-if="!isHPlaneCollapsed" class="plane-content">
              <ElementTypeGroup
                v-if="horizontalElements.points.length > 0"
                title="Points"
                :elements="horizontalElements.points"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
              <ElementTypeGroup
                v-if="horizontalElements.lines.length > 0"
                title="Lines"
                :elements="horizontalElements.lines"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
              <ElementTypeGroup
                v-if="horizontalElements.segments.length > 0"
                title="Segments"
                :elements="horizontalElements.segments"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
              <ElementTypeGroup
                v-if="horizontalElements.circles.length > 0"
                title="Circles"
                :elements="horizontalElements.circles"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
              <ElementTypeGroup
                v-if="horizontalElements.guides.length > 0"
                title="Guides"
                :elements="horizontalElements.guides"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
            </div>
          </div>

          <!-- Vertical Plane -->
          <div v-if="verticalElements.hasElements" class="plane-group">
            <div class="plane-header" @click="toggleVPlane">
              <span class="collapse-icon">{{ isVPlaneCollapsed ? '▶' : '▼' }}</span>
              <span class="plane-name">P<sub>V</sub> (Vertical)</span>
            </div>
            
            <div v-if="!isVPlaneCollapsed" class="plane-content">
              <ElementTypeGroup
                v-if="verticalElements.points.length > 0"
                title="Points"
                :elements="verticalElements.points"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
              <ElementTypeGroup
                v-if="verticalElements.lines.length > 0"
                title="Lines"
                :elements="verticalElements.lines"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
              <ElementTypeGroup
                v-if="verticalElements.segments.length > 0"
                title="Segments"
                :elements="verticalElements.segments"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
              <ElementTypeGroup
                v-if="verticalElements.circles.length > 0"
                title="Circles"
                :elements="verticalElements.circles"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
              <ElementTypeGroup
                v-if="verticalElements.guides.length > 0"
                title="Guides"
                :elements="verticalElements.guides"
                @select="handleElementSelect"
                @toggle-visibility="handleVisibilityToggle"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 3D Elements Section -->
      <div class="section">
        <div class="section-header" @click="toggle3DSection">
          <span class="collapse-icon">{{ is3DSectionCollapsed ? '▶' : '▼' }}</span>
          <span class="section-title">3D Elements</span>
        </div>
        
        <div v-if="!is3DSectionCollapsed" class="section-content">
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
const isHPlaneCollapsed = ref(false);
const isVPlaneCollapsed = ref(false);

// Track World version for reactivity
const worldVersion = computed(() => world.getVersion());

// Force re-render by polling world version changes
const forceUpdate = ref(0);
let intervalId: number | null = null;
let lastVersion = world.getVersion();

onMounted(() => {
  console.log('[ElementsPanel] Mounted, initial World version:', world.getVersion());
  const allPoints = world.getAllPoints2D();
  console.log('[ElementsPanel] Initial points:', allPoints.length);
  console.log('[ElementsPanel] Point planeIds:', allPoints.map(p => ({ id: p.id, planeId: p.planeId })));
  console.log('[ElementsPanel] Initial lines:', world.getAllLines2D().length);
  
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
const horizontalElements = computed(() => {
  const version = worldVersion.value; // Create dependency
  const update = forceUpdate.value; // Create dependency
  
  console.log('[ElementsPanel] Computing P_H elements, version:', version, 'forceUpdate:', update);
  
  const points = world.getAllPoints2D()
    .filter(p => p.planeId === 'proj_plane_H');
  const lines = world.getAllLines2D()
    .filter(l => l.planeId === 'proj_plane_H' && !l.id.includes('half_HL'));
  const segments = world.getAllSegments2D()
    .filter(s => s.planeId === 'proj_plane_H');
  const circles = world.getAllCircles2D()
    .filter(c => c.planeId === 'proj_plane_H');
  const guides = world.getAllGuides2D()
    .filter(g => g.planeId === 'proj_plane_H');
  
  console.log('[ElementsPanel] P_H elements:', {
    points: points.length,
    lines: lines.length,
    segments: segments.length,
    circles: circles.length,
    guides: guides.length
  });
  
  return {
    points: points.map(formatElement),
    lines: lines.map(formatElement),
    segments: segments.map(formatElement),
    circles: circles.map(formatElement),
    guides: guides.map(formatElement),
    hasElements: points.length + lines.length + segments.length + circles.length + guides.length > 0
  };
});

const verticalElements = computed(() => {
  worldVersion.value; // Create dependency
  forceUpdate.value; // Create dependency
  
  const points = world.getAllPoints2D()
    .filter(p => p.planeId === 'proj_plane_V');
  const lines = world.getAllLines2D()
    .filter(l => l.planeId === 'proj_plane_V' && !l.id.includes('half_HL'));
  const segments = world.getAllSegments2D()
    .filter(s => s.planeId === 'proj_plane_V');
  const circles = world.getAllCircles2D()
    .filter(c => c.planeId === 'proj_plane_V');
  const guides = world.getAllGuides2D()
    .filter(g => g.planeId === 'proj_plane_V');
  
  console.log('[ElementsPanel] P_V elements:', {
    points: points.length,
    lines: lines.length,
    segments: segments.length,
    circles: circles.length,
    guides: guides.length
  });
  
  return {
    points: points.map(formatElement),
    lines: lines.map(formatElement),
    segments: segments.map(formatElement),
    circles: circles.map(formatElement),
    guides: guides.map(formatElement),
    hasElements: points.length + lines.length + segments.length + circles.length + guides.length > 0
  };
});

const threeDElements = computed(() => {
  worldVersion.value; // Create dependency
  forceUpdate.value; // Create dependency
  
  // TODO: 3D elements not implemented yet
  return {
    points: [],
    lines: [],
    segments: []
  };
});

const hasAnyElements = computed(() => {
  return horizontalElements.value.hasElements ||
         verticalElements.value.hasElements ||
         threeDElements.value.points.length > 0 ||
         threeDElements.value.lines.length > 0 ||
         threeDElements.value.segments.length > 0;
});

// Helper functions
function formatElement(element: any): any {
  return {
    id: element.id,
    label: formatLabel(element),
    type: getElementType(element),
    visible: element.visible !== false,
    properties: getElementProperties(element)
  };
}

function formatLabel(element: any): string {
  // Format element ID for display with subscript notation
  let label = element.id;
  
  // Remove common prefixes
  label = label.replace(/^point2d_/, '')
    .replace(/^line2d_/, '')
    .replace(/^segment2d_/, '')
    .replace(/^circle2d_/, '')
    .replace(/^guide2d_/, '');
  
  // Add subscript for plane (P_H → subscript H, P_V → subscript V)
  if (element.planeId === 'proj_plane_H') {
    label = label + '�subscriptH�';
  } else if (element.planeId === 'proj_plane_V') {
    label = label + '�subscriptV�';
  }
  
  return label;
}

function getElementType(element: any): string {
  // Determine element type from its properties
  if ('position' in element || 'rule' in element) return 'point';
  if ('direction' in element && !('point1Id' in element)) return 'line';
  if ('point1Id' in element && 'point2Id' in element) return 'segment';
  if ('radius' in element) return 'circle';
  if ('transportRule' in element) return 'guide';
  return 'unknown';
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

function toggleHPlane() {
  isHPlaneCollapsed.value = !isHPlaneCollapsed.value;
}

function toggleVPlane() {
  isVPlaneCollapsed.value = !isVPlaneCollapsed.value;
}

function handleElementSelect(elementId: string) {
  // Sync with selectionStore for bidirectional selection
  selectionStore.selectSingle(elementId);
  
  // Emit for highlighting on canvas
  emit('highlightElements', [elementId], false);
}

function handleVisibilityToggle(elementId: string) {
  // Determine element type from ID prefix and call appropriate World method
  if (elementId.startsWith('point2d_')) {
    world.togglePoint2DVisibility(elementId);
  } else if (elementId.startsWith('line2d_')) {
    world.toggleLine2DVisibility(elementId);
  } else if (elementId.startsWith('segment2d_')) {
    world.toggleSegment2DVisibility(elementId);
  } else if (elementId.startsWith('circle2d_')) {
    world.toggleCircle2DVisibility(elementId);
  } else if (elementId.startsWith('guide2d_')) {
    world.toggleGuide2DVisibility(elementId);
  }
  
  // World.notifyChange() is called internally, which will trigger UI update
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
