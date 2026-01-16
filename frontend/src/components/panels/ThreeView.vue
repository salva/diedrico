<template>
  <div class="three-view-panel" ref="containerRef">
    <canvas ref="canvasRef" class="three-canvas"></canvas>
    
    <!-- 3D View Controls -->
    <div class="three-controls">
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" v-model="displayOptions.showPlanes" @change="handleDisplayChange" />
          Show Planes
        </label>
        <label class="control-label">
          <input type="checkbox" v-model="displayOptions.show2DElementsOnPlanes" @change="handleDisplayChange" />
          Show 2D Elements on Planes
        </label>
        <label class="control-label">
          <input type="checkbox" v-model="displayOptions.showGrid" @change="handleDisplayChange" />
          Show Grid
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ThreeView.vue - 3D visualization panel
 * 
 * Phase 25: 3D View Panel
 * 
 * Displays 3D reconstruction of dihedral geometry using Three.js.
 * - Shows projection planes in 3D space
 * - Renders 2D elements positioned on their planes (Phase 77 integration)
 * - Provides orbit camera controls for exploration
 * - Read-only view for understanding spatial relationships
 * 
 * Architecture:
 * - Three.js Scene: Main 3D container
 * - PerspectiveCamera: User's viewpoint with OrbitControls
 * - WebGLRenderer: Renders scene to canvas
 * - PlaneRenderer3D: Renders projection plane surfaces
 * - Element2DRenderer3D: Renders 2D elements on planes (Phase 77)
 * 
 * @see specs/001-dihedral-learning-mvp/ui-spec.md#3d-view-overlay
 * @see specs/001-dihedral-learning-mvp/tasks.md#phase-25-3d-view-panel
 */

import { ref, onMounted, onUnmounted, watch, inject, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { World } from '../../domain/world/World';
import { Element2DRenderer3D } from '../../services/Element2DRenderer3D';
import type { ThreeViewDisplayOptions } from '../../types/ThreeViewDisplayOptions';
import { useViewStore } from '../../stores/viewStore';

// Component refs
const containerRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();

// Three.js infrastructure
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let element2DRenderer: Element2DRenderer3D;
let animationFrameId: number;

// View store for display options persistence (Phase 77.5 - T1203)
const viewStore = useViewStore();
const displayOptions = viewStore.threeViewOptions;

// World instance (injected from App.vue)
const world = inject<World>('world')!;  // Non-null assertion - World is required

// Track World version for reactivity
const worldVersion = computed(() => world.getVersion());

/**
 * Initialize Three.js scene and infrastructure
 */
function initThreeScene() {
  if (!containerRef.value || !canvasRef.value) return;

  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5); // Light grey background

  // Create camera
  const aspect = containerRef.value.clientWidth / containerRef.value.clientHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  camera.position.set(15, 15, 15); // Positioned to see both planes
  camera.lookAt(0, 0, 0);

  // Create renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: false
  });
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Create orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI; // Allow full rotation

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight.position.set(10, 10, 10);
  scene.add(directionalLight);

  // Add coordinate axes helper
  const axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);

  // Initialize Element2DRenderer3D service
  element2DRenderer = new Element2DRenderer3D(scene);

  // Render initial planes
  renderProjectionPlanes();

  // Start animation loop
  animate();
}

/**
 * Render projection planes in 3D space
 */
function renderProjectionPlanes() {
  if (!displayOptions.value.showPlanes) return;

  // Clear existing plane geometry
  scene.children
    .filter(child => child.userData.type === 'projection-plane')
    .forEach(child => scene.remove(child));

  // Render each projection plane
  for (const plane of world.projectionPlanes.values()) {
    const planeRealization = world.getProjectionPlane3DRealization(plane.id!);
    if (!planeRealization) continue;

    // Create plane mesh (semi-transparent)
    const planeSize = 20; // Size of visual plane representation
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const material = new THREE.MeshBasicMaterial({
      color: plane.id === 'P_H' ? 0x4CAF50 : 0x2196F3, // Green for P_H, Blue for P_V
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const planeMesh = new THREE.Mesh(geometry, material);

    // Apply transformation from planeRealization.planeTo3D matrix
    const matrix = planeRealization.planeTo3D;
    const mat4 = new THREE.Matrix4();
    // Matrix4x3.elements is flat array [m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43]
    // Convert to THREE.Matrix4 (column-major, 4x4 with last row [0,0,0,1])
    const e = matrix.elements;
    mat4.set(
      e[0], e[3], e[6], e[9],   // Column 0
      e[1], e[4], e[7], e[10],  // Column 1
      e[2], e[5], e[8], e[11],  // Column 2
      0, 0, 0, 1                // Column 3
    );
    planeMesh.applyMatrix4(mat4);

    planeMesh.userData.type = 'projection-plane';
    planeMesh.userData.planeId = plane.id;
    scene.add(planeMesh);

    // Add plane border (grid)
    if (displayOptions.value.showGrid) {
      const gridHelper = new THREE.GridHelper(planeSize, 20, 0x888888, 0xcccccc);
      gridHelper.applyMatrix4(mat4);
      gridHelper.userData.type = 'projection-plane';
      scene.add(gridHelper);
    }
  }
}

/**
 * Render 2D elements on planes (Phase 77 integration)
 */
function render2DElements() {
  if (!displayOptions.value.show2DElementsOnPlanes || !element2DRenderer) {
    element2DRenderer?.clear();
    return;
  }

  element2DRenderer.renderElements(world, displayOptions.value);
}

/**
 * Handle display option changes
 */
function handleDisplayChange() {
  renderProjectionPlanes();
  render2DElements();
}

/**
 * Animation loop
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  
  controls.update(); // Required for damping
  renderer.render(scene, camera);
}

/**
 * Handle window resize
 */
function handleResize() {
  if (!containerRef.value || !camera || !renderer) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

/**
 * Cleanup on unmount
 */
function cleanup() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  if (controls) {
    controls.dispose();
  }

  if (element2DRenderer) {
    element2DRenderer.clear();
  }

  if (renderer) {
    renderer.dispose();
  }

  window.removeEventListener('resize', handleResize);
}

// Lifecycle hooks
onMounted(() => {
  initThreeScene();
  window.addEventListener('resize', handleResize);

  // Watch world version changes (World is not reactive)
  watch(
    worldVersion,
    () => {
      renderProjectionPlanes();
      render2DElements();
    }
  );

  // Watch display options changes (persisted via viewStore)
  watch(
    displayOptions,
    (newOptions, oldOptions) => {
      // Re-render planes if showPlanes or showGrid changed
      if (newOptions.showPlanes !== oldOptions?.showPlanes || 
          newOptions.showGrid !== oldOptions?.showGrid) {
        renderProjectionPlanes();
      }
      
      // Re-render 2D elements if show2DElementsOnPlanes changed
      if (newOptions.show2DElementsOnPlanes !== oldOptions?.show2DElementsOnPlanes) {
        if (!newOptions.show2DElementsOnPlanes) {
          element2DRenderer.clear();
        } else {
          render2DElements();
        }
      }
    },
    { deep: true }
  );
});

onUnmounted(() => {
  cleanup();
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

.control-label input[type="checkbox"] {
  cursor: pointer;
}
</style>
