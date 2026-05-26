import type { Matrix3, Vector3 } from 'three';
import type { Primitive, ResolvedStyle } from '@/domain/presentation/Paper';

export type CanvasElementKind =
  | 'point'
  | 'infinite-line'
  | 'finite-segment'
  | 'circle'
  | 'guide'
  | 'sibling-guide'
  | 'hinge-line'
  | 'half-hinge-line'
  | 'arc'
  | 'projected-3d-point'
  | 'projected-3d-line'
  | 'projected-3d-segment';

export interface CanvasStyleState extends ResolvedStyle {}

export interface CanvasRenderItem {
  id: string;
  kind: CanvasElementKind;
  sourceEntityId?: string;
  planeId?: string;
  primitive: Primitive;
  visible: boolean;
  style: CanvasStyleState;
}

export interface CanvasQueryItem {
  id: string;
  kind: Exclude<CanvasElementKind, 'arc' | 'projected-3d-point' | 'projected-3d-line' | 'projected-3d-segment'>;
  elementId: string;
  elementType: string;
  planeId?: string;
  selectable: boolean;
  planeGeometry:
    | { type: 'point'; position: Vector3; visualRadiusPixels: number }
    | { type: 'line'; point: Vector3; direction: Vector3 }
    | { type: 'segment'; point1: Vector3; point2: Vector3 }
    | { type: 'circle'; center: Vector3; radius: number };
}

export interface CanvasSnapPoint {
  elementId: string;
  elementType: string;
  primitiveId: string;
  distance: number;
  snapPoint: Vector3;
}

export interface CanvasPlaneTransformModel {
  planeId: string;
  planeToPaper: Matrix3;
  paperToPlane: Matrix3;
}

export interface CanvasGridLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

export interface CanvasGridLabel {
  key: string;
  value: number;
  position: number;
  edge: 'top' | 'bottom' | 'left' | 'right';
}

export interface CanvasGridLabels {
  top: CanvasGridLabel[];
  bottom: CanvasGridLabel[];
  left: CanvasGridLabel[];
  right: CanvasGridLabel[];
}

export interface CanvasViewportModel {
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
}

export interface CanvasPresentationModel {
  renderItems: CanvasRenderItem[];
  queryItems: CanvasQueryItem[];
  gridLines: CanvasGridLine[];
  gridLabels: CanvasGridLabels;
  planeTransforms: Map<string, CanvasPlaneTransformModel>;
  activePlaneId?: string;
}

export interface CanvasPresentationState {
  hoveredIds?: Set<string>;
  selectedIds?: Set<string>;
  cascadeHighlightIds?: Set<string>;
  activeSnapTargetId?: string;
  activePlaneId?: string;
  showProjectedElements?: boolean;
  gridVisible?: boolean;
}
