/**
 * ProjectService - Handles project serialization/deserialization and API communication
 * 
 * Provides methods to:
 * - Serialize World state to JSON format (for saving)
 * - Deserialize JSON to reconstruct World (for loading)
 * - Communicate with backend API for CRUD operations
 * 
 * Reference: specs/001-dihedral-learning-mvp/contracts/api.yaml
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Project Serialization
 */

import { Vector3, Vector4 } from 'three';
import type { World } from '@/domain/world/World';
import type { Point2D, FreePoint2D, IntersectionPoint2D } from '@/domain/world/Point';
import type { Line2DByTwoPoints } from '@/domain/world/Line';
import type { Segment2DByPoints } from '@/domain/world/Segment';
import type { Guide2D } from '@/domain/world/Guide';
import type { Circle2D } from '@/domain/world/Circle';
import type { ProcessTree } from '@/domain/processTree/ProcessTree';

/**
 * Project data structure matching API schema
 */
export interface ProjectData {
  id: string;
  name: string;
  schemaVersion: string;
  created: string;
  modified: string;
  world: SerializedWorld;
}

/**
 * Serialized World state
 */
interface SerializedWorld {
  points: SerializedPoint[];
  lines: SerializedLine[];
  segments: SerializedSegment[];
  guides: SerializedGuide[];
  circles: SerializedCircle[];
  processTree: SerializedProcessTree;
}

interface SerializedPoint {
  id: string;
  type: 'free' | 'intersection';
  planeId: string;
  label?: string;
  visible: boolean;
  // Free point specific
  position?: { x: number; y: number; z: number };
  // Intersection point specific
  element1Id?: string;
  element2Id?: string;
  index?: number;
}

interface SerializedLine {
  id: string;
  type: 'by-two-points';
  planeId: string;
  label?: string;
  visible: boolean;
  point1Id: string;
  point2Id: string;
}

interface SerializedSegment {
  id: string;
  planeId: string;
  label?: string;
  visible: boolean;
  point1Id: string;
  point2Id: string;
}

interface SerializedGuide {
  id: string;
  type: 'perpendicular-to-line' | 'by-point-and-direction';
  planeId: string;
  label?: string;
  visible: boolean;
  lineId?: string;
  pointId?: string;
  direction?: { x: number; y: number; z: number };
}

interface SerializedCircle {
  id: string;
  type: string;
  planeId: string;
  label?: string;
  visible: boolean;
  centerId?: string;
  radiusPointId?: string;
  radius?: number;
  point1Id?: string;
  point2Id?: string;
  point3Id?: string;
}

interface SerializedProcessTree {
  root: any; // ProcessTree root structure
  version: number;
}

export class ProjectService {
  private static readonly SCHEMA_VERSION = '1.0.0';

  /**
   * Serialize World to JSON
   */
  static serializeWorld(world: World, projectName: string): ProjectData {
    const now = new Date().toISOString();
    
    return {
      id: this.generateProjectId(),
      name: projectName,
      schemaVersion: this.SCHEMA_VERSION,
      created: now,
      modified: now,
      world: {
        points: this.serializePoints(world),
        lines: this.serializeLines(world),
        segments: this.serializeSegments(world),
        guides: this.serializeGuides(world),
        circles: this.serializeCircles(world),
        processTree: this.serializeProcessTree(world.getProcessTree())
      }
    };
  }

  /**
   * Deserialize JSON to reconstruct World
   */
  static deserializeWorld(data: ProjectData): World {
    // Validate schema version
    if (!this.validateSchemaVersion(data.schemaVersion)) {
      throw new Error(`Unsupported schema version: ${data.schemaVersion}`);
    }

    // Create new World instance
    const world = new World();
    
    // Deserialize points first (other elements depend on them)
    this.deserializePoints(data.world.points, world);
    
    // Deserialize other elements
    this.deserializeLines(data.world.lines, world);
    this.deserializeSegments(data.world.segments, world);
    this.deserializeGuides(data.world.guides, world);
    this.deserializeCircles(data.world.circles, world);
    
    // Deserialize ProcessTree
    this.deserializeProcessTree(data.world.processTree, world);
    
    return world;
  }

  /**
   * Validate loaded JSON data structure
   */
  static validateProjectData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    // Check required fields
    const required = ['id', 'name', 'schemaVersion', 'created', 'modified', 'world'];
    for (const field of required) {
      if (!(field in data)) {
        console.error(`[ProjectService] Missing required field: ${field}`);
        return false;
      }
    }
    
    // Check world structure
    if (!data.world || typeof data.world !== 'object') {
      console.error('[ProjectService] Invalid world structure');
      return false;
    }
    
    const worldFields = ['points', 'lines', 'segments', 'guides', 'circles', 'processTree'];
    for (const field of worldFields) {
      if (!(field in data.world)) {
        console.error(`[ProjectService] Missing world field: ${field}`);
        return false;
      }
    }
    
