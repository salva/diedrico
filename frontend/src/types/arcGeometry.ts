/**
 * ArcGeometry - Arc geometry for visualizing distance transport between broken hinge line siblings
 * 
 * Represents a dashed arc connecting guide points on T2 and T2' (sibling broken hinge lines).
 * The arc shows the path of distance transport, similar to using a compass on paper to
 * transfer a distance from one trace to another.
 * 
 * **Phase 101**: Broken Hinge Lines and Distance Transport Guides
 * - Arcs are stored in paper coordinates (not plane coordinates)
 * - Rendered as dashed gray curves in the canvas
 * - Toggleable via "Show Distance Arcs" setting
 * 
 */

import { Vector2 } from 'three';

/**
 * ArcGeometry interface - Defines arc visualization data
 * 
 * The arc is represented as a quadratic Bezier curve with:
 * - startPoint: Point on primary guide (e.g., on T2)
 * - endPoint: Point on sibling guide (e.g., on T2')
 * - controlPoints: Intermediate points for curve definition
 * - center/radius: Optional (if circular arc instead of Bezier)
 * - style: Visual styling (color, dash pattern, width, opacity)
 */
export interface ArcGeometry {
  /** Start point of arc in paper coordinates */
  startPoint: Vector2;

  /** End point of arc in paper coordinates */
  endPoint: Vector2;

  /** Control points for Bezier curve (typically 1 point for quadratic Bezier) */
  controlPoints: Vector2[];

  /** Optional: Center of circular arc (if using circular arc instead of Bezier) */
  center?: Vector2;

  /** Optional: Radius of circular arc (if using circular arc) */
  radius?: number;

  /** Visual styling for arc rendering */
  style: {
    /** Color as hex string (e.g., '#999999' for gray) */
    color: string;

    /** SVG dash array pattern (e.g., '5,5' for dashed line) */
    dashArray: string;

    /** Line width in pixels */
    width: number;

    /** Opacity from 0.0 (transparent) to 1.0 (opaque) */
    opacity: number;
  };
}

/**
 * Default arc style for distance transport visualization
 */
export const DEFAULT_ARC_STYLE = {
  color: '#999999',     // Gray
  dashArray: '5,5',     // Dashed pattern
  width: 1.5,           // Line width in pixels
  opacity: 0.5          // Semi-transparent
};
