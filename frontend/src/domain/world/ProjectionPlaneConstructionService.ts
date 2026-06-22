import { Matrix3, Vector4 } from 'three';
import { Matrix4x3 } from '@/utils/threeUtils';
import { BrokenHingeLine } from './BrokenHingeLine';
import type { DependencyService } from './DependencyService';
import { BrokenHalfHingeLine2D } from './elements/BrokenHalfHingeLine2D';
import { HingeLine } from './HingeLine';
import { Plane3DFixed } from './Plane';
import type { ProjectionConstructionService } from './ProjectionConstructionService';
import { FixedProjectionPlane } from './projectionPlane/FixedProjectionPlane';
import type { ProjectionPlane } from './projectionPlane/ProjectionPlane';
import type { LabelGenerator } from './LabelGenerator';
import type { WorldIdAllocator } from './WorldIdAllocator';
import type { World } from './World';

interface ProjectionPlaneConstructionContext {
  readonly world: World;
  readonly dependencies: DependencyService;
  readonly ids: WorldIdAllocator;
  readonly labels: LabelGenerator;
  readonly projectionConstruction: ProjectionConstructionService;
}

export class ProjectionPlaneConstructionService {
  constructor(private readonly context: ProjectionPlaneConstructionContext) {}

  addFixed3DPlane(params: {
    readonly point: Vector4;
    readonly normal: Vector4;
    readonly planeId?: string;
    readonly label?: string;
  }): Plane3DFixed {
    const id = params.planeId || this.context.ids.prefixed('plane');
    const plane = new Plane3DFixed(id, params.point.clone(), params.normal.clone(), params.label);
    this.context.world.putPlane3D(plane);
    this.context.dependencies.registerNode(plane.id, plane.getDependencies());
    return plane;
  }

  addFixedProjectionPlane(params: {
    readonly plane3DId: string;
    readonly planeToPaper2D: Matrix3;
    readonly planeTo3D: Matrix4x3;
    readonly projPlaneId?: string;
    readonly name?: string;
  }): ProjectionPlane {
    const id = params.projPlaneId || this.context.ids.prefixed('projPlane');
    const label = params.name || this.context.labels.next('ProjectionPlane');
    const projPlane = new FixedProjectionPlane(
      id,
      label,
      params.planeToPaper2D,
      params.planeTo3D,
      false,
      true,
      '#808080',
      params.plane3DId,
    );
    this.context.world.putProjectionPlane(projPlane);
    this.context.dependencies.registerNode(projPlane.id, projPlane.getDependencies());
    return projPlane;
  }

  addHingeLine(params: {
    readonly horizontalPlaneId: string;
    readonly verticalPlaneId: string;
    readonly hingeLineId?: string;
  }): HingeLine {
    const id = params.hingeLineId || this.context.ids.prefixed('hingeLine');
    const label = this.context.labels.next('HingeLine');
    const hingeLine = new HingeLine(id, label, params.horizontalPlaneId, params.verticalPlaneId);
    this.context.world.putHingeLine(hingeLine);
    this.context.dependencies.registerNode(hingeLine.id, hingeLine.getDependencies());
    return hingeLine;
  }

  addBrokenHingeLine(params: {
    readonly mainHingeId: string;
    readonly auxiliaryPlaneId: string;
    readonly plane1: ProjectionPlane;
    readonly plane2: ProjectionPlane;
    readonly brokenHingeLineId?: string;
    readonly bhhl1Id?: string;
    readonly bhhl2Id?: string;
  }): { brokenHingeLine: BrokenHingeLine; bhhl1: BrokenHalfHingeLine2D; bhhl2: BrokenHalfHingeLine2D } {
    const plane1Id = params.plane1.id;
    const plane2Id = params.plane2.id;
    const bhlId = params.brokenHingeLineId || this.context.ids.prefixed('hingeLine');
    const bhhl1Id = params.bhhl1Id || this.context.projectionConstruction.generateLine2DId(params.plane1);
    const bhhl2Id = params.bhhl2Id || this.context.projectionConstruction.generateLine2DId(params.plane2);

    if (!bhhl1Id.startsWith(plane1Id + '/')) {
      throw new Error(
        `AddBrokenHingeLineOp: bhhl1Id "${bhhl1Id}" does not start with plane1Id "${plane1Id}/". ` +
        'This indicates a parameter mismatch during deserialization.',
      );
    }
    if (!bhhl2Id.startsWith(plane2Id + '/')) {
      throw new Error(
        `AddBrokenHingeLineOp: bhhl2Id "${bhhl2Id}" does not start with plane2Id "${plane2Id}/". ` +
        'This indicates a parameter mismatch during deserialization.',
      );
    }

    const brokenHingeLine = new BrokenHingeLine(
      bhlId,
      this.context.labels.next('BrokenHingeLine'),
      plane1Id,
      plane2Id,
      params.mainHingeId,
      params.auxiliaryPlaneId,
    );
    const bhhl1 = new BrokenHalfHingeLine2D(
      bhhl1Id,
      plane1Id,
      brokenHingeLine.id,
      params.mainHingeId,
      bhhl2Id,
    );
    const bhhl2 = new BrokenHalfHingeLine2D(
      bhhl2Id,
      plane2Id,
      brokenHingeLine.id,
      params.mainHingeId,
      bhhl1Id,
    );

    this.context.world.putHingeLine(brokenHingeLine);
    params.plane1.addLine(bhhl1);
    params.plane2.addLine(bhhl2);
    this.context.dependencies.registerNode(brokenHingeLine.id, brokenHingeLine.getDependencies());
    this.context.dependencies.registerNode(bhhl1.id, bhhl1.getDependencies());
    this.context.dependencies.registerNode(bhhl2.id, bhhl2.getDependencies());

    return { brokenHingeLine, bhhl1, bhhl2 };
  }
}