    return true;
  }

  // Private serialization methods
  
  private static serializePoints(world: World): SerializedPoint[] {
    const points: SerializedPoint[] = [];
    
    for (const point of world.points.values()) {
      const serialized: SerializedPoint = {
        id: point.id,
        type: point.type,
        planeId: point.planeId,
        label: point.label,
        visible: point.visible
      };
      
      if (point.type === 'free') {
        const freePoint = point as FreePoint2D;
        serialized.position = {
          x: freePoint.position.x,
          y: freePoint.position.y,
          z: freePoint.position.z
        };
      } else if (point.type === 'intersection') {
        const intPoint = point as IntersectionPoint2D;
        serialized.element1Id = intPoint.element1Id;
        serialized.element2Id = intPoint.element2Id;
        serialized.index = intPoint.index;
      }
      
      points.push(serialized);
    }
    
    return points;
  }

  private static serializeLines(world: World): SerializedLine[] {
    const lines: SerializedLine[] = [];
    
    for (const line of world.lines.values()) {
      if (line.type === 'by-two-points') {
        const byTwoPoints = line as Line2DByTwoPoints;
        lines.push({
          id: line.id,
          type: 'by-two-points',
          planeId: line.planeId,
          label: line.label,
          visible: line.visible,
          point1Id: byTwoPoints.point1Id,
          point2Id: byTwoPoints.point2Id
        });
      }
    }
    
    return lines;
  }

  private static serializeSegments(world: World): SerializedSegment[] {
    const segments: SerializedSegment[] = [];
    
    for (const segment of world.segments.values()) {
      segments.push({
        id: segment.id,
        planeId: segment.planeId,
        label: segment.label,
        visible: segment.visible,
        point1Id: segment.point1Id,
        point2Id: segment.point2Id
      });
    }
    
    return segments;
  }

  private static serializeGuides(world: World): SerializedGuide[] {
    const guides: SerializedGuide[] = [];
    
    for (const guide of world.guides.values()) {
      const serialized: SerializedGuide = {
        id: guide.id,
        type: guide.type,
        planeId: guide.planeId,
        label: guide.label,
        visible: guide.visible
      };
      
      if (guide.type === 'perpendicular-to-line') {
        serialized.lineId = guide.lineId;
        serialized.pointId = guide.pointId;
      }
      
      guides.push(serialized);
    }
    
    return guides;
  }

  private static serializeCircles(world: World): SerializedCircle[] {
    const circles: SerializedCircle[] = [];
    
    for (const circle of world.circles.values()) {
      const serialized: SerializedCircle = {
        id: circle.id,
        type: circle.type,
        planeId: circle.planeId,
        label: circle.label,
        visible: circle.visible
      };
      
      if (circle.type === 'by-center-and-radius') {
        serialized.centerId = circle.centerId;
        serialized.radius = circle.radius;
      } else if (circle.type === 'by-center-and-point') {
        serialized.centerId = circle.centerId;
        serialized.radiusPointId = circle.radiusPointId;
      } else if (circle.type === 'by-three-points') {
        serialized.point1Id = circle.point1Id;
        serialized.point2Id = circle.point2Id;
        serialized.point3Id = circle.point3Id;
      }
      
      circles.push(serialized);
    }
    
    return circles;
  }

  private static serializeProcessTree(processTree: ProcessTree): SerializedProcessTree {
    return {
      root: JSON.parse(JSON.stringify(processTree.root)), // Deep clone
      version: processTree.getVersion()
    };
  }

  // Private deserialization methods
  
  private static deserializePoints(points: SerializedPoint[], world: World): void {
    for (const pointData of points) {
      if (pointData.type === 'free' && pointData.position) {
        const position = new Vector3(
          pointData.position.x,
          pointData.position.y,
          pointData.position.z
        );
        world.addFreePoint2D(pointData.planeId, position, pointData.id);
      } else if (pointData.type === 'intersection' && pointData.element1Id && pointData.element2Id) {
        world.addIntersectionPoint2D(
          pointData.planeId,
          pointData.element1Id,
          pointData.element2Id,
          pointData.index || 0,
          pointData.id
        );
      }
    }
  }

  private static deserializeLines(lines: SerializedLine[], world: World): void {
    for (const lineData of lines) {
      if (lineData.type === 'by-two-points') {
        world.addLine2DBetweenTwoPoints(
          lineData.planeId,
          lineData.point1Id,
          lineData.point2Id,
          lineData.id
        );
      }
    }
  }

  private static deserializeSegments(segments: SerializedSegment[], world: World): void {
    for (const segmentData of segments) {
      world.addSegment2DBetweenPoints(
        segmentData.planeId,
        segmentData.point1Id,
        segmentData.point2Id,
        segmentData.id
      );
    }
  }

  private static deserializeGuides(guides: SerializedGuide[], world: World): void {
    for (const guideData of guides) {
      if (guideData.type === 'perpendicular-to-line' && guideData.lineId && guideData.pointId) {
        world.addGuide2D(
          guideData.planeId,
          guideData.lineId,
          guideData.pointId,
          guideData.id
        );
      }
    }
  }

  private static deserializeCircles(circles: SerializedCircle[], world: World): void {
    for (const circleData of circles) {
      if (circleData.type === 'by-center-and-radius' && circleData.centerId && circleData.radius) {
        world.addCircle2DByCenterAndRadius(
          circleData.planeId,
          circleData.centerId,
          circleData.radius,
          circleData.id
        );
      } else if (circleData.type === 'by-center-and-point' && circleData.centerId && circleData.radiusPointId) {
        world.addCircle2DByCenterAndPoint(
          circleData.planeId,
          circleData.centerId,
          circleData.radiusPointId,
          circleData.id
        );
      } else if (circleData.type === 'by-three-points' && circleData.point1Id && circleData.point2Id && circleData.point3Id) {
        world.addCircle2DByThreePoints(
          circleData.planeId,
          circleData.point1Id,
          circleData.point2Id,
          circleData.point3Id,
          circleData.id
        );
      }
    }
  }

  private static deserializeProcessTree(data: SerializedProcessTree, world: World): void {
    // ProcessTree is reconstructed by actions being recorded during element creation
    // For now, we'll restore the structure directly
    const processTree = world.getProcessTree();
    processTree.root = data.root;
  }

  // Utility methods
  
  private static validateSchemaVersion(version: string): boolean {
    // For now, only accept exact match
    // In future, implement migration logic for older versions
    return version === this.SCHEMA_VERSION;
  }

  private static generateProjectId(): string {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
