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
        <label 
          class="control-label"
          title="Show coordinate axes (X/Y/Z) at origin for spatial reference and debugging"
        >
          <input type="checkbox" v-model="displayOptions.showReferenceAxes" @change="handleDisplayChange" />
          Show Reference Axes
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
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { World } from '../../domain/world/World';
import type { ProjectionPlane } from '../../domain/world/ProjectionPlane';
import { AuxiliaryProjectionPlane } from '../../domain/world/ProjectionPlane';
import { Element2DRenderer3D } from '../../services/Element2DRenderer3D';
import { useViewStore } from '../../stores/viewStore';
import { domainDirectionToThreeJS, domainToThreeJS, applyMatrix4x3 } from '../../utils/threeUtils';
import { convertPlaneRectangleTo2D, generateClippedGrid, type Segment2D } from '../../utils/rectangleGrid';
import { Vector4 } from 'three';
import type { Plane3DRealization3D } from '../../domain/world/Element3DRealization3D';

/**
 * Generate a simple fallback grid (non-clipped) centered at origin
 */
function generateFallbackGrid(halfSize: number, divisions: number): Segment2D[] {
  const segments: Segment2D[] = [];
  const step = (halfSize * 2) / divisions;
  
  for (let i = 0; i <= divisions; i++) {
    const t = -halfSize + i * step;
    
    // Lines parallel to U-axis
    segments.push({
      start: { u: -halfSize, v: t },
      end: { u: halfSize, v: t }
    });
    
    // Lines parallel to V-axis
    segments.push({
      start: { u: t, v: -halfSize },
      end: { u: t, v: halfSize }
    });
  }
  
  return segments;
}

// Component refs
const containerRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();

// Three.js infrastructure
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let labelRenderer: CSS2DRenderer;  // Phase 82: For axis labels
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
  // console.log('[ThreeView] initThreeScene called');
  // console.log('[ThreeView] World projection planes count:', world.projectionPlanes.size);
  // console.log('[ThreeView] World projection planes:', Array.from(world.projectionPlanes.keys()));
  
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
  
  // Position camera at domain direction (1,1,1) looking at origin (0,0,0)
  // Domain direction (1,1,1) represents top-right-back in domain coordinates
  const cameraDistance = 30;
  const domainDirection = new THREE.Vector3(1, 1, 1).normalize(); // Normalize as Vector3
  const cameraPos = domainDirectionToThreeJS(domainDirection);
  camera.position.set(
    cameraPos.x * cameraDistance,
    cameraPos.y * cameraDistance,
    cameraPos.z * cameraDistance
  );
  
  // Set camera up vector to align with domain Z axis (vertical)
  // Domain Z (0,0,1) stays as (0,0,1) in Three.js (Z unchanged)
  const domainUpDirection = new THREE.Vector3(0, 0, 1);
  const upVector = domainDirectionToThreeJS(domainUpDirection);
  camera.up.set(upVector.x, upVector.y, upVector.z);
  
  camera.lookAt(0, 0, 0);

  // Create renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: false
  });
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Create CSS2DRenderer for labels (Phase 82)
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.pointerEvents = 'none';
  containerRef.value.appendChild(labelRenderer.domElement);

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

  // Initialize Element2DRenderer3D service
  element2DRenderer = new Element2DRenderer3D(scene);

  // Render initial state
  renderProjectionPlanes();
  renderHingeLines();
  render2DElements();
  render3DElements();  // Render 3D elements including planes on initial load

  // Render reference axes (Phase 82)
  renderReferenceAxes();

  // Start animation loop
  animate();
}

/**
 * Compute the 4 corners of a rendered 3D plane rectangle in domain coordinates
 * Uses the rectangle geometry from the plane realization
 */
/**
 * Compute 3D rectangle corners using the precomputed transformation from planeRealization.
 * Uses the getRectangleCorners() method from Plane3DRealization3D.
 */
function compute3DPlaneRectangleCorners(planeRealization: Plane3DRealization3D, planeSize: number = 375): Vector4[] {
  return planeRealization.getRectangleCorners(planeSize);
}

