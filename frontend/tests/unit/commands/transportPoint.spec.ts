/**
 * Tests for TransportPointCommand
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TransportPointCommand } from '../../../src/commands/TransportPointCommand';
import { resetCounters } from '../../../src/domain/world/IdGenerator';

// Mock worldStore with points and guides
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
    x: 100,
    y: 50,
    createdBy: 'action-0',
    infeasible: false,
    visualStyle: {}
  });
  
  elements2D.set('P002', {
    id: 'P002',
    kind: 'Point2DFree',
    planeId: 'P_V',
    x: 200,
    y: 150,
    createdBy: 'action-0',
    infeasible: false,
    visualStyle: {}
  });
  
  // Add guide G001
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
  
  // Add guide elements
  elements2D.set('G001_P1', {
    id: 'G001_P1',
    kind: 'Guide2DPerpendicularToLine',
    planeId: 'P_H',
    referenceLineId: 'HL_HV',
    throughPointId: 'P001',
    createdBy: 'action-1'
  });
  
  elements2D.set('G001_P2', {
    id: 'G001_P2',
    kind: 'Guide2DPerpendicularToLine',
    planeId: 'P_V',
    referenceLineId: 'HL_HV',
    throughPointId: 'P001',
    createdBy: 'action-1'
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

describe('TransportPointCommand', () => {
  let worldStore: any;

  beforeEach(() => {
    worldStore = createMockWorldStore();
    resetCounters();
  });

  describe('successful point transport', () => {
    it('should transport point from P_H to P_V', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P001',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs?.transportedPointId).toBeDefined();
    });

    it('should create Point2DDerived on target plane', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P001',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const transportedPointId = result.outputs?.transportedPointId;
      const transportedPoint = worldStore.elements2D.get(transportedPointId);

      expect(transportedPoint).toBeDefined();
      expect(transportedPoint.kind).toBe('Point2DDerived');
      expect(transportedPoint.planeId).toBe('P_V'); // Opposite of P001's plane
    });

    it('should preserve x-coordinate (guide position)', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P001',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const transportedPointId = result.outputs?.transportedPointId;
      const transportedPoint = worldStore.elements2D.get(transportedPointId);
      const sourcePoint = worldStore.elements2D.get('P001');

      expect(transportedPoint.x).toBe(sourcePoint.x); // Same x
      expect(transportedPoint.y).toBe(sourcePoint.y); // Same y for MVP
    });

    it('should set derived visual style (gray, reduced opacity)', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P001',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const transportedPointId = result.outputs?.transportedPointId;
      const transportedPoint = worldStore.elements2D.get(transportedPointId);

      expect(transportedPoint.visualStyle?.color).toBe('#9e9e9e'); // Gray
      expect(transportedPoint.visualStyle?.opacity).toBe(0.7); // 70% opacity
    });

    it('should transport point from P_V to P_H', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P002', // Point on P_V
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const transportedPointId = result.outputs?.transportedPointId;
      const transportedPoint = worldStore.elements2D.get(transportedPointId);

      expect(result.success).toBe(true);
      expect(transportedPoint.planeId).toBe('P_H'); // Opposite of P002's plane
    });
  });

  describe('name generation', () => {
    it('should generate auto-incremented name (p1, p2, ...)', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P001',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const transportedPoint = worldStore.elements2D.get(result.outputs?.transportedPointId);
      
      expect(transportedPoint.name).toMatch(/^p\d+$/);
    });

    it('should accept custom name', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P001',
          actionId: 'action-2',
          name: 'myPoint'
        },
        worldStore
      );

      const result = command.execute();
      const transportedPoint = worldStore.elements2D.get(result.outputs?.transportedPointId);
      
      expect(transportedPoint.name).toBe('myPoint');
    });
  });

  describe('error handling', () => {
    it('should fail if guide not found', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G999',
          sourcePointId: 'P001',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Guide not found');
    });

    it('should fail if source point not found', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P999',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source point not found');
    });

    it('should fail if source point not on guide plane', () => {
      // Add point on different plane
      worldStore.elements2D.set('P003', {
        id: 'P003',
        kind: 'Point2DFree',
        planeId: 'P_OTHER',
        x: 50,
        y: 50,
        createdBy: 'action-0',
        infeasible: false
      });

      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P003',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not on a plane associated with guide');
    });
  });

  describe('dependency tracking', () => {
    it('should create dependency edges from source point and guides to transported point', () => {
      const dependencyEdges: Array<{ from: string; to: string }> = [];
      
      worldStore.dependencyGraph.addEdge = (from: string, to: string) => {
        dependencyEdges.push({ from, to });
      };

      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P001',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const transportedPointId = result.outputs?.transportedPointId;

      expect(dependencyEdges).toContainEqual({ from: 'P001', to: transportedPointId });
      expect(dependencyEdges).toContainEqual({ from: 'G001_P1', to: transportedPointId });
      expect(dependencyEdges).toContainEqual({ from: 'G001_P2', to: transportedPointId });
    });
  });

  describe('output element IDs', () => {
    it('should return transported point ID', () => {
      const command = new TransportPointCommand(
        {
          guideId: 'G001',
          sourcePointId: 'P001',
          actionId: 'action-2'
        },
        worldStore
      );

      const result = command.execute();
      const outputIds = command.getOutputElementIds();

      expect(outputIds).toHaveLength(1);
      expect(outputIds).toContain(result.outputs?.transportedPointId);
    });
  });
});
