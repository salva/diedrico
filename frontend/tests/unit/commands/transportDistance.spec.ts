/**
 * Tests for TransportDistanceCommand
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TransportDistanceCommand } from '../../../src/commands/TransportDistanceCommand';
import { resetCounters } from '../../../src/domain/world/IdGenerator';

// Mock worldStore
const createMockWorldStore = () => {
  const elements2D = new Map();
  const guides = new Map();
  const dependencyGraph = {
    addNode: () => {},
    addEdge: () => {},
    hasNode: () => false
  };
  
  // Add mock points on P_H
  elements2D.set('P001', {
    id: 'P001',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: 50,
    y: 100,
    createdBy: 'action-0'
  });
  
  elements2D.set('P002', {
    id: 'P002',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: 150,
    y: 100,
    createdBy: 'action-0'
  });
  
  elements2D.set('P003', {
    id: 'P003',
    kind: 'Point2DFree',
    planeId: 'P_V',
    x: 200,
    y: 50,
    createdBy: 'action-0'
  });
  
  // Add guide
  const guide1 = {
    id: 'G001',
    name: 'g1',
    referenceLineId: 'HL_HV',
    sourcePointId: 'P001',
    guide2DInPlane1Id: 'G001_P1',
    guide2DInPlane2Id: 'G001_P2',
    plane1Id: 'P_H',
    plane2Id: 'P_V'
  };
  guides.set('G001', guide1);
  
  elements2D.set('G001_P1', {
    id: 'G001_P1',
    kind: 'Guide2DPerpendicularToLine',
    planeId: 'P_H'
  });
  
  elements2D.set('G001_P2', {
    id: 'G001_P2',
    kind: 'Guide2DPerpendicularToLine',
    planeId: 'P_V'
  });
  
  return {
    elements2D,
    guides,
    dependencyGraph,
    addElement2D: (element: any) => {
      elements2D.set(element.id, element);
    },
    removeElement2D: (id: string) => {
      elements2D.delete(id);
    },
    getGuide: (id: string) => guides.get(id)
  };
};

describe('TransportDistanceCommand', () => {
  let worldStore: any;

  beforeEach(() => {
    worldStore = createMockWorldStore();
    resetCounters();
  });

  describe('successful distance transport', () => {
    it('should transport distance from P_H to P_V', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P001',
          point2Id: 'P002',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs?.transportedPoint1Id).toBeDefined();
      expect(result.outputs?.transportedPoint2Id).toBeDefined();
      expect(result.outputs?.transportedSegmentId).toBeDefined();
    });

    it('should create two Point2DDerived on target plane', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P001',
          point2Id: 'P002',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const point1 = worldStore.elements2D.get(result.outputs?.transportedPoint1Id);
      const point2 = worldStore.elements2D.get(result.outputs?.transportedPoint2Id);

      expect(point1.kind).toBe('Point2DDerived');
      expect(point2.kind).toBe('Point2DDerived');
      expect(point1.planeId).toBe('P_V');
      expect(point2.planeId).toBe('P_V');
    });

    it('should create Segment2D connecting transported points', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P001',
          point2Id: 'P002',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const segment = worldStore.elements2D.get(result.outputs?.transportedSegmentId);

      expect(segment.kind).toBe('Segment2DByPoints');
      expect(segment.point1Id).toBe(result.outputs?.transportedPoint1Id);
      expect(segment.point2Id).toBe(result.outputs?.transportedPoint2Id);
      expect(segment.planeId).toBe('P_V');
    });

    it('should set derived visual style on all elements', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P001',
          point2Id: 'P002',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const point1 = worldStore.elements2D.get(result.outputs?.transportedPoint1Id);
      const segment = worldStore.elements2D.get(result.outputs?.transportedSegmentId);

      expect(point1.visualStyle?.color).toBe('#9e9e9e');
      expect(point1.visualStyle?.opacity).toBe(0.7);
      expect(segment.visualStyle?.color).toBe('#9e9e9e');
      expect(segment.visualStyle?.opacity).toBe(0.7);
      expect(segment.visualStyle?.lineStyle).toBe('dashed');
    });

    it('should preserve distance (same length)', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P001',
          point2Id: 'P002',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const sourceP1 = worldStore.elements2D.get('P001');
      const sourceP2 = worldStore.elements2D.get('P002');
      const transportedP1 = worldStore.elements2D.get(result.outputs?.transportedPoint1Id);
      const transportedP2 = worldStore.elements2D.get(result.outputs?.transportedPoint2Id);

      const sourceDistance = Math.sqrt(
        Math.pow(sourceP2.x - sourceP1.x, 2) + Math.pow(sourceP2.y - sourceP1.y, 2)
      );
      const transportedDistance = Math.sqrt(
        Math.pow(transportedP2.x - transportedP1.x, 2) + Math.pow(transportedP2.y - transportedP1.y, 2)
      );

      expect(transportedDistance).toBeCloseTo(sourceDistance, 1);
    });
  });

  describe('error handling', () => {
    it('should fail if guide not found', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G999',
          point1Id: 'P001',
          point2Id: 'P002',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Guide not found');
    });

    it('should fail if point1 not found', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P999',
          point2Id: 'P002',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Point 1 not found');
    });

    it('should fail if point2 not found', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P001',
          point2Id: 'P999',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Point 2 not found');
    });

    it('should fail if points on different planes', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P001', // on P_H
          point2Id: 'P003', // on P_V
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be on the same plane');
    });
  });

  describe('output element IDs', () => {
    it('should return all three element IDs', () => {
      const command = new TransportDistanceCommand(
        {
          guideId: 'G001',
          point1Id: 'P001',
          point2Id: 'P002',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const outputIds = command.getOutputElementIds();

      expect(outputIds).toHaveLength(3);
      expect(outputIds).toContain(result.outputs?.transportedPoint1Id);
      expect(outputIds).toContain(result.outputs?.transportedPoint2Id);
      expect(outputIds).toContain(result.outputs?.transportedSegmentId);
    });
  });
});
