<template>
  <div class="three-view-panel" ref="containerRef">
    <canvas ref="canvasRef" class="three-canvas"></canvas>
    
    <!-- 3D View Controls -->
    <div class="three-controls">
      <div class="control-group">
        <label 
          class="control-label"
          title="Show or hide projection plane surfaces (P_H, P_V, and auxiliary planes)"
        >
          <input type="checkbox" v-model="displayOptions.showPlanes" @change="handleDisplayChange" />
          Show Planes
        </label>
        <label 
          class="control-label"
          title="Display 2D geometric elements (points, lines, circles) positioned on their planes in 3D space"
        >
          <input type="checkbox" v-model="displayOptions.show2DElementsOnPlanes" @change="handleDisplayChange" />
          Show 2D Elements on Planes
        </label>
        <label 
          class="control-label"
          title="Show coordinate grid on each projection plane for spatial reference"
        >
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

import { ref, onMounted, onUnmounted, watch, inject } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { World } from '../../domain/world/World';
import { Element2DRenderer3D } from '../../services/Element2DRenderer3D';
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

// Phase 80: Reactivity trigger for World changes
// World is not reactive (performance reasons), so we use a local ref that increments
// when World notifies us of changes via the observer pattern
const renderTick = ref(0);

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
  controls.minDistance = 2;      // Allow closer zoom (was 5)
  controls.maxDistance = 500;    // Allow much further zoom out (was 100)
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
    // stored in row-major order. Convert to THREE.Matrix4 (row-major, 4x4 with last row [0,0,0,1])
    const e = matrix.elements;
    mat4.set(
      e[0], e[1], e[2], e[9],   // Row 0: [m11, m12, m13, m41]
      e[3], e[4], e[5], e[10],  // Row 1: [m21, m22, m23, m42]
      e[6], e[7], e[8], e[11],  // Row 2: [m31, m32, m33, m43]
      0, 0, 0, 1                // Row 3: [0, 0, 0, 1]
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
 * Render hinge line (HL_HV) in 3D space (Phase 25.2 - T229)
 * 
 * The hinge line is the intersection of P_H and P_V planes.
 * It extends infinitely along the X-axis in the default configuration.
 */
function renderHingeLine() {
  if (!displayOptions.value.showPlanes) return;

  // Remove existing hinge line
  const existing = scene.children.find(child => child.userData.type === 'hinge-line');
  if (existing) {
    scene.remove(existing);
  }

  try {
    const hingeLine = world.getMainHingeLine();
    
    // Get both planes
    const pH = world.getProjectionPlaneByLabel('P_H');
    const pV = world.getProjectionPlaneByLabel('P_V');
    
    if (!pH || !pV) {
      console.warn('[ThreeView] Cannot render hinge line: P_H or P_V not found');
      return;
    }
    
    // Get 3D realizations
    const pHRealization = world.getProjectionPlane3DRealization(pH.id!);
    const pVRealization = world.getProjectionPlane3DRealization(pV.id!);
    
    if (!pHRealization || !pVRealization) {
      console.warn('[ThreeView] Cannot render hinge line: plane realizations not found');
      return;
    }
    
    // The hinge line is the intersection of the two planes
    // For the default configuration (P_H is XZ plane, P_V is XY plane),
    // the intersection is along the X-axis
    // We'll render a long line segment along the intersection
    
    // In the default configuration:
    // - P_H normal = (0, 1, 0) - points up (Y-axis)
    // - P_V normal = (0, 0, 1) - points forward (Z-axis)
    // - Intersection direction = P_H_normal × P_V_normal
    
    // Extract plane normals from transformation matrices
    // The third column (indices 8, 9, 10) of planeTo3D matrix is the plane's normal
    const pHNormal = new THREE.Vector3(
      pHRealization.planeTo3D.elements[8],
      pHRealization.planeTo3D.elements[9],
      pHRealization.planeTo3D.elements[10]
    ).normalize();
    
    const pVNormal = new THREE.Vector3(
      pVRealization.planeTo3D.elements[8],
      pVRealization.planeTo3D.elements[9],
      pVRealization.planeTo3D.elements[10]
    ).normalize();
    
    // Intersection direction = cross product of normals
    const direction = new THREE.Vector3().crossVectors(pHNormal, pVNormal).normalize();
    
    // Get origin point (intersection should pass through origin)
    const origin = new THREE.Vector3(
      pHRealization.planeTo3D.elements[9],
      pHRealization.planeTo3D.elements[10],
      pHRealization.planeTo3D.elements[11]
    );
    
    // Create line extending in both directions from origin
    const lineLength = 40; // Extend 20 units in each direction
    const start = origin.clone().add(direction.clone().multiplyScalar(-lineLength / 2));
    const end = origin.clone().add(direction.clone().multiplyScalar(lineLength / 2));
    
    // Create dashed line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineDashedMaterial({
      color: 0x333333,  // Dark gray per spec
      dashSize: 0.5,
      gapSize: 0.3,
      linewidth: 2
    });
    
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances(); // Required for dashed lines
    line.userData.type = 'hinge-line';
    line.userData.hingeLineId = hingeLine.id;
    scene.add(line);
  } catch (error) {
    console.warn('[ThreeView] Error rendering hinge line:', error);
  }
}

/**
 * Handle display option changes
 */
function handleDisplayChange() {
  renderProjectionPlanes();
  renderHingeLine();
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

  // Phase 80: Subscribe to World changes using observer pattern
  // Increment renderTick whenever World changes, triggering reactive updates
  const handleWorldChange = () => {
    renderTick.value++;
  };
  world.subscribeToChanges(handleWorldChange);

  // Watch renderTick (reactive) to re-render when World changes
  watch(
    renderTick,
    () => {
      renderProjectionPlanes();
      renderHingeLine();
      render2DElements();
    }
  );

  // Watch display options changes (persisted via viewStore)
  watch(
    displayOptions,
    (newOptions, oldOptions) => {
      // Re-render planes and hinge line if showPlanes or showGrid changed
      if (newOptions.showPlanes !== oldOptions?.showPlanes || 
          newOptions.showGrid !== oldOptions?.showGrid) {
        renderProjectionPlanes();
        renderHingeLine();
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

  // Store handleWorldChange for cleanup
  (window as any).__threeViewWorldChangeHandler = handleWorldChange;
});

onUnmounted(() => {
  // Phase 80: Unsubscribe from World changes
  const handleWorldChange = (window as any).__threeViewWorldChangeHandler;
  if (handleWorldChange) {
    world.unsubscribeFromChanges(handleWorldChange);
    delete (window as any).__threeViewWorldChangeHandler;
  }
  
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
