import type { PlaneGeometryDto, SegmentGeometryDto, ThreeStyleDto, Vec3 } from './ThreePresentationModel';

export interface ThreeEntitySourceDto {
  readonly id: string;
  readonly visible: boolean;
  readonly style: ThreeStyleDto;
}

export interface ThreeProjectionPlaneSourceDto {
  readonly id: string;
  readonly kind: 'fixed' | 'auxiliary';
  readonly plane3DId: string | undefined;
  readonly surface: PlaneGeometryDto;
  readonly gridSegments: SegmentGeometryDto[];
  readonly auxiliaryAxes?: {
    readonly origin: Vec3;
    readonly uDirection: Vec3;
    readonly vDirection: Vec3;
  };
}

export interface ThreePlanarPointSourceDto extends ThreeEntitySourceDto {
  readonly kind: 'planar-point';
  readonly planeId: string;
  readonly position: Vec3;
}

export interface ThreePlanarLineSourceDto extends ThreeEntitySourceDto {
  readonly kind: 'planar-line' | 'planar-segment';
  readonly planeId: string;
  readonly start: Vec3;
  readonly end: Vec3;
}

export interface ThreePlanarCircleSourceDto extends ThreeEntitySourceDto {
  readonly kind: 'planar-circle';
  readonly planeId: string;
  readonly points: Vec3[];
}

export type ThreePlanarElementSourceDto = ThreePlanarPointSourceDto | ThreePlanarLineSourceDto | ThreePlanarCircleSourceDto;

export interface ThreePlanarPlaneReadModel {
  readonly id: string;
  readonly elements: ThreePlanarElementSourceDto[];
}

export interface ThreeReconstructedPointSourceDto extends ThreeEntitySourceDto {
  readonly kind: 'reconstructed-point';
  readonly position: Vec3;
}

export interface ThreeReconstructedLineSourceDto extends ThreeEntitySourceDto {
  readonly kind: 'reconstructed-line' | 'reconstructed-segment';
  readonly start: Vec3;
  readonly end: Vec3;
}

export interface ThreeReconstructedPlaneSourceDto extends ThreeEntitySourceDto {
  readonly kind: 'reconstructed-plane';
  readonly geometry: PlaneGeometryDto;
}

export interface ThreeReconstructedReadModel {
  readonly points: ThreeReconstructedPointSourceDto[];
  readonly lines: ThreeReconstructedLineSourceDto[];
  readonly segments: ThreeReconstructedLineSourceDto[];
  readonly planes: ThreeReconstructedPlaneSourceDto[];
}

export interface ThreeGuideSourceDto extends ThreeEntitySourceDto {
  readonly planeId: string;
  readonly planePoint: Vec3;
  readonly planeNormal: Vec3;
  readonly geometry: PlaneGeometryDto;
}

export interface ThreeGuideIntersectionReadModel {
  readonly points: Array<ThreeEntitySourceDto & { readonly position: Vec3 }>;
  readonly lines: Array<ThreeEntitySourceDto & { readonly point: Vec3; readonly direction: Vec3 }>;
  readonly segments: Array<ThreeEntitySourceDto & { readonly start: Vec3; readonly end: Vec3 }>;
}

export interface ThreeHingeSourceDto extends ThreeEntitySourceDto {
  readonly start: Vec3;
  readonly end: Vec3;
}
