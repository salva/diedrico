/**
 * Display options for 3D view overlay
 * Controls visibility of various 3D visualization elements
 */
export interface ThreeViewDisplayOptions {
  /** Show projection plane surfaces */
  showPlanes: boolean;
  
  /** Show 2D elements positioned on their planes in 3D space (Phase 77) */
  show2DElementsOnPlanes: boolean;
  
  /** Show projection connector lines from 3D points to their plane projections */
  showLinkingVisuals: boolean;
  
  /** Show 3D coordinate grid */
  showGrid: boolean;
  
  /** Show reference coordinate axes (X/Y/Z) at origin (Phase 82) */
  showReferenceAxes: boolean;
}

/**
 * Default display options
 */
export const defaultThreeViewDisplayOptions: ThreeViewDisplayOptions = {
  showPlanes: true,
  show2DElementsOnPlanes: false,  // Disabled by default
  showLinkingVisuals: false,
  showGrid: true,
  showReferenceAxes: true  // Enabled by default for orientation
};
