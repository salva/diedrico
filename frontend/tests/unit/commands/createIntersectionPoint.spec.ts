/**
 * Tests for CreateIntersectionPointCommand
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateIntersectionPointCommand } from '../../../src/commands/CreateIntersectionPointCommand';
import { resetCounters } from '../../../src/domain/world/IdGenerator';

// Mock worldStore
const createMockWorldStore = () => {
  const elements2D = new Map();
  const dependencyGraph = {
    addNode: () => {},
    addEdge: () => {},
    hasNode: () => false
  };
  
  // Add mock elements for testing
  elements2D.set('S001', {
    id: 'S001',
    kind: 'Segment2DByPoints',
    planeId: 'P_H',
    point1Id: 'P001',
    point2Id: 'P002'
  });
  
  elements2D.set('L001', {
    id: 'L001',
    kind: 'Line2DByPoints',
    planeId: 'P_H',
    point1Id: 'P003',
    point2Id: 'P004'
  });
  
  elements2D.set('C001', {
    id: 'C001',
    kind: 'Circle2DCenterRadius',
    planeId: 'P_V',
    centerId: 'P005',
    radius: 50
  });
  
  return {
    elements2D,
    dependencyGraph,
    addElement2D: (element: any) => {
      elements2D.set(element.id, element);
    },
    removeElement2D: (id: string) => {
      elements2D.delete(id);
    }
  };
};

describe('CreateIntersectionPointCommand', () => {
  let worldStore: any;

  beforeEach(() => {
    worldStore = createMockWorldStore();
    resetCounters();
  });

  describe('validation', () => {
    it('should validate valid parameters', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(true);
    });

    it('should reject non-existent element1', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'NONEXISTENT',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('does not exist');
    });

    it('should reject non-existent element2', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'NONEXISTENT',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('does not exist');
    });

    it('should reject elements on different planes', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001', // on P_H
          element2Id: 'C001', // on P_V
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('same plane');
    });

    it('should reject same element for both parameters', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'S001', // Same as element1
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('itself');
    });

    it('should reject invalid intersection index', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 2, // Only 0 or 1 allowed
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('index');
    });
  });

  describe('execution', () => {
    it('should create a Point2DFromIntersection element', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1',
          name: 'I'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      // Account for mock elements + newly created point
      expect(worldStore.elements2D.size).toBe(4); // 3 mock + 1 new
      
      const point = worldStore.elements2D.get(command.getPointId());
      expect(point).toBeDefined();
      expect(point.kind).toBe('Point2DFromIntersection');
      expect(point.element1Id).toBe('S001');
      expect(point.element2Id).toBe('L001');
      expect(point.intersectionIndex).toBe(0);
      expect(point.name).toBe('I');
      expect(point.planeId).toBe('P_H');
    });

    it('should generate point ID automatically', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      const pointId = result.outputs.pointId;
      expect(pointId).toBeDefined();
      expect(pointId).toMatch(/^P\d{3}$/);
    });

    it('should return pointId, elementPath, and infeasibility status', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs.pointId).toBeDefined();
      expect(result.outputs.elementPath).toBe(`/world/elements2D/${result.outputs.pointId}`);
      expect(result.outputs.infeasible).toBeDefined();
    });

    it('should fail for invalid parameters', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'NONEXISTENT',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(worldStore.elements2D.size).toBe(3); // Only mock elements
    });

    it('should support intersection index 1 (second intersection)', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 1, // Second intersection
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      const point = worldStore.elements2D.get(command.getPointId());
      expect(point.intersectionIndex).toBe(1);
    });
  });

  describe('infeasibility', () => {
    it('should mark point as feasible when intersection exists (placeholder)', () => {
      // Note: Actual intersection calculation is TODO
      // For now, all intersections are assumed to exist
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      command.execute();
      const point = worldStore.elements2D.get(command.getPointId());

      // Currently always feasible (placeholder logic)
      expect(point.infeasible).toBe(false);
    });

    it('should use different visual style for infeasible points', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      command.execute();
      const point = worldStore.elements2D.get(command.getPointId());

      expect(point.visualStyle).toBeDefined();
      // Feasible: purple, solid. Infeasible: red, dashed
      if (point.infeasible) {
        expect(point.visualStyle.color).toBe('#f44336');
        expect(point.visualStyle.lineStyle).toBe('dashed');
        expect(point.visualStyle.opacity).toBe(0.6);
      } else {
        expect(point.visualStyle.color).toBe('#9c27b0');
        expect(point.visualStyle.lineStyle).toBe('solid');
        expect(point.visualStyle.opacity).toBe(1.0);
      }
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      command.execute();
      expect(worldStore.elements2D.size).toBe(4); // 3 mock + 1 new

      command.undo();
      expect(worldStore.elements2D.size).toBe(3); // Back to mock only
    });

    it('should support redo by re-executing operations', () => {
      const command = new CreateIntersectionPointCommand(
        {
          element1Id: 'S001',
          element2Id: 'L001',
          intersectionIndex: 0,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();
      const pointId = result.outputs.pointId;
      
      command.undo();
      expect(worldStore.elements2D.size).toBe(3);

      command.redo();
      expect(worldStore.elements2D.size).toBe(4);
      expect(worldStore.elements2D.has(pointId)).toBe(true);
    });
  });
});
