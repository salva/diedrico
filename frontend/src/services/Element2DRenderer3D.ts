/**
 * Element2DRenderer3D - Service for rendering 2D elements in 3D space
 * 
 * Phase 77: 3D Visualization of 2D Elements on Planes
 * 
 * Transforms 2D plane-local coordinates to 3D world coordinates and creates
 * Three.js geometry for visualization in the 3D view overlay.
 * 
 * Key responsibilities:
 * - Iterate through ALL projection planes (default and user-created)
 * - Transform 2D element coordinates to 3D using projection plane matrices
 * - Create appropriate Three.js primitives (spheres, lines, curves)
 * - Apply visual styles with active plane emphasis
 * - Manage geometry caching for performance
 * - Prevent z-fighting with plane surfaces
 * 
 * @see specs/001-dihedral-learning-mvp/data-model.md#phase-77-3d-visualization-of-2d-elements-on-planes
 */

import * as THREE from 'three';
import type { World } from '../domain/world/World';
import type { Element2D } from '../domain/world/Element2D';
import type { ProjectionPlane } from '../domain/world/ProjectionPlane';
import type { Point2D } from '../domain/world/Point';
import type { Line2D } from '../domain/world/Line';
import type { Circle2D } from '../domain/world/Circle';
import type { ThreeViewDisplayOptions } from '../types/ThreeViewDisplayOptions';
import { applyMatrix4x3 } from '../utils/threeUtils';

/**
 * Material style properties for Three.js rendering
 */
export interface MaterialStyle {
  color: number;        // Three.js color (hex number)
  opacity: number;      // 0.0 to 1.0
  lineWidth?: number;   // Line width (note: limited support in WebGL)
}

/**
 * Main rendering service for 2D elements in 3D space
 */