/**
 * Render projection plane grids in 3D space
 * 
 * Projection planes are 2D coordinate systems, NOT 3D surfaces.
 * We only render their grids to show their orientation in space.
 */
function renderProjectionPlanes() {
  // console.log('[ThreeView] renderProjectionPlanes called, showPlanes=', displayOptions.value.showPlanes);
  
  if (!displayOptions.value.showPlanes || !displayOptions.value.showGrid) return;

  // Clear existing projection plane grids and auxiliary axes
  scene.children
    .filter(child => 
      child.userData.type === 'projection-plane-grid' || 
      child.userData.type === 'auxiliary-plane-axis' ||
      child.userData.type === 'auxiliary-plane-axis-label'
    )
    .forEach(child => scene.remove(child));

  // Get all projection planes and render their grids
  const projectionPlanes = Array.from(world.projectionPlanes.values());
  
  // console.log('[ThreeView] Number of projection planes:', projectionPlanes.length);

  for (const projPlane of projectionPlanes) {
    // console.log('[ThreeView] Processing projection plane:', projPlane.id);
    
    const planeRealization = world.getProjectionPlane3DRealization(projPlane.id!);
    // console.log('[ThreeView] Plane realization for', projPlane.id, ':', planeRealization);
    
    if (!planeRealization) {
      console.warn('[ThreeView] No 3D realization for projection plane', projPlane.id);
      continue;
    }

    // Extract transformation from projection plane realization
    const matrixDomain = planeRealization.planeTo3D;
    const e = matrixDomain.elements;
    
    // Matrix4x3 storage is ROW-MAJOR: [m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43]
    // Maps (u,v,w) → (x,y,z,w_out) where:
    //   x = m11*u + m12*v + m13*w
    //   y = m21*u + m22*v + m23*w
    //   z = m31*u + m32*v + m33*w
    //   w = m41*u + m42*v + m43*w
    
    // Extract origin point in DOMAIN coordinates (u=0, v=0, w=1)
    const originW = e[11]; // m43 - homogeneous w
    const Ox = e[2] / originW;   // m13 / w
    const Oy = e[5] / originW;   // m23 / w
    const Oz = e[8] / originW;   // m33 / w
    
    // console.log('[ThreeView] Plane', projPlane.id, 'origin in domain:', Ox, Oy, Oz);
    
    // Extract U-axis and V-axis directions in DOMAIN coordinates (w=0)
    // U direction (u=1, v=0, w=0): (m11, m21, m31, m41)
    // V direction (u=0, v=1, w=0): (m12, m22, m32, m42)
    const Ux = e[0], Uy = e[3], Uz = e[6];  // m11, m21, m31
    const Vx = e[1], Vy = e[4], Vz = e[7];  // m12, m22, m32
    
    // console.log('[ThreeView] Plane', projPlane.id, 'U-axis:', Ux, Uy, Uz);
    // console.log('[ThreeView] Plane', projPlane.id, 'V-axis:', Vx, Vy, Vz);
    
    // Get the 3D plane rectangle bounds and convert to (u,v) coordinates
    let gridSegments: Segment2D[];
    
    if (projPlane instanceof AuxiliaryProjectionPlane && projPlane.plane3DId) {
      // console.log('[ThreeView] Auxiliary plane detected, plane3DId:', projPlane.plane3DId);
      const plane3D = world.get3DPlane(projPlane.plane3DId);
      // console.log('[ThreeView] Found 3D plane:', plane3D?.id);
      const planeRealization = plane3D ? world.get3DPlaneRealization(plane3D.id!) : null;
      // console.log('[ThreeView] Plane realization feasible:', planeRealization?.feasible);
      
      if (planeRealization && planeRealization.feasible) {
        // console.log('[ThreeView] Generating clipped grid for auxiliary plane');
        
        // Get the ACTUAL 3D plane rectangle corners (same as what's rendered)
        const planeSize = 375;  // Half-size (750/2)
        const corners = compute3DPlaneRectangleCorners(planeRealization, planeSize) as [Vector4, Vector4, Vector4, Vector4];
        
        // Convert to projection plane (u,v) coordinates using the projection plane's inverse matrix
        const projPlaneRealization = world.getProjectionPlane3DRealization(projPlane.id!);
        // console.log('[ThreeView] Got projection plane realization for grid conversion:', !!projPlaneRealization);
        if (!projPlaneRealization) {
          // console.log('[ThreeView] No projection plane realization, using fallback grid');
          gridSegments = generateFallbackGrid(375, 20);
        } else {
          // console.log('[ThreeView] Converting corners to (u,v) and generating clipped grid');
          const rect2D = convertPlaneRectangleTo2D(corners, projPlaneRealization.threeDToPlane);
          // console.log('[ThreeView] Rectangle in (u,v):', rect2D);
          // console.log('[ThreeView] Corner 0:', rect2D.corners[0]);
          // console.log('[ThreeView] Corner 1:', rect2D.corners[1]);
          // console.log('[ThreeView] Corner 2:', rect2D.corners[2]);
          // console.log('[ThreeView] Corner 3:', rect2D.corners[3]);
          
          // Generate clipped grid
          gridSegments = generateClippedGrid(rect2D, 20);
          // console.log('[ThreeView] Generated', gridSegments.length, 'grid segments');
        }
      } else {
        // console.log('[ThreeView] No plane realization or not feasible, using fallback grid');
        // Fallback: simple grid centered at origin
        gridSegments = generateFallbackGrid(75, 20);
      }
    } else {
      // console.log('[ThreeView] Base projection plane, using fallback grid');
      // Base planes: simple grid centered at origin
      gridSegments = generateFallbackGrid(375, 20);
    }
    
    // console.log('[ThreeView] Converting', gridSegments.length, 'grid segments to Three.js coordinates');
    // Convert grid segments from (u,v) to Three.js coordinates
    const vertices = [];
    for (const segment of gridSegments) {
      // Start point: (u, v, 1) → 3D domain → Three.js
      const start2D = new THREE.Vector3(segment.start.u, segment.start.v, 1);
      const start3D_domain = applyMatrix4x3(start2D, matrixDomain);
      const start3D_three = domainToThreeJS(start3D_domain);
      
      // End point: (u, v, 1) → 3D domain → Three.js
      const end2D = new THREE.Vector3(segment.end.u, segment.end.v, 1);
      const end3D_domain = applyMatrix4x3(end2D, matrixDomain);
      const end3D_three = domainToThreeJS(end3D_domain);
      
      vertices.push(start3D_three.x, start3D_three.y, start3D_three.z);
      vertices.push(end3D_three.x, end3D_three.y, end3D_three.z);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x888888, opacity: 0.7, transparent: true });
    const gridMesh = new THREE.LineSegments(geometry, material);
    gridMesh.userData.type = 'projection-plane-grid';
    gridMesh.userData.planeId = projPlane.id;
    scene.add(gridMesh);
    // console.log('[ThreeView] Added projection plane grid for', projPlane.id);
    
    // Render auxiliary plane coordinate axes (U, V) if applicable
    // console.log('[ThreeView] Checking auxiliary axes:', projPlane instanceof AuxiliaryProjectionPlane, displayOptions.value.showReferenceAxes);
    if (projPlane instanceof AuxiliaryProjectionPlane && displayOptions.value.showReferenceAxes) {
      // console.log('[ThreeView] Calling renderAuxiliaryPlaneAxes');
      // We don't need Nx, Ny, Nz anymore - they're unused in the function
      renderAuxiliaryPlaneAxes(projPlane, Ox, Oy, Oz, Ux, Uy, Uz, Vx, Vy, Vz, 0, 0, 0);
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

  // Early return if planes are hidden - this controls visibility of 3D plane surfaces
  if (!displayOptions.value.showPlanes) {
    return;
  }

  try {
    // Render 3D Points
    const points3D = world.getAll3DPoints();
    // console.log('[ThreeView] render3DElements called - found', points3D.length, '3D points');
    
    for (const point of points3D) {
      // Skip invisible 3D points
      if (point.visualStyle?.visible === false) {
        // console.log('[ThreeView] Skipping invisible 3D point:', point.id);
        continue;
      }
      
      // console.log('[ThreeView] Processing 3D point:', point.id, point.kind);
      
      const realization = world.get3DPointRealization(point.id!);
      // console.log('[ThreeView] Got realization:', {
      //   exists: !!realization,
      //   feasible: realization?.isFeasible
      // });
      
      if (!realization || !realization.isFeasible) {
        console.warn('[ThreeView] Skipping point - not feasible');
        continue;
      }
      
      const [x, y, z] = realization.getCartesian();
      // console.log('[ThreeView] Point 3D coordinates (domain):', { x, y, z });
      
      // Convert from domain (left-handed) to Three.js (right-handed) coordinates
      const domainPos = new Vector4(x, y, z, 1);
      const threePos = domainToThreeJS(domainPos);
      // console.log('[ThreeView] Point 3D coordinates (three):', threePos);
      
      // Create sphere for 3D point (thicker than 2D points)
      const geometry = new THREE.SphereGeometry(0.15, 16, 16); // Radius 0.15 (vs 0.1 for 2D)
      const material = new THREE.MeshStandardMaterial({
        color: point.visualStyle?.color || '#FF6B35', // Orange for 3D elements
        emissive: 0x000000,
        metalness: 0.3,
        roughness: 0.7
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(threePos);
      sphere.userData.type = '3d-element';
      sphere.userData.elementType = 'point';
      sphere.userData.elementId = point.id;
      scene.add(sphere);
    }

    // Render 3D Lines
    const lines3D = world.getAll3DLines();
    // console.log('[ThreeView] Rendering', lines3D.length, '3D lines');
    
    for (const line of lines3D) {
      // Skip invisible 3D lines
      if (line.visualStyle?.visible === false) continue;
      
      const realization = world.get3DLineRealization(line.id!);
      if (!realization || !realization.isFeasible) continue;
      
      // Get point and direction on the line for rendering (extend far in both directions)
      const pointOnLineDomain = realization.point;
      const directionDomain = realization.getDirection();
      
      // Convert from domain to Three.js coordinates
      const pointOnLine = domainToThreeJS(pointOnLineDomain);
      const direction = domainDirectionToThreeJS(new THREE.Vector3(directionDomain.x, directionDomain.y, directionDomain.z));
      
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
    // console.log('[ThreeView] Rendering', segments3D.length, '3D segments');
    
    for (const segment of segments3D) {
      // Skip invisible 3D segments
      if (segment.visualStyle?.visible === false) continue;
      
      const realization = world.get3DSegmentRealization(segment.id!);
      if (!realization || !realization.isFeasible) continue;
      
      // Get endpoints from Vector4 and convert to Three.js coordinates
      const start = domainToThreeJS(realization.startPoint);
      const end = domainToThreeJS(realization.endPoint);
      
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

    // Render 3D Planes (geometric surfaces)
    const planes3D = world.getAllPlanes();
    // console.log('[ThreeView] Rendering', planes3D.length, '3D planes');
    
    for (const plane of planes3D) {
      const planeRealization = world.get3DPlaneRealization(plane.id!);
      if (!planeRealization || !planeRealization.feasible) {
        console.warn('[ThreeView] Skipping plane - not feasible:', plane.id);
        continue;
      }

      // Create plane mesh (semi-transparent surface)
      const planeSize = 750;
      const geometry = new THREE.PlaneGeometry(planeSize, planeSize);
      
      const material = new THREE.MeshBasicMaterial({
        color: 0xBDBDBD,  // Light gray for 3D planes (provides neutral background for blue 2D elements)
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const planeMesh = new THREE.Mesh(geometry, material);

      // Use precomputed quaternion and originPoint from realization
      if (!planeRealization.quaternion || !planeRealization.originPoint) {
        console.error('[ThreeView] Plane realization missing quaternion or originPoint');
        continue;
      }
      
      const origin = planeRealization.originPoint;
      const normal = planeRealization.normal;
      
      // Apply domain→Three.js transformation to position
      const originDomain = new Vector4(origin.x, origin.y, origin.z, origin.w);
      const originThree = domainToThreeJS(originDomain);
      
      // Compute quaternion in Three.js space (not domain space)
      // Transform the normal to Three.js coordinates
      const normalDomain = new THREE.Vector3(normal.x, normal.y, normal.z);
      const normalThree = domainDirectionToThreeJS(normalDomain).normalize();
      
      // Compute quaternion to align default (0,0,1) with Three.js-space normal
      const defaultNormal = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(defaultNormal, normalThree);
      
      planeMesh.quaternion.copy(quaternion);
      planeMesh.position.copy(originThree);
      planeMesh.userData.type = '3d-element';
      planeMesh.userData.elementType = 'plane';
      planeMesh.userData.elementId = plane.id;
      scene.add(planeMesh);
    }

  } catch (error) {
    console.warn('[ThreeView] Error rendering 3D elements:', error);
  }
}

/**
 * Render all hinge lines in 3D space (Phase 84)
 * 
 * Uses HingeLine.realize3D() to compute 3D geometry from canonical coordinates.
 * This eliminates inline geometry computation and provides a consistent, centralized approach.
 */
function renderHingeLines() {
  if (!displayOptions.value.showPlanes) return;

  console.log('[ThreeView.renderHingeLines] Called');

  // Remove existing hinge lines
  const existingLines = scene.children.filter(child => child.userData.type === 'hinge-line');
  existingLines.forEach(line => scene.remove(line));

  try {
    // Iterate through ALL hinge lines
    const hingeLines = world.getAllHingeLines();
    console.log('[ThreeView.renderHingeLines] Found', hingeLines.length, 'hinge lines:', hingeLines.map(hl => ({
      id: hl.id,
      plane1: hl.plane1Id,
      plane2: hl.plane2Id
    })));
    
    for (const hingeLine of hingeLines) {
      // Phase 84: Use realize3D() to get 3D geometry
      const line3D = hingeLine.realize3D(world);
      
      // Skip infeasible hinge lines (e.g., when parent plane is infeasible)
      if (!line3D.isFeasible()) {
        continue;
      }
      
      if (!line3D || !line3D.point || !line3D.direction) {
        console.warn('[ThreeView] Cannot render hinge line: realize3D failed', hingeLine.id);
        continue;
      }
      
      // Convert from domain coordinates (Vector4) to Three.js coordinates
      const pointDomain = line3D.point;
      const directionDomain = line3D.direction;
      
      // Convert to Three.js coordinates using domainToThreeJS
      const origin = domainToThreeJS(pointDomain);
      const direction = domainDirectionToThreeJS(
        new THREE.Vector3(directionDomain.x, directionDomain.y, directionDomain.z)
      ).normalize();
      
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
 * Render reference coordinate axes at origin (Phase 82)
 * 
 * Displays DOMAIN coordinate system axes (Monge projection) with labels:
 * - X: Red, points right (same in both systems)
 * - Y: Green, points away from viewer (depth, inverted to -Y in Three.js)
 * - Z: Blue, points up (vertical in domain, rendered as Y in Three.js)
 * 
 * Domain coordinate system (Monge):
 * - +X = right
 * - +Y = away from viewer (into screen)
 * - +Z = up (vertical)
 * 
 * Helps understand domain model coordinates and their conversion to Three.js rendering.
 */
function renderReferenceAxes() {
  // Remove existing reference axes and labels
  scene.children
    .filter(child => child.userData.type === 'reference-axis' || child.userData.type === 'reference-axis-label')
    .forEach(child => scene.remove(child));
  
  if (!displayOptions.value.showReferenceAxes) {
    return;  // Axes hidden
  }
  
  const origin = new THREE.Vector3(0, 0, 0);
  const axisLength = 15;  // Units in Three.js world space
  
  // Domain X-axis: convert (1,0,0) domain direction to Three.js
  const xDirDomain = new THREE.Vector3(1, 0, 0);
  const xDir = domainDirectionToThreeJS(xDirDomain);
  const xArrow = new THREE.ArrowHelper(xDir, origin, axisLength, 0xFF0000, 1, 0.5);
  xArrow.userData.type = 'reference-axis';
  xArrow.userData.axis = 'x';
  scene.add(xArrow);
  createAxisLabel('X', xDir, axisLength);
  
  // Domain Y-axis: convert (0,1,0) domain direction to Three.js
  // In Monge projection, Y points away from viewer (depth)
  const yDirDomain = new THREE.Vector3(0, 1, 0);
  const yDir = domainDirectionToThreeJS(yDirDomain);
  const yArrow = new THREE.ArrowHelper(yDir, origin, axisLength, 0x00FF00, 1, 0.5);
  yArrow.userData.type = 'reference-axis';
  yArrow.userData.axis = 'y';
  scene.add(yArrow);
  createAxisLabel('Y', yDir, axisLength);
  
  // Domain Z-axis: convert (0,0,1) domain direction to Three.js
  // In Monge projection, Z is the vertical axis (up)
  const zDirDomain = new THREE.Vector3(0, 0, 1);
  const zDir = domainDirectionToThreeJS(zDirDomain);
  const zArrow = new THREE.ArrowHelper(zDir, origin, axisLength, 0x0000FF, 1, 0.5);
  zArrow.userData.type = 'reference-axis';
  zArrow.userData.axis = 'z';
  scene.add(zArrow);
  createAxisLabel('Z', zDir, axisLength);
}

/**
 * Render coordinate axes (U, V) for an auxiliary projection plane (Phase 82.1)
 * 
 * Displays the coordinate system of the auxiliary plane:
 * - U: Velvet, along T1 trace direction
 * - V: Velvet, perpendicular to U in plane
 * 
 * Axes are positioned at the plane's origin (T1∩T2 intersection point in 3D).
 * 
 * @param projPlane - The auxiliary projection plane
 * @param Ox, Oy, Oz - Origin coordinates in DOMAIN space
 * @param Ux, Uy, Uz - U-axis direction in DOMAIN space
 * @param Vx, Vy, Vz - V-axis direction in DOMAIN space
 * @param Nx, Ny, Nz - Normal direction in DOMAIN space (unused)
 */
function renderAuxiliaryPlaneAxes(
  projPlane: ProjectionPlane,
  Ox: number, Oy: number, Oz: number,
  Ux: number, Uy: number, Uz: number,
  Vx: number, Vy: number, Vz: number,
  _Nx: number, _Ny: number, _Nz: number  // Unused but kept for signature compatibility
) {
  // console.log('[ThreeView] renderAuxiliaryPlaneAxes called for plane', projPlane.id);
  // console.log('[ThreeView] Origin (domain):', Ox, Oy, Oz);
  // console.log('[ThreeView] U-axis (domain):', Ux, Uy, Uz);
  // console.log('[ThreeView] V-axis (domain):', Vx, Vy, Vz);
  
  // Convert origin from domain to Three.js coordinates
  const originDomain = new Vector4(Ox, Oy, Oz, 1);  // Homogeneous point
  const origin = domainToThreeJS(originDomain);
  // console.log('[ThreeView] Origin (Three.js):', origin.x, origin.y, origin.z);
  
  const axisLength = 10;  // Slightly shorter than world axes for distinction
  const velvetColor = 0x8B008B;  // Dark magenta/velvet purple
  
  // U-axis: convert domain direction to Three.js
  const uDirDomain = new THREE.Vector3(Ux, Uy, Uz).normalize();
  const uDir = domainDirectionToThreeJS(uDirDomain);
  // console.log('[ThreeView] U direction (Three.js):', uDir.x, uDir.y, uDir.z);
  const uArrow = new THREE.ArrowHelper(uDir, origin, axisLength, velvetColor, 0.8, 0.4);
  uArrow.userData.type = 'auxiliary-plane-axis';
  uArrow.userData.axis = 'u';
  uArrow.userData.planeId = projPlane.id;
  scene.add(uArrow);
  // console.log('[ThreeView] Added U-axis arrow to scene');
  createAuxiliaryAxisLabel('U', origin, uDir, axisLength);
  
  // V-axis: convert domain direction to Three.js
  const vDirDomain = new THREE.Vector3(Vx, Vy, Vz).normalize();
  const vDir = domainDirectionToThreeJS(vDirDomain);
  // console.log('[ThreeView] V direction (Three.js):', vDir.x, vDir.y, vDir.z);
  const vArrow = new THREE.ArrowHelper(vDir, origin, axisLength, velvetColor, 0.8, 0.4);
  vArrow.userData.type = 'auxiliary-plane-axis';
  vArrow.userData.axis = 'v';
  vArrow.userData.planeId = projPlane.id;
  scene.add(vArrow);
  // console.log('[ThreeView] Added V-axis arrow to scene');
  createAuxiliaryAxisLabel('V', origin, vDir, axisLength);
}

/**
 * Create a CSS2D label for an axis arrow (Phase 82)
 * 
 * @param text - Label text (e.g., "X", "Y", "Z")
 * @param direction - Unit direction vector of the axis
 * @param length - Length of the arrow in world units
 */
function createAxisLabel(text: string, direction: THREE.Vector3, length: number) {
  const labelDiv = document.createElement('div');
  labelDiv.className = 'axis-label';
  labelDiv.textContent = text;
  labelDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  labelDiv.style.padding = '4px 6px';
  labelDiv.style.border = '1px solid #333';
  labelDiv.style.borderRadius = '3px';
  labelDiv.style.fontSize = '14px';
  labelDiv.style.fontWeight = 'bold';
  labelDiv.style.fontFamily = 'sans-serif';
  labelDiv.style.color = '#333';
  labelDiv.style.userSelect = 'none';
  labelDiv.style.zIndex = '1000';
  
  const label = new CSS2DObject(labelDiv);
  label.userData.type = 'reference-axis-label';
  
  // Position at arrow tip + 1 unit offset to clear arrow head
  const labelPosition = direction.clone().multiplyScalar(length + 1);
  label.position.copy(labelPosition);
  
  // Add label directly to scene (not to arrow) for proper positioning
  scene.add(label);
}

/**
 * Create a CSS2D label for an auxiliary plane axis arrow (Phase 82.1)
 * 
 * @param text - Label text (e.g., "U", "V", "N")
 * @param origin - Origin position of the axis in Three.js space
 * @param direction - Unit direction vector of the axis in Three.js space
 * @param length - Length of the arrow in world units
 */
function createAuxiliaryAxisLabel(text: string, origin: THREE.Vector3, direction: THREE.Vector3, length: number) {
  const labelDiv = document.createElement('div');
  labelDiv.className = 'axis-label';
  labelDiv.textContent = text;
  labelDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  labelDiv.style.padding = '3px 5px';
  labelDiv.style.border = '1px solid #666';
  labelDiv.style.borderRadius = '3px';
  labelDiv.style.fontSize = '12px';
  labelDiv.style.fontWeight = 'bold';
  labelDiv.style.fontFamily = 'sans-serif';
  labelDiv.style.color = '#666';
  labelDiv.style.userSelect = 'none';
  labelDiv.style.zIndex = '999';
  
  const label = new CSS2DObject(labelDiv);
  label.userData.type = 'auxiliary-plane-axis-label';
  
  // Position at arrow tip + 0.8 unit offset from origin
  const labelPosition = origin.clone().add(direction.clone().multiplyScalar(length + 0.8));
  label.position.copy(labelPosition);
  
  scene.add(label);
}

/**
 * Handle display option changes
 */
function handleDisplayChange() {
  renderProjectionPlanes();
  renderHingeLines();
  render2DElements();
  render3DElements(); // Phase 78
  renderReferenceAxes(); // Phase 82
}

/**
 * Animation loop
 */
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  
  controls.update(); // Required for damping
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);  // Phase 82: Render CSS2D labels
}

/**
 * Handle window resize
 */
function handleResize() {
  if (!containerRef.value || !camera || !renderer || !labelRenderer) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);  // Phase 82: Resize label renderer
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
