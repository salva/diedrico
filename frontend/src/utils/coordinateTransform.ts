/**
 * coordinateTransform.ts - Complete coordinate transformation pipeline
 * 
 * Implements the full transformation chain from screen coordinates to 3D space:
 * Screen → SVG → Paper → Plane (u,v) → 3D (x,y,z)
 * 
 * This demonstrates the layered coordinate system architecture:
 * 1. Screen: Mouse event coordinates (pixels)
 * 2. SVG: Canvas element coordinate space
 * 3. Paper: Viewport-transformed canvas space
 * 4. Plane: Projection plane intrinsic (u,v) coordinates
 * 5. 3D: World 3D (x,y,z) coordinates
 * 
 */

import { Vector3, Vector4, Matrix3 } from 'three';
import type { World } from '@/domain/world/World';
import type { ProjectionPlaneRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
import { applyMatrix3, applyMatrix4x3 } from './threeUtils';

export interface CoordinateTransformResult {
  success: boolean;
  coordinates?: {
    x: number;
    y: number;
    z: number;
  };
  error?: string;
}

/**
 * Convert screen coordinates (mouse event) to SVG coordinates
 * 
 * @param screenX - Mouse clientX
 * @param screenY - Mouse clientY
 * @param svgElement - The SVG element
 * @returns SVG coordinates as Vector3 (x, y, 1) in homogeneous coords
 */
export function screenToSVG(
  screenX: number,
  screenY: number,
  svgElement: SVGSVGElement
): Vector3 {
  // Get SVG element's bounding rectangle
  const rect = svgElement.getBoundingClientRect();
  
  // Get viewBox dimensions (or use width/height if no viewBox)
  const viewBox = svgElement.viewBox.baseVal;
  const svgWidth = viewBox.width || svgElement.clientWidth;
  const svgHeight = viewBox.height || svgElement.clientHeight;
  
  // Convert screen coordinates relative to SVG element
  const relativeX = screenX - rect.left;
  const relativeY = screenY - rect.top;
  
  // Scale to SVG coordinate space (accounting for viewBox)
  const svgX = (relativeX / rect.width) * svgWidth + viewBox.x;
  const svgY = (relativeY / rect.height) * svgHeight + viewBox.y;
  
  return new Vector3(svgX, svgY, 1);
}

/**
 * Convert SVG coordinates to Paper coordinates
 * 
 * Paper coordinates are the viewport-transformed canvas space.
 * This applies the inverse of the viewport transform (pan/zoom).
 * 
 * @param svgPoint - Point in SVG coordinates (homogeneous)
 * @param viewportTransform - Inverse viewport transform matrix (canvas→paper)
 * @returns Paper coordinates as Vector3 (x, y, 1) in homogeneous coords
 */
export function svgToPaper(
  svgPoint: Vector3,
  viewportTransform: Matrix3
): Vector3 {
  // The viewportTransform passed in is already the inverse (canvas→paper)
  // So we just apply it directly without inverting again
  return applyMatrix3(svgPoint, viewportTransform);
}

/**
 * Convert Paper coordinates to Plane intrinsic (u,v) coordinates
 * 
 * Uses the projection plane's paperToPlane2D transformation matrix.
 * 
 * @param paperPoint - Point in paper coordinates (homogeneous)
 * @param planeId - ID of the projection plane
 * @param world - World instance containing planes
 * @returns Plane coordinates as Vector3 (u, v, 1)
 */
export function paperToPlane(
  paperPoint: Vector3,
  planeId: string,
  world: World,
  realizationContext: ProjectionPlaneRealizationContext
): Vector3 {
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) {
    throw new Error(`Projection plane not found: ${planeId}`);
  }
  
  // Get the plane's realization which contains the transform
  const realization = realizationContext.getProjectionPlane2DRealization(planeId);
  if (!realization) {
    throw new Error(`Projection plane 2D realization not found: ${planeId}`);
  }
  
  // Apply paper-to-plane transformation
  return applyMatrix3(paperPoint, realization.paperToPlane2D);
}

/**
 * Convert Plane (u,v) coordinates to 3D (x,y,z) coordinates
 * 
 * Uses the projection plane's planeTo3D transformation matrix (Matrix4x3).
 * Transforms Vector3 (u, v, 1) to Vector4 (x, y, z, w) homogeneous coordinates.
 * 
 * @param planePoint - Point in plane coordinates (u, v, 1)
 * @param planeId - ID of the projection plane
 * @param world - World instance containing planes
 * @returns 3D coordinates as Vector4 (x, y, z, w)
 */
export function planeTo3D(
  planePoint: Vector3,
  planeId: string,
  world: World,
  realizationContext: ProjectionPlaneRealizationContext
): Vector4 {
  const plane = world.getProjectionPlaneById(planeId);
  if (!plane) {
    throw new Error(`Projection plane not found: ${planeId}`);
  }
  
  // Get the plane's realization which contains the 3D transform
  const realization = realizationContext.getProjectionPlane3DRealization(planeId);
  if (!realization) {
    throw new Error(`Projection plane 3D realization not found: ${planeId}`);
  }
  
  // Apply plane-to-3D transformation using Matrix4x3
  // Input: Vector3 (u, v, 1) in homogeneous plane coordinates
  // Output: Vector4 (x, y, z, w) in homogeneous 3D space
  return applyMatrix4x3(planePoint, realization.planeTo3D);
}

/**
 * Complete transformation pipeline: Screen → SVG → Paper → Plane → 3D
 * 
 * This is the main entry point for converting cursor position to 3D coordinates.
 * 
 * @param screenX - Mouse clientX
 * @param screenY - Mouse clientY
 * @param svgElement - The SVG element
 * @param viewportTransform - Current viewport transform
 * @param activePlaneId - ID of the active projection plane
 * @param world - World instance
 * @returns Result with 3D coordinates or error
 */
export function screenTo3D(
  screenX: number,
  screenY: number,
  svgElement: SVGSVGElement,
  viewportTransform: Matrix3,
  activePlaneId: string,
  world: World,
  realizationContext: ProjectionPlaneRealizationContext
): CoordinateTransformResult {
  // Step 1: Screen → SVG
  const svgCoords = screenToSVG(screenX, screenY, svgElement);

  // Step 2: SVG → Paper
  const paperCoords = svgToPaper(svgCoords, viewportTransform);

  // Step 3: Paper → Plane
  const planeCoords = paperToPlane(paperCoords, activePlaneId, world, realizationContext);

  // Step 4: Plane → 3D
  const coords3D = planeTo3D(planeCoords, activePlaneId, world, realizationContext);

  // Convert from homogeneous coordinates (x,y,z,w) → (x/w, y/w, z/w)
  if (coords3D.w === 0) {
    return {
      success: false,
      error: 'Point at infinity'
    };
  }

  return {
    success: true,
    coordinates: {
      x: coords3D.x / coords3D.w,
      y: coords3D.y / coords3D.w,
      z: coords3D.z / coords3D.w
    }
  };
}
