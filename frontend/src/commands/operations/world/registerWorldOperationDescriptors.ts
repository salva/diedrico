import { Vector3, Vector4, Matrix3 } from 'three';
import { Matrix4x3 } from '@/utils/threeUtils';
import type { OperationRegistry } from '../OperationRegistry';
import type { OperationDescriptor, JsonObject } from '../IOperation';
import { AddFreePoint2DOp } from './AddFreePointOp';
import {
  AddLine2DByTwoPointsOp,
  AddLine2DParallelToLineOp,
  AddLine2DPerpendicularToLineOp,
  AddLine2DTangentToCircleThroughPointOp,
  AddLine2DTangentToCircleParallelToLineOp
} from './AddLineOp';
import { AddSegment2DByPointsOp } from './AddSegmentOp';
import { AddCircle2DByCenterAndPointOp } from './AddCircleOp';
import { AddGuide2DPerpendicularToLineOp, AddSiblingGuide2DOp } from './AddGuideOp';
import { AddLineLineIntersectionPoint2DOp } from './AddLineLineIntersectionPoint2DOp';
import { AddLineCircleIntersectionPoint2DOp } from './AddLineCircleIntersectionPoint2DOp';
import { AddCircleCircleIntersectionPoint2DOp } from './AddCircleCircleIntersectionPoint2DOp';
import { AddSiblingIntersectionPoint2DOp } from './AddSiblingIntersectionPoint2DOp';
import { RemovePoint2DOp, RemoveLine2DOp, RemoveSegment2DOp, RemoveCircle2DOp, RemoveGuide2DOp } from './RemoveElementOps';
import { UpdateElementStyleOp, parseStyleProperties } from './UpdateElementStyleOp';
import { UpdateFreePoint2DPositionOp } from './UpdateFreePoint2DPositionOp';
import {
  CreateInitializationSubprocessOp,
  AddPlane3DFixedOp,
  AddProjectionPlaneFixedOp,
  AddOriginPoint2DOp,
  AddHingeLineOp,
  AddHalfHingeLine2DOp
} from './InitializationOps';
import { Add3DPlaneOp } from './Add3DPlaneOp';
import { Add3DPointOp } from './Add3DPointOp';
import { Add3DLineOp } from './Add3DLineOp';
import { Add3DSegmentOp } from './Add3DSegmentOp';
import { AddAuxiliaryProjectionPlaneOp } from './AddAuxiliaryProjectionPlaneOp';
import { AddBrokenHingeLineOp } from './AddBrokenHingeLineOp';

