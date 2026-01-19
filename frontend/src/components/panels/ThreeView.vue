<template>
  <div class="three-view-panel" ref="containerRef">
    <canvas ref="canvasRef" class="three-canvas"></canvas>
    
    <!-- 3D View Controls -->
    <div class="three-controls">
      <div class="control-group">
        <label 
          class="control-label"
          title="Show or hide projection plane surfaces in 3D view"
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
  console.log('[ThreeView] initThreeScene called');
  console.log('[ThreeView] World projection planes count:', world.projectionPlanes.size);
  console.log('[ThreeView] World projection planes:', Array.from(world.projectionPlanes.keys()));
  
  if (!containerRef.value || !canvasRef.value) {
    console.warn('[ThreeView] containerRef or canvasRef is null!');
    return;
  }

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
  console.log('[ThreeView] renderProjectionPlanes called, showPlanes=', displayOptions.value.showPlanes);
  
  if (!displayOptions.value.showPlanes) return;

  // Clear existing plane geometry
  scene.children
    .filter(child => child.userData.type === 'projection-plane')
    .forEach(child => scene.remove(child));

  // Render each projection plane
  const planeCount = world.projectionPlanes.size;
  console.log('[ThreeView] Number of projection planes:', planeCount);
  
  for (const plane of world.projectionPlanes.values()) {
    console.log('[ThreeView] Processing plane:', plane.id, 'color:', plane.color);
    
    const planeRealization = world.getProjectionPlane3DRealization(plane.id!);
    console.log('[ThreeView] Plane realization for', plane.id, ':', planeRealization);
    
    if (!planeRealization) {
      console.warn('[ThreeView] No 3D realization for plane', plane.id);
      continue;
    }

    // Create plane mesh (semi-transparent)
    const planeSize = 100; // Size of visual plane representation (increased for visibility)
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
    
    // Use plane's color property (hex string like '#2196F3')
    const planeColor = parseInt(plane.color.replace('#', '0x'));
    console.log('[ThreeView] Plane color:', plane.color, '→', planeColor.toString(16));
    
    const material = new THREE.MeshBasicMaterial({
      color: planeColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3
    });
    const planeMesh = new THREE.Mesh(geometry, material);

    // Apply transformation from planeRealization.planeTo3D matrix
    const matrix = planeRealization.planeTo3D;
    const e = matrix.elements;
    console.log('[ThreeView] planeTo3D matrix elements:', e);
    
    // Matrix4x3 transforms (u,v,1) → (x,y,z,w) for homogeneous 2D→3D conversion
    // Elements: [m11,m12,m13, m21,m22,m23, m31,m32,m33, m41,m42,m43]
    // Row 1: x = m11*u + m12*v + m13*1
    // Row 2: y = m21*u + m22*v + m23*1  
    // Row 3: z = m31*u + m32*v + m33*1
    // Row 4: w = m41*u + m42*v + m43*1 (homogeneous coordinate, should = 1)
    
    // For Three.js, we need a 4x4 matrix where:
    // - First 3 columns = basis vectors (u direction, v direction, normal)
    // - Fourth column = translation (origin point in 3D)
    
    // Extract basis vectors:
    // U-axis direction: transform (1,0,0) → (m11, m21, m31) / w
    // V-axis direction: transform (0,1,0) → (m12, m22, m32) / w
    // Normal direction: cross product of U and V axes
    // Origin: transform (0,0,1) → (m13, m23, m33) / m43
    
    const originW = e[11]; // m43 - homogeneous w for origin point
    const originX = e[2] / originW;  // m13 / w
    const originY = e[5] / originW;  // m23 / w
    const originZ = e[8] / originW;  // m33 / w
    
    console.log('[ThreeView] Plane origin in 3D:', [originX, originY, originZ]);
    
    // Compute the normal as the cross product of U-axis and V-axis
    // U-axis: first column [e[0], e[3], e[6]]
    // V-axis: second column [e[1], e[4], e[7]]
    // Normal = U × V
    const uAxis = new THREE.Vector3(e[0], e[3], e[6]);
    const vAxis = new THREE.Vector3(e[1], e[4], e[7]);
    const normal = new THREE.Vector3().crossVectors(uAxis, vAxis).normalize();
    
    console.log('[ThreeView] U-axis:', [uAxis.x, uAxis.y, uAxis.z]);
    console.log('[ThreeView] V-axis:', [vAxis.x, vAxis.y, vAxis.z]);
    console.log('[ThreeView] Normal:', [normal.x, normal.y, normal.z]);
    
    // Build THREE.Matrix4 with correct basis and translation
    const mat4 = new THREE.Matrix4();
    mat4.set(
      e[0], e[1], normal.x, originX,   // Row 0: [Ux, Vx, Nx, Tx]
      e[3], e[4], normal.y, originY,   // Row 1: [Uy, Vy, Ny, Ty]
      e[6], e[7], normal.z, originZ,   // Row 2: [Uz, Vz, Nz, Tz]
      0,    0,    0,        1           // Row 3: [0, 0, 0, 1]
    );
    console.log('[ThreeView] THREE.Matrix4:', mat4.toArray());
    
    planeMesh.applyMatrix4(mat4);
    console.log('[ThreeView] planeMesh position after transform:', planeMesh.position.toArray());

    planeMesh.userData.type = 'projection-plane';
    planeMesh.userData.planeId = plane.id;
    scene.add(planeMesh);
    console.log('[ThreeView] Added plane mesh to scene');

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
 * Render 3D elements in 3D space (Phase 78)
 * 
 * Renders user-created 3D elements (points, lines, segments) with thicker/wider visual style.
 * 3D elements are reconstructed from 2D projections and displayed in true 3D coordinates.
 */
function render3DElements() {
  // Remove existing 3D elements
  scene.children
    .filter(child => child.userData.type === '3d-element')
    .forEach(child => scene.remove(child));

  try {
    // Render 3D Points
    const points3D = world.getAll3DPoints();
    console.log('[ThreeView] render3DElements called - found', points3D.length, '3D points');
    
    for (const point of points3D) {
      console.log('[ThreeView] Processing 3D point:', point.id, point.kind);
      
      const realization = world.get3DPointRealization(point.id!);
      console.log('[ThreeView] Got realization:', {
        exists: !!realization,
        feasible: realization?.isFeasible
      });
      
      if (!realization || !realization.isFeasible) {
        console.warn('[ThreeView] Skipping point - not feasible');
        continue;
      }
      
      const [x, y, z] = realization.getCartesian();
      console.log('[ThreeView] Point 3D coordinates:', { x, y, z });
      
      // Create sphere for 3D point (thicker than 2D points)
      const geometry = new THREE.SphereGeometry(0.15, 16, 16); // Radius 0.15 (vs 0.1 for 2D)
      const material = new THREE.MeshStandardMaterial({
        color: point.visualStyle?.color || '#FF6B35', // Orange for 3D elements
        emissive: 0x000000,
        metalness: 0.3,
        roughness: 0.7
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, z);
      sphere.userData.type = '3d-element';
      sphere.userData.elementType = 'point';
      sphere.userData.elementId = point.id;
      scene.add(sphere);
    }

    // Render 3D Lines
    const lines3D = world.getAll3DLines();
    console.log('[ThreeView] Rendering', lines3D.length, '3D lines');
    
    for (const line of lines3D) {
      const realization = world.get3DLineRealization(line.id!);
      if (!realization || !realization.isFeasible) continue;
      
      // Get point and direction on the line for rendering (extend far in both directions)
      const pointOnLine = realization.point;
      const direction = realization.getDirection();
      
      const lineLength = 50; // Extend 25 units in each direction
      const start = new THREE.Vector3(
        pointOnLine.x - direction.x * lineLength / 2,
        pointOnLine.y - direction.y * lineLength / 2,
        pointOnLine.z - direction.z * lineLength / 2
      );
      const end = new THREE.Vector3(
        pointOnLine.x + direction.x * lineLength / 2,
        pointOnLine.y + direction.y * lineLength / 2,
        pointOnLine.z + direction.z * lineLength / 2
      );
      
      // Create line geometry (thicker than 2D lines)
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const material = new THREE.LineBasicMaterial({
        color: line.visualStyle?.color || '#FF6B35',
        linewidth: 3 // Thicker than 2D (though linewidth may not work on all platforms)
      });
      const lineObj = new THREE.Line(geometry, material);
      lineObj.userData.type = '3d-element';
      lineObj.userData.elementType = 'line';
      lineObj.userData.elementId = line.id;
      scene.add(lineObj);
    }

    // Render 3D Segments
    const segments3D = world.getAll3DSegments();
    console.log('[ThreeView] Rendering', segments3D.length, '3D segments');
    
    for (const segment of segments3D) {
      const realization = world.get3DSegmentRealization(segment.id!);
      if (!realization || !realization.isFeasible) continue;
      
      // Get endpoints from Vector4 and convert to Vector3
      const start = new THREE.Vector3(
        realization.startPoint.x,
        realization.startPoint.y,
        realization.startPoint.z
      );
      const end = new THREE.Vector3(
        realization.endPoint.x,
        realization.endPoint.y,
        realization.endPoint.z
      );
      
      // Create segment geometry (thicker than 2D segments)
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const material = new THREE.LineBasicMaterial({
        color: segment.visualStyle?.color || '#FF6B35',
        linewidth: 3
      });
      const segmentObj = new THREE.Line(geometry, material);
      segmentObj.userData.type = '3d-element';
      segmentObj.userData.elementType = 'segment';
      segmentObj.userData.elementId = segment.id;
      scene.add(segmentObj);
      
      // Add endpoint spheres
      const endpointGeometry = new THREE.SphereGeometry(0.12, 12, 12);
      const endpointMaterial = new THREE.MeshStandardMaterial({
        color: segment.visualStyle?.color || '#FF6B35',
        emissive: 0x000000,
        metalness: 0.3,
        roughness: 0.7
      });
      
      const startSphere = new THREE.Mesh(endpointGeometry, endpointMaterial);
      startSphere.position.copy(start);
      startSphere.userData.type = '3d-element';
      scene.add(startSphere);
      
      const endSphere = new THREE.Mesh(endpointGeometry, endpointMaterial);
      endSphere.position.copy(end);
      endSphere.userData.type = '3d-element';
      scene.add(endSphere);
    }

    // Note: 3D Planes rendering omitted for now - can be added later if needed
    // (Plane3DFromTraces would be rendered as semi-transparent planes)

  } catch (error) {
    console.warn('[ThreeView] Error rendering 3D elements:', error);
  }
}

/**
 * Render all hinge lines in 3D space (Phase 25.2 - T229)
 * 
 * Iterates through ALL hinge lines in the world (no special "main" hinge line treatment).
 * Computes intersection direction generically using cross product of plane normals.
 */
function renderHingeLines() {
  if (!displayOptions.value.showPlanes) return;

  // Remove existing hinge lines
  const existingLines = scene.children.filter(child => child.userData.type === 'hinge-line');
  existingLines.forEach(line => scene.remove(line));

  try {
    // Iterate through ALL hinge lines (generic - works for any plane combinations)
    const hingeLines = world.getAllHingeLines();
    
    for (const hingeLine of hingeLines) {
      // Get both planes from hinge line (generic - works for any two planes)
      const plane1 = world.getProjectionPlaneById(hingeLine.plane1Id);
      const plane2 = world.getProjectionPlaneById(hingeLine.plane2Id);
      
      if (!plane1 || !plane2) {
        console.warn('[ThreeView] Cannot render hinge line: planes not found', hingeLine.id);
        continue;
      }
    
      // Get 3D realizations
      const plane1Realization = world.getProjectionPlane3DRealization(plane1.id!);
      const plane2Realization = world.getProjectionPlane3DRealization(plane2.id!);
      
      if (!plane1Realization || !plane2Realization) {
        console.warn('[ThreeView] Cannot render hinge line: plane realizations not found', hingeLine.id);
        continue;
      }
      
      // Extract plane normals from transformation matrices (generic algorithm)
      // The third column (indices 8, 9, 10) of planeTo3D matrix is the plane's normal
      const plane1Normal = new THREE.Vector3(
        plane1Realization.planeTo3D.elements[8],
        plane1Realization.planeTo3D.elements[9],
        plane1Realization.planeTo3D.elements[10]
      ).normalize();
      
      const plane2Normal = new THREE.Vector3(
        plane2Realization.planeTo3D.elements[8],
        plane2Realization.planeTo3D.elements[9],
        plane2Realization.planeTo3D.elements[10]
      ).normalize();
      
      // Intersection direction = cross product of normals (generic for any two planes)
      const direction = new THREE.Vector3().crossVectors(plane1Normal, plane2Normal).normalize();
      
      // Get origin point - use plane1's origin (translation from matrix)
      const origin = new THREE.Vector3(
        plane1Realization.planeTo3D.elements[9],
        plane1Realization.planeTo3D.elements[10],
        plane1Realization.planeTo3D.elements[11]
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
    }
  } catch (error) {
    console.warn('[ThreeView] Error rendering hinge lines:', error);
  }
}

/**
 * Handle display option changes
 */
function handleDisplayChange() {
  renderProjectionPlanes();
  renderHingeLines();
  render2DElements();
  render3DElements(); // Phase 78
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
      renderHingeLines();
      render2DElements();
      render3DElements(); // Phase 78
    }
  );

  // Watch display options changes (persisted via viewStore)
  watch(
    displayOptions,
    (newOptions, oldOptions) => {
      // Re-render planes and hinge lines if showPlanes or showGrid changed
      if (newOptions.showPlanes !== oldOptions?.showPlanes || 
          newOptions.showGrid !== oldOptions?.showGrid) {
        renderProjectionPlanes();
        renderHingeLines();
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
