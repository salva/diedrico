import type { LabelGenerator } from './LabelGenerator';
import { Line3DFromProjections } from './Line3D';
import { Plane3DFromTraces } from './Plane';
import { Point3DFromProjections } from './Point3D';
import { Segment3DFromProjections } from './Segment3D';
import type { DependencyRegistrarPort } from './DependencyPorts';
import type { World } from './World';
import type { WorldIdAllocator } from './WorldIdAllocator';

interface ReconstructionConstructionContext {
  readonly world: World;
  readonly dependencies: DependencyRegistrarPort;
  readonly ids: WorldIdAllocator;
  readonly labels: LabelGenerator;
}

export class ReconstructionConstructionService {
  constructor(private readonly context: ReconstructionConstructionContext) {}

  addPointFromProjections(params: {
    readonly projection1Id: string;
    readonly projection2Id: string;
    readonly plane1Id: string;
    readonly plane2Id: string;
    readonly pointId?: string;
    readonly label?: string;
    readonly visualStyle?: any;
  }): Point3DFromProjections {
    const id = params.pointId || this.context.ids.generate3DPointId();
    this.context.ids.reserve3DId(id);
    const label = params.label || this.context.labels.next('Point3D');
    const visualStyle = params.visualStyle || {
      color: '#FF6B35',
      thickness: 0.015,
      visible: true,
    };
    const point = new Point3DFromProjections(
      id,
      label,
      params.projection1Id,
      params.projection2Id,
      params.plane1Id,
      params.plane2Id,
      visualStyle,
    );
    this.context.world.putPoint3D(point);
    this.context.dependencies.registerNode(point.id, point.getDependencies());
    return point;
  }

  addLineFromProjections(params: {
    readonly projection1Id: string;
    readonly projection2Id: string;
    readonly plane1Id: string;
    readonly plane2Id: string;
    readonly lineId?: string;
    readonly label?: string;
    readonly visualStyle?: any;
  }): Line3DFromProjections {
    const id = params.lineId || this.context.ids.generate3DLineId();
    this.context.ids.reserve3DId(id);
    const label = params.label || this.context.labels.next('Line3D');
    const visualStyle = params.visualStyle || {
      color: '#FF6B35',
      thickness: 0.003,
      visible: true,
    };
    const line = new Line3DFromProjections(
      id,
      label,
      params.projection1Id,
      params.projection2Id,
      params.plane1Id,
      params.plane2Id,
      visualStyle,
    );
    this.context.world.putLine3D(line);
    this.context.dependencies.registerNode(line.id, line.getDependencies());
    return line;
  }

  addSegmentFromProjections(params: {
    readonly projection1Id: string;
    readonly projection2Id: string;
    readonly plane1Id: string;
    readonly plane2Id: string;
    readonly segmentId?: string;
    readonly label?: string;
    readonly visualStyle?: any;
  }): Segment3DFromProjections {
    const id = params.segmentId || this.context.ids.generate3DSegmentId();
    this.context.ids.reserve3DId(id);
    const label = params.label || this.context.labels.next('Segment3D');
    const visualStyle = params.visualStyle || {
      color: '#FF6B35',
      thickness: 0.003,
      visible: true,
    };
    const segment = new Segment3DFromProjections(
      id,
      label,
      params.projection1Id,
      params.projection2Id,
      params.plane1Id,
      params.plane2Id,
      visualStyle,
    );
    this.context.world.putSegment3D(segment);
    this.context.dependencies.registerNode(segment.id, segment.getDependencies());
    return segment;
  }

  addPlaneFromTraces(params: {
    readonly trace1Id: string;
    readonly trace2Id: string;
    readonly plane1Id: string;
    readonly plane2Id: string;
    readonly planeId?: string;
    readonly label?: string;
  }): Plane3DFromTraces {
    const id = params.planeId || this.context.ids.generate3DPlaneId();
    this.context.ids.reserve3DId(id);
    const label = params.label || this.context.labels.next('Plane3D');
    const plane = new Plane3DFromTraces(
      id,
      label,
      params.trace1Id,
      params.trace2Id,
      params.plane1Id,
      params.plane2Id,
    );
    this.context.world.putPlane3D(plane);
    this.context.dependencies.registerNode(plane.id, plane.getDependencies());
    return plane;
  }
}