function n(d: JsonObject, key: string): number { const v = d[key]; if (typeof v !== 'number') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be number`); return v; }
function s(d: JsonObject, key: string): string { const v = d[key]; if (typeof v !== 'string') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be string`); return v; }
function so(d: JsonObject, key: string): string | undefined { const v = d[key]; if (v === undefined || v === null) return undefined; if (typeof v !== 'string') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be string`); return v; }
function arr(d: JsonObject, key: string, len: number): number[] { const v = d[key]; if (!Array.isArray(v) || v.length !== len || v.some(x => typeof x !== 'number')) throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be number[${len}]`); return v as number[]; }
function restoreOutput<T extends { outputs: JsonObject }>(op: T, outputs: JsonObject): T { op.outputs = outputs; return op; }
function obj(d: JsonObject, key: string): JsonObject { const v = d[key]; if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be object`); return v; }

export function registerWorldOperationDescriptors(registry: OperationRegistry): void {
  registry.register('AddFreePoint2D', d => restoreOutput(new AddFreePoint2DOp(s(d, 'planeId'), new Vector3(...arr(d, 'position', 3))), { pointId: so(d, 'pointId') }));
  registry.register('AddLine2DByTwoPoints', d => restoreOutput(new AddLine2DByTwoPointsOp(s(d, 'planeId'), s(d, 'point1Id'), s(d, 'point2Id')), { lineId: so(d, 'lineId') }));
  registry.register('AddLine2DParallelToLine', d => restoreOutput(new AddLine2DParallelToLineOp(s(d, 'planeId'), s(d, 'referenceLineId'), s(d, 'throughPointId')), { lineId: so(d, 'lineId') }));
  registry.register('AddLine2DPerpendicularToLine', d => restoreOutput(new AddLine2DPerpendicularToLineOp(s(d, 'planeId'), s(d, 'referenceLineId'), s(d, 'throughPointId')), { lineId: so(d, 'lineId') }));
  registry.register('AddLine2DTangentToCircleThroughPoint', d => restoreOutput(new AddLine2DTangentToCircleThroughPointOp(s(d, 'planeId'), s(d, 'circleId'), s(d, 'throughPointId'), n(d, 'index') as 0 | 1), { lineId: so(d, 'lineId') }));
  registry.register('AddLine2DTangentToCircleParallelToLine', d => restoreOutput(new AddLine2DTangentToCircleParallelToLineOp(s(d, 'planeId'), s(d, 'circleId'), s(d, 'referenceLineId'), n(d, 'index') as 0 | 1), { lineId: so(d, 'lineId') }));
  registry.register('AddSegment2DByPoints', d => restoreOutput(new AddSegment2DByPointsOp(s(d, 'planeId'), s(d, 'point1Id'), s(d, 'point2Id')), { segmentId: so(d, 'segmentId') }));
  registry.register('AddCircle2DByCenterAndPoint', d => restoreOutput(new AddCircle2DByCenterAndPointOp(s(d, 'planeId'), s(d, 'centerPointId'), s(d, 'circumferencePointId')), { circleId: so(d, 'circleId') }));
  registry.register('AddLineLineIntersectionPoint2D', d => restoreOutput(new AddLineLineIntersectionPoint2DOp(s(d, 'planeId'), s(d, 'line1Id'), s(d, 'line2Id')), { pointId: so(d, 'pointId') }));
  registry.register('AddLineCircleIntersectionPoint2D', d => restoreOutput(new AddLineCircleIntersectionPoint2DOp(s(d, 'planeId'), s(d, 'lineId'), s(d, 'circleId'), n(d, 'index')), { pointId: so(d, 'pointId') }));
  registry.register('AddCircleCircleIntersectionPoint2D', d => restoreOutput(new AddCircleCircleIntersectionPoint2DOp(s(d, 'planeId'), s(d, 'circle1Id'), s(d, 'circle2Id'), n(d, 'index')), { pointId: so(d, 'pointId') }));
  registry.register('AddGuide2DPerpendicularToLine', d => restoreOutput(new AddGuide2DPerpendicularToLineOp(s(d, 'planeId'), s(d, 'referenceLineId'), s(d, 'throughPointId'), so(d, 'guideId')), { guideId: so(d, 'guideId') }));
  registry.register('AddSiblingGuide2D', d => restoreOutput(new AddSiblingGuide2DOp(s(d, 'planeId'), s(d, 'primaryGuideId'), s(d, 'referenceLineId'), so(d, 'siblingGuideId')), { siblingGuideId: so(d, 'siblingGuideId') }));
  registry.register('AddSiblingIntersectionPoint2D', d => restoreOutput(new AddSiblingIntersectionPoint2DOp(s(d, 'planeId'), s(d, 'primaryIntersectionId')), { pointId: so(d, 'pointId') }));
  registry.register('AddIntersectionPoint2D', d => restoreOutput(new AddLineLineIntersectionPoint2DOp(s(d, 'planeId'), s(d, 'line1Id'), s(d, 'line2Id')), { pointId: so(d, 'pointId') }));
  registry.register('RemovePoint2D', d => new RemovePoint2DOp(s(d, 'planeId'), s(d, 'pointId')));
  registry.register('RemoveLine2D', d => new RemoveLine2DOp(s(d, 'planeId'), s(d, 'lineId')));
  registry.register('RemoveSegment2D', d => new RemoveSegment2DOp(s(d, 'planeId'), s(d, 'segmentId')));
  registry.register('RemoveCircle2D', d => new RemoveCircle2DOp(s(d, 'planeId'), s(d, 'circleId')));
  registry.register('RemoveGuide2D', d => new RemoveGuide2DOp(s(d, 'planeId'), s(d, 'guideId')));
  registry.register('UpdateElementStyle', d => { const payload = obj(d, 'payload'); return new UpdateElementStyleOp(s(payload, 'elementId'), s(payload, 'planeId'), parseStyleProperties(obj(payload, 'newStyle'))); });
  registry.register('UpdateFreePoint2DPosition', d => new UpdateFreePoint2DPositionOp(s(d, 'planeId'), s(d, 'pointId'), new Vector3(...arr(d, 'newPosition', 3))));
  registry.register('CreateInitializationSubprocess', d => new CreateInitializationSubprocessOp(so(d, 'subprocessName')));
  registry.register('AddPlane3DFixed', d => restoreOutput(new AddPlane3DFixedOp(new Vector4(...arr(d, 'point', 4)), new Vector4(...arr(d, 'normal', 4)), so(d, 'planeId'), so(d, 'label')), { planeId: so(d, 'planeId') }));
  registry.register('AddProjectionPlaneFixed', d => restoreOutput(new AddProjectionPlaneFixedOp(s(d, 'plane3DId'), new Matrix3().fromArray(arr(d, 'planeToPaper2D', 9)), new Matrix4x3().fromArray(arr(d, 'planeTo3D', 12)), so(d, 'projPlaneId'), so(d, 'name')), { projPlaneId: so(d, 'projPlaneId') }));
  registry.register('AddOriginPoint2D', d => restoreOutput(new AddOriginPoint2DOp(s(d, 'projPlaneId'), new Vector3(...arr(d, 'position', 3)), so(d, 'label'), so(d, 'pointId')), { pointId: so(d, 'pointId'), projPlaneId: s(d, 'projPlaneId') }));
  registry.register('AddHingeLine', d => restoreOutput(new AddHingeLineOp(s(d, 'horizontalPlaneId'), s(d, 'verticalPlaneId'), so(d, 'hingeLineId')), { hingeLineId: so(d, 'hingeLineId') }));
  registry.register('AddHalfHingeLine2D', d => restoreOutput(new AddHalfHingeLine2DOp(s(d, 'projPlaneId'), s(d, 'hingeLineId'), so(d, 'lineId')), { lineId: so(d, 'lineId'), projPlaneId: s(d, 'projPlaneId') }));
  registry.register('AddBrokenHingeLine', d => restoreOutput(new AddBrokenHingeLineOp(s(d, 'mainHingeId'), s(d, 'auxiliaryPlaneId'), s(d, 'plane1Id'), s(d, 'plane2Id'), so(d, 'brokenHingeLineId'), so(d, 'bhhl1Id'), so(d, 'bhhl2Id')), { brokenHingeLineId: so(d, 'brokenHingeLineId'), bhhl1Id: so(d, 'bhhl1Id'), bhhl2Id: so(d, 'bhhl2Id') }));
  registry.register('Add3DPlane', d => restoreOutput(new Add3DPlaneOp(s(d, 'trace1Id'), s(d, 'trace2Id'), s(d, 'plane1Id'), s(d, 'plane2Id'), so(d, 'label')), { planeId: so(d, 'planeId') }));
  registry.register('Add3DPoint', d => restoreOutput(new Add3DPointOp(s(d, 'projection1Id'), s(d, 'projection2Id'), s(d, 'plane1Id'), s(d, 'plane2Id'), so(d, 'label')), { pointId: so(d, 'pointId') }));
  registry.register('Add3DLine', d => restoreOutput(new Add3DLineOp(s(d, 'projection1Id'), s(d, 'projection2Id'), s(d, 'plane1Id'), s(d, 'plane2Id'), so(d, 'label')), { lineId: so(d, 'lineId') }));
  registry.register('Add3DSegment', d => restoreOutput(new Add3DSegmentOp(s(d, 'projection1Id'), s(d, 'projection2Id'), s(d, 'plane1Id'), s(d, 'plane2Id'), so(d, 'label')), { segmentId: so(d, 'segmentId') }));
  registry.register('AddAuxiliaryProjectionPlane', d => restoreOutput(new AddAuxiliaryProjectionPlaneOp(s(d, 'plane3DId'), s(d, 't1HingeTraceId'), s(d, 't2OtherTraceId'), s(d, 't2PrimeLineId'), so(d, 'name')), { projPlaneId: so(d, 'projPlaneId') }));
}

export type RegisteredWorldOperationDescriptor = OperationDescriptor;
