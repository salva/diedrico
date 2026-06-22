import type { Matrix3, Vector3 } from 'three';
import type { Primitive, ResolvedStyle, ViewportTransform } from '@/domain/presentation/Paper';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { RealizationService } from '@/domain/world/RealizationService';

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
  /**
   * Presentation role used by the canvas renderer and style policy. This may be
   * more specific than primitive.type, e.g. finite segments render as segment
   * primitives and projected 3D points render as point primitives.
   */
  kind: CanvasElementKind;
  sourceEntityId?: string;
  planeId?: string;
  primitive: Primitive;
  visible: boolean;
  style: CanvasStyleState;
}

export interface CanvasQueryItem {
  id: string;
  /**
   * Hit-test role for selectable plane-backed items. Decorative arcs and
   * projected 3D overlays are render-only and intentionally excluded.
   */
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

export interface CanvasPlanePointItem {
  /** Plane-domain shape classification before paper-space primitive creation. */
  kind: 'point';
  elementId: string;
  planeId: string;
  position: Vector3;
  pointRole: 'free' | 'dependent';
}

export interface CanvasPlaneFiniteSegmentItem {
  /** Plane-domain shape classification before paper-space primitive creation. */
  kind: 'finite-segment';
  elementId: string;
  planeId: string;
  point1: Vector3;
  point2: Vector3;
}

export interface CanvasPlaneLineItem {
  /** Plane-domain shape classification before paper-space primitive creation. */
  kind: 'guide' | 'sibling-guide' | 'half-hinge-line' | 'infinite-line';
  elementId: string;
  planeId: string;
  point: Vector3;
  direction: Vector3;
  arcGeometry?: {
    startPoint?: { x: number; y: number };
    endPoint?: { x: number; y: number };
    controlPoints?: Array<{ x: number; y: number }>;
    style?: { color: string; width: number; dashArray?: readonly number[]; opacity: number };
  };
}

export interface CanvasPlaneCircleItem {
  /** Plane-domain shape classification before paper-space primitive creation. */
  kind: 'circle';
  elementId: string;
  planeId: string;
  center: Vector3;
  radius: number;
  radiusVector: Vector3;
}

export type CanvasPlaneItem = CanvasPlanePointItem | CanvasPlaneFiniteSegmentItem | CanvasPlaneLineItem | CanvasPlaneCircleItem;

export interface CanvasPlaneCanvasItems {
  planeId: string;
  transform: CanvasPlaneTransformModel;
  items: CanvasPlaneItem[];
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

export interface CanvasViewportModel extends ViewportTransform {
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
  visibilityModel: VisibilityModel;
  processTree: ProcessTree;
  realizations: RealizationService;
}
