import type { Matrix3, Vector4 } from 'three';
import type { Matrix4x3 } from '@/utils/threeUtils';
import { HingeLine } from './HingeLine';
import { Plane3DFixed } from './Plane';
import { FixedProjectionPlane } from './projectionPlane/FixedProjectionPlane';

export function createFixed3DPlane(args: {
  id: string;
  point: Vector4;
  normal: Vector4;
  label?: string;
}): Plane3DFixed {
  return new Plane3DFixed(args.id, args.point, args.normal, args.label);
}

export function createFixedProjectionPlane(args: {
  id: string;
  label: string;
  planeToPaper2D: Matrix3;
  planeTo3D: Matrix4x3;
  plane3DId: string;
}): FixedProjectionPlane {
  return new FixedProjectionPlane(
    args.id,
    args.label,
    args.planeToPaper2D,
    args.planeTo3D,
    false,
    true,
    '#808080',
    args.plane3DId,
  );
}

export function createHingeLineEntity(args: {
  id: string;
  label: string;
  horizontalPlaneId: string;
  verticalPlaneId: string;
}): HingeLine {
  return new HingeLine(args.id, args.label, args.horizontalPlaneId, args.verticalPlaneId);
}
