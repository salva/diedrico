<template>
  <div class="workspace-3d" ref="containerRef" v-if="isVisible">
    <!-- Header bar with controls -->
    <div class="overlay-header">
      <span class="overlay-title">3D View (Read-Only)</span>
      <div class="overlay-actions">
        <button class="icon-button" @click="isVisible = false" title="Close 3D view">
          ✕
        </button>
      </div>
    </div>

    <canvas ref="canvasRef"></canvas>
    
    <!-- Controls overlay -->
    <div class="controls-overlay">
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="showProjectionPlanes" />
          Show Projection Planes
        </label>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="show2DElements" />
          Show 2D Elements
        </label>
      </div>
      <div class="control-group">
        <label>
          <input type="checkbox" v-model="showLinkingVisuals" />
          Show Linking Lines
        </label>
      </div>
    </div>

    <!-- Help text -->
    <div class="help-overlay">
      <p class="help-text">Drag to rotate • Shift+drag to pan • Scroll to zoom</p>
    </div>
  </div>

  <!-- Show button when overlay is hidden -->
  <button 
    v-else 
    class="show-3d-button" 
    @click="isVisible = true"
    title="Show 3D view overlay"
  >
    Show 3D View
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useWorldStore } from '@/stores/worldStore';
import { useViewStore } from '@/stores/viewStore';
import type { Point3D, Line3D, Segment3D, Element2D } from '@/types/ElementTypes';
import {
  get2DCoordinates,
  get3DCoordinates,
  getSegment3DEndpoints,
  transform2DTo3D,
  toThreeJSCoordinates,
  type ProjectionPlaneCoordinateSystem
} from '@/domain/calculations/geometry3d';

const worldStore = useWorldStore();
const viewStore = useViewStore();

// Component refs
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Control states
const showProjectionPlanes = ref(true);
const show2DElements = ref(true);
const showLinkingVisuals = ref(false);
const isVisible = ref(true);

// Three.js objects
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let animationFrameId: number | null = null;

// Scene groups for organization
let projectionPlanesGroup: THREE.Group | null = null;
let elements3DGroup: THREE.Group | null = null;
let elements2DGroup: THREE.Group | null = null;
let linkingVisualsGroup: THREE.Group | null = null;

/**
 * Initialize Three.js scene, camera, renderer, and controls
 */
const initThreeJS = () => {
  if (!containerRef.value || !canvasRef.value) return;

  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);

  // Create camera
  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;
  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
  camera.position.set(300, 300, 300);
  camera.lookAt(0, 0, 0);

  // Create renderer
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Create OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 50;
  controls.maxDistance = 1000;
  controls.maxPolarAngle = Math.PI;

  // Create scene groups
  projectionPlanesGroup = new THREE.Group();
  elements3DGroup = new THREE.Group();
  elements2DGroup = new THREE.Group();
  linkingVisualsGroup = new THREE.Group();

  scene.add(projectionPlanesGroup);
  scene.add(elements3DGroup);
  scene.add(elements2DGroup);
  scene.add(linkingVisualsGroup);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 100, 50);
  scene.add(directionalLight);

  // Add axes helper
  const axesHelper = new THREE.AxesHelper(100);
  scene.add(axesHelper);

  // Add grid helper
  const gridHelper = new THREE.GridHelper(400, 20);
  scene.add(gridHelper);

  // Handle window resize
  window.addEventListener('resize', handleResize);

  // Initial render
  renderProjectionPlanes();
  render3DElements();
  render2DElements();
  animate();
};

/**
 * Animation loop
 */