export class Element2DRenderer3D {
  private scene: THREE.Scene;
  private geometryCache: Map<string, THREE.Object3D>;
  private activePlaneId: string | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometryCache = new Map();
  }

  /**
   * Main entry point: render all visible 2D elements from World
   * Iterates through ALL projection planes (default and user-created)
   * 
   * @param world - World instance with projection planes and elements
   * @param displayOptions - Display options controlling what to render
   */
  renderElements(world: World, displayOptions: ThreeViewDisplayOptions): void {
    if (!displayOptions.show2DElementsOnPlanes) {
      this.clear();
      return;
    }

    // Clear previous geometry
    this.clear();

    // Get active plane ID for emphasis
    this.activePlaneId = null; // TODO: Get from world or display options

    // Iterate through ALL projection planes (no special handling for P_H/P_V)
    const planes = Array.from(world.projectionPlanes.values());
    
    for (const plane of planes) {
      this.renderPlaneElements(plane, world);
    }
  }

  /**
   * Render all elements on a single projection plane
   */
  private renderPlaneElements(plane: ProjectionPlane, world: World): void {
    const isActivePlane = plane.id === this.activePlaneId;

    // Render points
    for (const point of plane.getAllPoints()) {
      this.renderPoint(point, plane, world, isActivePlane);
    }

    // Render lines (includes segments, guides, etc.)
    for (const line of plane.getAllLines()) {
      // Check if it's a segment (bounded line)
      const realization2D = line.realize2D(world);
      if (realization2D && realization2D.isBounded()) {
        this.renderSegment(line, plane, world, isActivePlane);
      } else {
        this.renderLine(line, plane, world, isActivePlane);
      }
    }

    // Render circles
    for (const circle of plane.getAllCircles()) {
      this.renderCircle(circle, plane, world, isActivePlane);
    }
  }

  /**
   * Render a Point2D as a sphere in 3D space
   */
  private renderPoint(
    point: Point2D,
    plane: ProjectionPlane,
    world: World,
    isActivePlane: boolean
  ): void {
    // Get 2D realization
    const realization2D = point.realize2D(world);
    if (!realization2D || !realization2D.feasible) {
      return; // Skip infeasible points
    }

    // Transform to 3D
    const position3D = this.transform2DTo3D(realization2D.position, plane, world);
    if (!position3D) {
      return;
    }

    // Get visual style
    const style = this.resolveVisualStyle(point, isActivePlane);

    // Create sphere geometry
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: style.color,
      opacity: style.opacity,
      transparent: true,
      depthTest: true,
      depthWrite: true
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position3D);

    // Add to scene and cache
    this.scene.add(sphere);
    this.geometryCache.set(point.id, sphere);
  }

  /**
   * Render a Line2D as a line segment in 3D space
   */
  private renderLine(
    line: Line2D,
    plane: ProjectionPlane,
    world: World,
    isActivePlane: boolean
  ): void {
    // Get 2D realization
    const realization2D = line.realize2D(world);
    if (!realization2D || !realization2D.feasible) {
      return;
    }

    // Get line endpoints (clipped to plane boundaries)
    // TODO: Implement proper plane boundary clipping
    // For now, use a large enough extent
    const direction = realization2D.getDirection().clone().normalize();
    const point = realization2D.point1;
    
    const startPoint2D = point.clone().add(direction.clone().multiplyScalar(-1000));
    const endPoint2D = point.clone().add(direction.clone().multiplyScalar(1000));

    // Transform endpoints to 3D
    const start3D = this.transform2DTo3D(startPoint2D, plane, world);
    const end3D = this.transform2DTo3D(endPoint2D, plane, world);
    
    if (!start3D || !end3D) {
      return;
    }

    // Get visual style
    const style = this.resolveVisualStyle(line, isActivePlane);

    // Create thicker line using TubeGeometry for better visibility
    const lineCurve = new THREE.LineCurve3(start3D, end3D);
    const tubeRadius = 0.15; // Thicker lines for visibility
    const geometry = new THREE.TubeGeometry(lineCurve, 1, tubeRadius, 8, false);
    const material = new THREE.MeshBasicMaterial({
      color: style.color,
      opacity: style.opacity * 0.7, // Reduced opacity for lines
      transparent: true,
      depthTest: true,
      depthWrite: true
    });
    const lineObject = new THREE.Mesh(geometry, material);

    // Add to scene and cache
    this.scene.add(lineObject);
    this.geometryCache.set(line.id, lineObject);
  }

  /**
   * Render a Segment2D (bounded line) as a line segment in 3D space
   */
  private renderSegment(
    line: Line2D,
    plane: ProjectionPlane,
    world: World,
    isActivePlane: boolean
  ): void {
    // Get 2D realization
    const realization2D = line.realize2D(world);
    if (!realization2D || !realization2D.feasible || !realization2D.isBounded()) {
      return;
    }

    // Transform endpoints to 3D
    const start3D = this.transform2DTo3D(realization2D.point1, plane, world);
    const end3D = this.transform2DTo3D(realization2D.point2, plane, world);
    
    if (!start3D || !end3D) {
      return;
    }

    // Get visual style
    const style = this.resolveVisualStyle(line, isActivePlane);

    // Create thicker line using TubeGeometry for better visibility
    const curve = new THREE.LineCurve3(start3D, end3D);
    const tubeRadius = 0.15; // Thicker lines for visibility
    const geometry = new THREE.TubeGeometry(curve, 1, tubeRadius, 8, false);
    const material = new THREE.MeshBasicMaterial({
      color: style.color,
      opacity: style.opacity * 0.7,
      transparent: true,
      depthTest: true,
      depthWrite: true
    });
    const lineObject = new THREE.Mesh(geometry, material);

    // Add to scene and cache
    this.scene.add(lineObject);
    this.geometryCache.set(line.id, lineObject);
  }

  /**
   * Render a Circle2D as a 3D curve on the plane
   */
  private renderCircle(
    circle: Circle2D,
    plane: ProjectionPlane,
    world: World,
    isActivePlane: boolean
  ): void {
    // Get 2D realization
    const realization2D = circle.realize2D(world);
    if (!realization2D || !realization2D.feasible) {
      return;
    }

    // Transform center to 3D
    const center3D = this.transform2DTo3D(realization2D.center, plane, world);
    if (!center3D) {
      return;
    }

    // Get visual style
    const style = this.resolveVisualStyle(circle, isActivePlane);

    // Create circle as a curve with 64 segments for smoothness
    const radius = realization2D.getRadius();
    const ellipseCurve = new THREE.EllipseCurve(
      0, 0,                        // Center offset (we'll position the geometry)
      radius, radius,              // Radii
      0, 2 * Math.PI,             // Start/end angle
      false,                       // Clockwise
      0                            // Rotation
    );
    
    const points2D = ellipseCurve.getPoints(64);
    
    // Transform circle points to 3D
    // We need to transform each point from the circle's local space to the plane's 3D space
    const points3D: THREE.Vector3[] = [];
    for (const p2D of points2D) {
      // Offset by circle center in 2D
      const pointIn2D = realization2D.center.clone();
      pointIn2D.x += p2D.x;
      pointIn2D.y += p2D.y;
      
      const point3D = this.transform2DTo3D(pointIn2D, plane, world);
      if (point3D) {
        points3D.push(point3D);
      }
    }

    if (points3D.length < 3) {
      return; // Not enough points to form a circle
    }

    // Create thicker circle using TubeGeometry for better visibility
    const circleCurve = new THREE.CatmullRomCurve3(points3D, true); // true = closed curve
    const tubeRadius = 0.15; // Thicker lines for visibility
    const geometry = new THREE.TubeGeometry(circleCurve, points3D.length, tubeRadius, 8, true);
    const material = new THREE.MeshBasicMaterial({
      color: style.color,
      opacity: style.opacity * 0.7,
      transparent: true,
      depthTest: true,
      depthWrite: true
    });
    const circleObject = new THREE.Mesh(geometry, material); // Mesh instead of LineLoop

    // Add to scene and cache
    this.scene.add(circleObject);
    this.geometryCache.set(circle.id, circleObject);
  }

  /**
   * Transform a 2D point in plane-local coordinates to 3D world coordinates
   * 
   * Pipeline: 2D (u,v) → ProjectionPlane matrix → 3D (x,y,z)
   * 
   * @param point2D - Point in plane-local coordinates (Vector3 with z=1)
   * @param plane - Projection plane containing the element
   * @param world - World instance for plane realization lookup
   * @returns 3D position with z-fighting offset, or null if transformation fails
   */
  private transform2DTo3D(
    point2D: THREE.Vector3,
    plane: ProjectionPlane,
    world: World
  ): THREE.Vector3 | null {
    // Ensure plane has ID
    if (!plane.id) {
      return null;
    }
    
    // Get plane's 3D realization
    const planeRealization = world.getProjectionPlane3DRealization(plane.id);
    if (!planeRealization) {
      return null;
    }

    // Apply 4x3 transformation matrix (returns Vector4)
    const position4D = applyMatrix4x3(point2D, planeRealization.planeTo3D);
    
    // Convert to Vector3 (drop homogeneous coordinate)
    const position3D = new THREE.Vector3(position4D.x, position4D.y, position4D.z);
    
    // Apply z-fighting prevention offset
    // TODO: Compute plane normal from transformation matrix
    // For now, offset a fixed small amount in Z direction
    position3D.z += 0.01;

    return position3D;
  }

  /**
   * Resolve visual style for an element with active plane emphasis
   * 
   * @param element - Element to get style for
   * @param isActivePlane - Whether element is on the active plane
   * @returns Material style properties
   */
  private resolveVisualStyle(
    _element: Element2D,
    isActivePlane: boolean
  ): MaterialStyle {
    // Get element's visual properties
    // TODO: Implement proper style resolution from element's visual style
    // For now, use default styling
    
    const baseOpacity = 1.0;
    const activeMultiplier = isActivePlane ? 1.0 : 0.5;

    return {
      color: 0x2196F3, // Blue (Material Design)
      opacity: baseOpacity * activeMultiplier,
      lineWidth: 1
    };
  }

  /**
   * Update visibility of cached elements
   * 
   * @param visibilityMap - Map of element IDs to visibility state
   */
  updateVisibility(visibilityMap: Map<string, boolean>): void {
    for (const [elementId, visible] of visibilityMap) {
      const object = this.geometryCache.get(elementId);
      if (object) {
        object.visible = visible;
      }
    }
  }

  /**
   * Clear all rendered geometry from the scene
   */
  clear(): void {
    // Remove all cached objects from scene
    for (const object of this.geometryCache.values()) {
      this.scene.remove(object);
      
      // Dispose geometry and materials to free memory
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      } else if (object instanceof THREE.Line) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
    
    // Clear cache
    this.geometryCache.clear();
  }
}
