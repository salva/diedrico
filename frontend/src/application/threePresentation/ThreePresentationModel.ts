export type Vec3 = { x: number; y: number; z: number };
export type QuaternionDto = { x: number; y: number; z: number; w: number };
export type ThreeRenderGroup = 'projectionPlanes' | 'planarElements' | 'reconstructedElements' | 'projectionLines' | 'guides' | 'hinges' | 'axes' | 'labels';

export interface ThreeStyleDto { color: number | string; opacity?: number; lineWidth?: number; radius?: number; transparent?: boolean; dashSize?: number; gapSize?: number }

interface BaseDto { id: string; sourceEntityId?: string; planeId?: string; visible: boolean; style: ThreeStyleDto; renderGroup: ThreeRenderGroup }
export interface SegmentGeometryDto { start: Vec3; end: Vec3 }
export interface PlaneGeometryDto { center: Vec3; normal: Vec3; size: number; quaternion?: QuaternionDto }

export interface ProjectionPlaneGridDto extends BaseDto { kind: 'projection-plane-grid'; segments: SegmentGeometryDto[] }
export interface ProjectionPlaneSurfaceDto extends BaseDto { kind: 'projection-plane-surface'; geometry: PlaneGeometryDto }
export interface AxisDto extends BaseDto { kind: 'reference-axis' | 'auxiliary-axis'; axis: string; origin: Vec3; direction: Vec3; length: number; label: string }
export interface LabelDto extends BaseDto { kind: 'axis-label' | 'projection-plane-label'; text: string; position: Vec3; className: string }

export interface PlanarPointDto extends BaseDto { kind: 'planar-point'; position: Vec3 }
export interface PlanarLineDto extends BaseDto { kind: 'planar-line' | 'planar-segment'; start: Vec3; end: Vec3 }
export interface PlanarCircleDto extends BaseDto { kind: 'planar-circle'; points: Vec3[] }

export interface ReconstructedPointDto extends BaseDto { kind: 'reconstructed-point'; position: Vec3 }
export interface ReconstructedLineDto extends BaseDto { kind: 'reconstructed-line' | 'reconstructed-segment'; start: Vec3; end: Vec3 }
export interface ReconstructedPlaneDto extends BaseDto { kind: 'reconstructed-plane'; geometry: PlaneGeometryDto }
export interface ProjectionLineDto extends BaseDto { kind: 'projection-line'; start: Vec3; end: Vec3 }

export interface HingeLineDto extends BaseDto { kind: 'hinge-line'; start: Vec3; end: Vec3 }
export interface GuidePerpendicularPlaneDto extends BaseDto { kind: 'guide-perpendicular-plane'; geometry: PlaneGeometryDto }
export interface GuideIntersectionMarkerDto extends BaseDto { kind: 'guide-intersection-marker'; position: Vec3 }

export type ProjectionPlanePresentationDto = ProjectionPlaneGridDto | ProjectionPlaneSurfaceDto | AxisDto | LabelDto;
export type PlanarElementPresentationDto = PlanarPointDto | PlanarLineDto | PlanarCircleDto;
export type ReconstructedElementPresentationDto = ReconstructedPointDto | ReconstructedLineDto | ReconstructedPlaneDto;
export type ProjectionLinePresentationDto = ProjectionLineDto;
export type GuidePresentationDto = GuidePerpendicularPlaneDto | GuideIntersectionMarkerDto;
export type HingePresentationDto = HingeLineDto;

export interface ThreePresentationModel {
  projectionPlanes: ProjectionPlanePresentationDto[];
  planarElements: PlanarElementPresentationDto[];
  reconstructedElements: ReconstructedElementPresentationDto[];
  projectionLines: ProjectionLinePresentationDto[];
  guides: GuidePresentationDto[];
  hinges: HingePresentationDto[];
}