const animate = () => {
  if (!renderer || !scene || !camera || !controls) return;

  animationFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

/**
 * Handle window resize
 */
const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

/**
 * Render projection planes as translucent surfaces
 */
const renderProjectionPlanes = () => {
  if (!projectionPlanesGroup) return;

  // Clear existing planes
  projectionPlanesGroup.clear();

  if (!showProjectionPlanes.value) return;

  // Create horizontal plane (P_H) - XZ plane at y=0
  const horizontalPlaneGeometry = new THREE.PlaneGeometry(400, 400);
  const horizontalPlaneMaterial = new THREE.MeshBasicMaterial({
    color: 0x2196f3,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  const horizontalPlane = new THREE.Mesh(horizontalPlaneGeometry, horizontalPlaneMaterial);
  horizontalPlane.rotation.x = -Math.PI / 2;
  horizontalPlane.position.y = 0;
  projectionPlanesGroup.add(horizontalPlane);

  // Add horizontal plane label
  const hLabel = createTextSprite('P_H (Horizontal)', 0x2196f3);
  hLabel.position.set(150, 5, 150);
  projectionPlanesGroup.add(hLabel);

  // Create vertical plane (P_V) - XY plane at z=0
  const verticalPlaneGeometry = new THREE.PlaneGeometry(400, 400);
  const verticalPlaneMaterial = new THREE.MeshBasicMaterial({
    color: 0x4caf50,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  const verticalPlane = new THREE.Mesh(verticalPlaneGeometry, verticalPlaneMaterial);
  verticalPlane.position.z = 0;
  projectionPlanesGroup.add(verticalPlane);

  // Add vertical plane label
  const vLabel = createTextSprite('P_V (Vertical)', 0x4caf50);
  vLabel.position.set(150, 150, 5);
  projectionPlanesGroup.add(vLabel);
};

/**
 * Create a text sprite for labels
 */
const createTextSprite = (text: string, color: number): THREE.Sprite => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Sprite();

  canvas.width = 256;
  canvas.height = 64;

  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.font = 'Bold 24px Arial';
  context.fillText(text, 10, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(50, 12.5, 1);

  return sprite;
};

/**
 * Render 2D elements on their respective projection planes
 * 
 * For each 2D element:
 * 1. Look up its projection plane to get the coordinate system
 * 2. Transform 2D coordinates to 3D using the plane's u, v basis vectors
 * 3. Convert to Three.js coordinates (Y-axis inversion)
 * 4. Create Three.js geometry for rendering
 */
const render2DElements = () => {
  if (!elements2DGroup) return;

  // Clear existing 2D elements
  elements2DGroup.clear();

  if (!show2DElements.value) return;

  // Render all 2D elements
  worldStore.allElements2D.forEach(element => {
    if (element.infeasible) return;

    // Get projection plane for this element
    const projection_plane = viewStore.getPlaneById(element.planeId);
    if (!projection_plane) return;

    // Render based on element type
    if (element.kind === 'Point2DFree' || element.kind === 'Point2DDerived') {
      render2DPoint(element, projection_plane.coordinate_system);
    } else if (element.kind === 'Line2DByTwoPoints') {
      render2DLine(element, projection_plane.coordinate_system);
    } else if (element.kind === 'Segment2DByPoints') {
      render2DSegment(element, projection_plane.coordinate_system);
    } else if (element.kind === 'Circle2DByCenterAndRadius') {
      render2DCircle(element, projection_plane.coordinate_system);
    }
  });
};

/**
 * Render a 2D point on its projection plane
 */
const render2DPoint = (point: Element2D, coordinateSystem: ProjectionPlaneCoordinateSystem) => {
  if (!elements2DGroup) return;
  if (point.kind !== 'Point2DFree' && point.kind !== 'Point2DDerived') return;

  const geometry = new THREE.SphereGeometry(2, 12, 12);
  const material = new THREE.MeshPhongMaterial({
    color: point.visualStyle.color,
    opacity: 0.7,
    transparent: true
  });

  const sphere = new THREE.Mesh(geometry, material);

  // Transform 2D coordinates to 3D using projection plane coordinate system
  const coords2D = get2DCoordinates(point);
  if (!coords2D) return;
  
  const coords3D = transform2DTo3D(coords2D, coordinateSystem);
  const threeCoords = toThreeJSCoordinates(coords3D);
  sphere.position.set(threeCoords.x, threeCoords.y, threeCoords.z);

  elements2DGroup.add(sphere);
};

/**
 * Render a 2D line on its projection plane
 */
const render2DLine = (line: Element2D, coordinateSystem: ProjectionPlaneCoordinateSystem) => {
  if (!elements2DGroup) return;
  if (line.kind !== 'Line2DByTwoPoints') return;

  // For lines, render as a long segment (approximate infinite line)
  const extend = 400;

  // Get two points on the line to determine direction
  const p1 = worldStore.elements2D.get(line.point1Id);
  const p2 = worldStore.elements2D.get(line.point2Id);

  if (!p1 || !p2) return;

  const coords1 = get2DCoordinates(p1);
  const coords2 = get2DCoordinates(p2);

  if (!coords1 || !coords2) return;

  // Calculate direction vector
  const dx = coords2.x - coords1.x;
  const dy = coords2.y - coords1.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return;
  
  const dirX = dx / length;
  const dirY = dy / length;

  // Extend line in both directions
  const startX = coords1.x - dirX * extend;
  const startY = coords1.y - dirY * extend;
  const endX = coords1.x + dirX * extend;
  const endY = coords1.y + dirY * extend;

  const start3D = transform2DTo3D({ x: startX, y: startY }, coordinateSystem);
  const end3D = transform2DTo3D({ x: endX, y: endY }, coordinateSystem);
  
  const startThree = toThreeJSCoordinates(start3D);
  const endThree = toThreeJSCoordinates(end3D);

  const points = [
    new THREE.Vector3(startThree.x, startThree.y, startThree.z),
    new THREE.Vector3(endThree.x, endThree.y, endThree.z)
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: line.visualStyle.color,
    opacity: 0.7,
    transparent: true
  });

  const lineMesh = new THREE.Line(geometry, material);
  elements2DGroup.add(lineMesh);
};

/**
 * Render a 2D segment on its projection plane
 */
const render2DSegment = (segment: Element2D, coordinateSystem: ProjectionPlaneCoordinateSystem) => {
  if (!elements2DGroup || segment.kind !== 'Segment2DByPoints') return;

  // Get endpoints
  const p1 = worldStore.elements2D.get(segment.point1Id);
  const p2 = worldStore.elements2D.get(segment.point2Id);

  if (!p1 || !p2) return;

  const coords1 = get2DCoordinates(p1);
  const coords2 = get2DCoordinates(p2);

  if (!coords1 || !coords2) return;

  const start3D = transform2DTo3D(coords1, coordinateSystem);
  const end3D = transform2DTo3D(coords2, coordinateSystem);
  
  const startThree = toThreeJSCoordinates(start3D);
  const endThree = toThreeJSCoordinates(end3D);

  const points = [
    new THREE.Vector3(startThree.x, startThree.y, startThree.z),
    new THREE.Vector3(endThree.x, endThree.y, endThree.z)
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: segment.visualStyle.color,
    opacity: 0.7,
    transparent: true,
    linewidth: 2
  });

  const line = new THREE.Line(geometry, material);
  elements2DGroup.add(line);
};

/**
 * Render a 2D circle on its projection plane
 */
const render2DCircle = (circle: Element2D, coordinateSystem: ProjectionPlaneCoordinateSystem) => {
  if (!elements2DGroup || circle.kind !== 'Circle2DByCenterAndRadius') return;

  // Get center point
  const centerElement = worldStore.elements2D.get(circle.centerPointId);
  if (!centerElement) return;

  const center2D = get2DCoordinates(centerElement);
  if (!center2D) return;

  const center3D = transform2DTo3D(center2D, coordinateSystem);

  // Create circle geometry in local 2D plane
  const curve = new THREE.EllipseCurve(
    0, 0,           // center x, y (will be positioned later)
    circle.radius, circle.radius,
    0, 2 * Math.PI,
    false,
    0
  );

  const points = curve.getPoints(50);
  
  // Transform each point from local 2D to 3D
  const points3D = points.map(p => {
    const point3D = transform2DTo3D(
      { x: center2D.x + p.x, y: center2D.y + p.y }, 
      coordinateSystem
    );
    const pointThree = toThreeJSCoordinates(point3D);
    return new THREE.Vector3(pointThree.x, pointThree.y, pointThree.z);
  });
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points3D);

  const material = new THREE.LineBasicMaterial({
    color: circle.visualStyle.color,
    opacity: 0.7,
    transparent: true
  });

  const circleMesh = new THREE.Line(geometry, material);
  elements2DGroup.add(circleMesh);
};

/**
 * Render all 3D elements (points, lines, segments)
 */
const render3DElements = () => {
  if (!elements3DGroup) return;

  // Clear existing 3D elements
  elements3DGroup.clear();

  // Render 3D points
  worldStore.allElements3D
    .filter((el): el is Point3D => el.kind.startsWith('Point3D'))
    .forEach(point => renderPoint3D(point));

  // Render 3D lines
  worldStore.allElements3D
    .filter((el): el is Line3D => el.kind.startsWith('Line3D'))
    .forEach(line => renderLine3D(line));

  // Render 3D segments
  worldStore.allElements3D
    .filter((el): el is Segment3D => el.kind === 'Segment3DByPoints')
    .forEach(segment => renderSegment3D(segment));
};

/**
 * Render a single 3D point as a sphere
 */
const renderPoint3D = (point: Point3D) => {
  if (!elements3DGroup || point.infeasible) return;

  // Get projection plane coordinate systems
  const planeH = viewStore.getPlaneById('P_H');
  const planeV = viewStore.getPlaneById('P_V');
  if (!planeH || !planeV) return;

  // Get 3D coordinates using geometry3d module with coordinate systems
  const coords = get3DCoordinates(
    point, 
    worldStore.elements2D,
    planeH.coordinate_system,
    planeV.coordinate_system
  );
  if (!coords) return;
  
  const threeCoords = toThreeJSCoordinates(coords);

  // Create sphere geometry
  const geometry = new THREE.SphereGeometry(3, 16, 16);
  const material = new THREE.MeshPhongMaterial({
    color: point.visualStyle.color,
    opacity: point.visualStyle.opacity,
    transparent: point.visualStyle.opacity < 1
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(threeCoords.x, threeCoords.y, threeCoords.z);
  elements3DGroup.add(sphere);

  // Add point label
  const label = createTextSprite(point.name, parseInt(point.visualStyle.color.substring(1), 16));
  label.position.set(threeCoords.x, threeCoords.y + 10, threeCoords.z);
  elements3DGroup.add(label);
};

/**
 * Render a single 3D line
 */
const renderLine3D = (line: Line3D) => {
  if (!elements3DGroup || line.infeasible) return;

  // For MVP, render line as a long segment
  // TODO: Implement proper infinite line rendering
  const points = [
    new THREE.Vector3(-200, 0, 0),
    new THREE.Vector3(200, 0, 0)
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: line.visualStyle.color,
    opacity: line.visualStyle.opacity,
    transparent: line.visualStyle.opacity < 1
  });

  const lineMesh = new THREE.Line(geometry, material);
  elements3DGroup.add(lineMesh);
};

/**
 * Render a single 3D segment
 */
const renderSegment3D = (segment: Segment3D) => {
  if (!elements3DGroup || segment.infeasible) return;

  // Get endpoints using geometry3d module
  const endpoints = getSegment3DEndpoints(
    segment,
    worldStore.elements3D,
    worldStore.elements2D
  );

  if (!endpoints) return;
  
  const startThree = toThreeJSCoordinates(endpoints.start);
  const endThree = toThreeJSCoordinates(endpoints.end);

  const points = [
    new THREE.Vector3(startThree.x, startThree.y, startThree.z),
    new THREE.Vector3(endThree.x, endThree.y, endThree.z)
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: segment.visualStyle.color,
    linewidth: segment.visualStyle.lineWidth,
    opacity: segment.visualStyle.opacity,
    transparent: segment.visualStyle.opacity < 1
  });

  const line = new THREE.Line(geometry, material);
  elements3DGroup.add(line);
};

/**
 * Watch for changes in control states
 */
watch(showProjectionPlanes, () => {
  renderProjectionPlanes();
});

watch(show2DElements, () => {
  render2DElements();
});

watch(showLinkingVisuals, () => {
  // TODO: Implement linking visuals (dashed lines from 2D to 3D)
});

/**
 * Watch for changes in world store to re-render
 */
watch(
  () => worldStore.allElements3D.length,
  () => {
    render3DElements();
  }
);

watch(
  () => worldStore.allElements2D.length,
  () => {
    render2DElements();
  }
);

/**
 * Component lifecycle
 */
onMounted(() => {
  initThreeJS();
});

onUnmounted(() => {
  // Clean up
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }

  window.removeEventListener('resize', handleResize);

  if (controls) {
    controls.dispose();
  }

  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.workspace-3d {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(44, 62, 80, 0.95);
  color: white;
  border-radius: 8px 8px 0 0;
  cursor: move;
  user-select: none;
}

.overlay-title {
  font-weight: 600;
  font-size: 14px;
}

.overlay-actions {
  display: flex;
  gap: 4px;
}

.icon-button {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  transition: background-color 0.2s;
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

canvas {
  display: block;
  flex: 1;
  width: 100%;
  height: 100%;
}

.controls-overlay {
  position: absolute;
  top: 45px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  padding: 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 12px;
}

.control-group {
  margin-bottom: 6px;
}

.control-group:last-child {
  margin-bottom: 0;
}

.control-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.control-group input[type="checkbox"] {
  cursor: pointer;
}

.help-overlay {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  padding: 6px 12px;
  border-radius: 4px;
  pointer-events: none;
}

.help-text {
  margin: 0;
  font-size: 11px;
  color: white;
  white-space: nowrap;
}

.show-3d-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
  transition: all 0.2s;
  z-index: 100;
}

.show-3d-button:hover {
  background: #1976d2;
  box-shadow: 0 6px 16px rgba(33, 150, 243, 0.5);
  transform: translateY(-2px);
}
</style>
