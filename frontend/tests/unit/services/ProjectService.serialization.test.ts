/**
 * ProjectService Serialization Tests
 * 
 * Tests that all operation types can be properly serialized and deserialized
 * This ensures that projects can be saved to and loaded from Google Drive without errors
 */

import { describe, it, expect } from 'vitest';
import { ProjectService } from '@/services/ProjectService';

describe('ProjectService - Operation Serialization/Deserialization', () => {
  
  describe('2D Point Operations', () => {
    it('should serialize and deserialize AddFreePoint2D', () => {
      const serialized = {
        opType: 'AddFreePoint2D',
        planeId: 'plane-1',
        position: [1, 2, 0]
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddFreePoint2D');
    });

    it('should serialize and deserialize AddLineLineIntersectionPoint2D', () => {
      const serialized = {
        opType: 'AddLineLineIntersectionPoint2D',
        planeId: 'plane-1',
        line1Id: 'line-1',
        line2Id: 'line-2'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddLineLineIntersectionPoint2D');
    });

    it('should serialize and deserialize AddLineCircleIntersectionPoint2D', () => {
      const serialized = {
        opType: 'AddLineCircleIntersectionPoint2D',
        planeId: 'plane-1',
        lineId: 'line-1',
        circleId: 'circle-1',
        intersectionIndex: 0
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddLineCircleIntersectionPoint2D');
    });

    it('should serialize and deserialize AddCircleCircleIntersectionPoint2D', () => {
      const serialized = {
        opType: 'AddCircleCircleIntersectionPoint2D',
        planeId: 'plane-1',
        circle1Id: 'circle-1',
        circle2Id: 'circle-2',
        intersectionIndex: 0
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddCircleCircleIntersectionPoint2D');
    });

    it('should serialize and deserialize AddSiblingIntersectionPoint2D', () => {
      const serialized = {
        opType: 'AddSiblingIntersectionPoint2D',
        planeId: 'plane-1',
        elementId: 'point-1',
        siblingPlaneId: 'plane-2'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddSiblingIntersectionPoint2D');
    });
  });

  describe('2D Line Operations', () => {
    it('should serialize and deserialize AddLine2DByTwoPoints', () => {
      const serialized = {
        opType: 'AddLine2DByTwoPoints',
        planeId: 'plane-1',
        point1Id: 'point-1',
        point2Id: 'point-2'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddLine2DByTwoPoints');
    });

    it('should serialize and deserialize AddLine2DParallelToLine', () => {
      const serialized = {
        opType: 'AddLine2DParallelToLine',
        planeId: 'plane-1',
        referenceLineId: 'line-1',
        throughPointId: 'point-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddLine2DParallelToLine');
    });

    it('should serialize and deserialize AddLine2DPerpendicularToLine', () => {
      const serialized = {
        opType: 'AddLine2DPerpendicularToLine',
        planeId: 'plane-1',
        referenceLineId: 'line-1',
        throughPointId: 'point-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddLine2DPerpendicularToLine');
    });

    it('should serialize and deserialize AddLine2DTangentToCircleThroughPoint', () => {
      const serialized = {
        opType: 'AddLine2DTangentToCircleThroughPoint',
        planeId: 'plane-1',
        circleId: 'circle-1',
        pointId: 'point-1',
        tangentIndex: 0
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddLine2DTangentToCircleThroughPoint');
    });

    it('should serialize and deserialize AddLine2DTangentToCircleParallelToLine', () => {
      const serialized = {
        opType: 'AddLine2DTangentToCircleParallelToLine',
        planeId: 'plane-1',
        circleId: 'circle-1',
        lineId: 'line-1',
        tangentIndex: 0
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddLine2DTangentToCircleParallelToLine');
    });
  });

  describe('2D Other Element Operations', () => {
    it('should serialize and deserialize AddSegment2DByPoints', () => {
      const serialized = {
        opType: 'AddSegment2DByPoints',
        planeId: 'plane-1',
        point1Id: 'point-1',
        point2Id: 'point-2'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddSegment2DByPoints');
    });

    it('should serialize and deserialize AddCircle2DByCenterAndPoint', () => {
      const serialized = {
        opType: 'AddCircle2DByCenterAndPoint',
        planeId: 'plane-1',
        centerId: 'point-1',
        pointOnCircleId: 'point-2'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddCircle2DByCenterAndPoint');
    });

    it('should serialize and deserialize AddGuide2DPerpendicularToLine', () => {
      const serialized = {
        opType: 'AddGuide2DPerpendicularToLine',
        planeId: 'plane-1',
        referenceLineId: 'line-1',
        throughPointId: 'point-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddGuide2DPerpendicularToLine');
    });

    it('should serialize and deserialize AddSiblingGuide2D', () => {
      const serialized = {
        opType: 'AddSiblingGuide2D',
        planeId: 'plane-1',
        element2DId: 'point-1',
        siblingPlaneId: 'plane-2'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddSiblingGuide2D');
    });
  });

  describe('3D Element Operations', () => {
    it('should serialize and deserialize Add3DPoint', () => {
      const serialized = {
        opType: 'Add3DPoint',
        projection1Id: 'point-1',
        projection2Id: 'point-2',
        plane1Id: 'plane-1',
        plane2Id: 'plane-2',
        label: 'P'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('Add3DPoint');
    });

    it('should serialize and deserialize Add3DLine', () => {
      const serialized = {
        opType: 'Add3DLine',
        projection1Id: 'line-1',
        projection2Id: 'line-2',
        plane1Id: 'plane-1',
        plane2Id: 'plane-2',
        label: 'r'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('Add3DLine');
    });

    it('should serialize and deserialize Add3DSegment', () => {
      const serialized = {
        opType: 'Add3DSegment',
        projection1Id: 'segment-1',
        projection2Id: 'segment-2',
        plane1Id: 'plane-1',
        plane2Id: 'plane-2',
        label: 'AB'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('Add3DSegment');
    });

    it('should serialize and deserialize Add3DPlane', () => {
      const serialized = {
        opType: 'Add3DPlane',
        trace1Id: 'line-1',
        trace2Id: 'line-2',
        plane1Id: 'plane-1',
        plane2Id: 'plane-2',
        label: 'α'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('Add3DPlane');
    });
  });

  describe('Initialization Operations', () => {
    it('should serialize and deserialize CreateInitializationSubprocess', () => {
      const serialized = {
        opType: 'CreateInitializationSubprocess',
        name: 'Initialization'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('CreateInitializationSubprocess');
    });

    it('should serialize and deserialize AddPlane3DFixed', () => {
      const serialized = {
        opType: 'AddPlane3DFixed',
        id: 'plane-1',
        label: 'H',
        normal: [0, 1, 0],
        point: [0, 0, 0]
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddPlane3DFixed');
    });

    it('should serialize and deserialize AddProjectionPlaneFixed', () => {
      const serialized = {
        opType: 'AddProjectionPlaneFixed',
        plane3DId: 'plane-1',
        planeToPaper2D: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        planeTo3D: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        threeDToPlane: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        projPlaneId: 'proj-plane-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddProjectionPlaneFixed');
    });

    it('should serialize and deserialize AddOriginPoint2D', () => {
      const serialized = {
        opType: 'AddOriginPoint2D',
        planeId: 'plane-1',
        hingeLineId: 'hinge-line-1',
        position: [0, 0, 0]
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddOriginPoint2D');
    });

    it('should serialize and deserialize AddHingeLine', () => {
      const serialized = {
        opType: 'AddHingeLine',
        plane1Id: 'plane-1',
        plane2Id: 'plane-2',
        line3DId: 'line-3d-1',
        point3DId: 'point-3d-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddHingeLine');
    });

    it('should serialize and deserialize AddHalfHingeLine2D', () => {
      const serialized = {
        opType: 'AddHalfHingeLine2D',
        planeId: 'plane-1',
        hingeLineId: 'hinge-line-1',
        originPointId: 'point-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddHalfHingeLine2D');
    });

    it('should serialize and deserialize AddBrokenHingeLine', () => {
      const serialized = {
        opType: 'AddBrokenHingeLine',
        mainHingeId: 'hinge-line-1',
        auxiliaryPlaneId: 'aux-plane-1',
        plane1Id: 'plane-1',
        plane2Id: 'plane-2',
        brokenHingeLineId: 'broken-hinge-1',
        bhhl1Id: 'bhhl-1',
        bhhl2Id: 'bhhl-2'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddBrokenHingeLine');
    });

    it('should serialize and deserialize AddAuxiliaryProjectionPlane', () => {
      const serialized = {
        opType: 'AddAuxiliaryProjectionPlane',
        id: 'aux-plane-1',
        label: 'P',
        hingeLineId: 'hinge-line-1',
        trace2DId: 'line-2d-1',
        basePlaneId: 'plane-1',
        otherPlaneId: 'plane-2',
        orientation: 'left'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddAuxiliaryProjectionPlane');
    });
  });

  describe('Remove Operations', () => {
    it('should serialize and deserialize RemovePoint2D', () => {
      const serialized = {
        opType: 'RemovePoint2D',
        planeId: 'plane-1',
        pointId: 'point-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RemovePoint2D');
    });

    it('should serialize and deserialize RemoveLine2D', () => {
      const serialized = {
        opType: 'RemoveLine2D',
        planeId: 'plane-1',
        lineId: 'line-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RemoveLine2D');
    });

    it('should serialize and deserialize RemoveSegment2D', () => {
      const serialized = {
        opType: 'RemoveSegment2D',
        planeId: 'plane-1',
        segmentId: 'segment-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RemoveSegment2D');
    });

    it('should serialize and deserialize RemoveCircle2D', () => {
      const serialized = {
        opType: 'RemoveCircle2D',
        planeId: 'plane-1',
        circleId: 'circle-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RemoveCircle2D');
    });

    it('should serialize and deserialize RemoveGuide2D', () => {
      const serialized = {
        opType: 'RemoveGuide2D',
        planeId: 'plane-1',
        guideId: 'guide-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RemoveGuide2D');
    });
  });

  describe('Update Operations', () => {
    it('should serialize and deserialize UpdateFreePoint2DPosition', () => {
      const serialized = {
        opType: 'UpdateFreePoint2DPosition',
        planeId: 'plane-1',
        pointId: 'point-1',
        newPosition: [5, 10, 0]
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('UpdateFreePoint2DPosition');
    });

    it('should serialize and deserialize UpdateElementStyle', () => {
      const serialized = {
        opType: 'UpdateElementStyle',
        planeId: 'plane-1',
        elementId: 'point-1',
        styleChanges: { color: '#ff0000' }
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('UpdateElementStyle');
    });
  });

  describe('ProcessTree Operations', () => {
    it('should serialize and deserialize PushSubprocess', () => {
      const serialized = {
        opType: 'PushSubprocess',
        name: 'Subprocess 1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('PushSubprocess');
    });

    it('should serialize and deserialize PopSubprocess', () => {
      const serialized = {
        opType: 'PopSubprocess'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('PopSubprocess');
    });

    it('should serialize and deserialize RenameSubprocess', () => {
      const serialized = {
        opType: 'RenameSubprocess',
        path: [0],
        newName: 'New Name'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RenameSubprocess');
    });

    it('should serialize and deserialize ToggleEncapsulation', () => {
      const serialized = {
        opType: 'ToggleEncapsulation',
        path: [0]
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('ToggleEncapsulation');
    });

    it('should serialize and deserialize ToggleOutput', () => {
      const serialized = {
        opType: 'ToggleOutput',
        path: [0],
        outputId: 'output-1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('ToggleOutput');
    });

    it('should serialize and deserialize AddProcessTreeActionGroup', () => {
      const serialized = {
        opType: 'AddProcessTreeActionGroup',
        path: [0],
        name: 'Group 1'
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('AddProcessTreeActionGroup');
    });

    it('should serialize and deserialize RemoveActionFromProcessTree', () => {
      const serialized = {
        opType: 'RemoveActionFromProcessTree',
        path: [0, 1]
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RemoveActionFromProcessTree');
    });

    it('should serialize and deserialize RemoveActionGroupFromProcessTree', () => {
      const serialized = {
        opType: 'RemoveActionGroupFromProcessTree',
        path: [0, 1]
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RemoveActionGroupFromProcessTree');
    });

    it('should serialize and deserialize RemoveSubprocessFromProcessTree', () => {
      const serialized = {
        opType: 'RemoveSubprocessFromProcessTree',
        path: [0]
      };

      const op = ProjectService.reconstructOperation(serialized);
      expect(op).toBeDefined();
      expect(op.type).toBe('RemoveSubprocessFromProcessTree');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown operation type', () => {
      const serialized = {
        opType: 'UnknownOperationType',
        someParam: 'value'
      };

      expect(() => ProjectService.reconstructOperation(serialized)).toThrow('Unknown operation type: UnknownOperationType');
    });
  });
});
