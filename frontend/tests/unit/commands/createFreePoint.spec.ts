/**
 * Tests for CreateFreePointCommand
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateFreePointCommand } from '../../../src/commands/CreateFreePointCommand';
import { resetCounters } from '../../../src/domain/world/IdGenerator';

// Mock worldStore
const createMockWorldStore = () => {
  const elements2D = new Map();
  const dependencyGraph = {
    addNode: () => {},
    addEdge: () => {},
    hasNode: () => false
  };
  
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

describe('CreateFreePointCommand', () => {
  let worldStore: any;

  beforeEach(() => {
    worldStore = createMockWorldStore();
    resetCounters();
  });

  describe('validation', () => {
    it('should validate valid parameters', () => {
      const command = new CreateFreePointCommand(
        {
          x: 100,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(true);
    });

    it('should reject infinite coordinates', () => {
      const command = new CreateFreePointCommand(
        {
          x: Infinity,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('finite');
    });

    it('should reject NaN coordinates', () => {
      const command = new CreateFreePointCommand(
        {
          x: NaN,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
    });
  });

  describe('execution', () => {
    it('should create a Point2DFree element', () => {
      const command = new CreateFreePointCommand(
        {
          x: 100,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1',
          name: 'A'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(worldStore.elements2D.size).toBe(1);
      
      const point = worldStore.elements2D.get(command.getPointId());
      expect(point).toBeDefined();
      expect(point.kind).toBe('Point2DFree');
      expect(point.x).toBe(100);
      expect(point.y).toBe(200);
      expect(point.name).toBe('A');
      expect(point.planeId).toBe('P_H');
      expect(point.infeasible).toBe(false);
    });

    it('should generate point ID automatically if not provided', () => {
      const command = new CreateFreePointCommand(
        {
          x: 100,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      const pointId = result.outputs.pointId;
      expect(pointId).toBeDefined();
      expect(pointId).toMatch(/^P\d{3}$/); // Pattern: P001, P002, etc.
    });

    it('should return pointId and elementPath on success', () => {
      const command = new CreateFreePointCommand(
        {
          x: 100,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs.pointId).toBeDefined();
      expect(result.outputs.elementPath).toBe(`/world/elements2D/${result.outputs.pointId}`);
    });

    it('should fail for invalid parameters', () => {
      const command = new CreateFreePointCommand(
        {
          x: Infinity,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(worldStore.elements2D.size).toBe(0);
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const command = new CreateFreePointCommand(
        {
          x: 100,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      command.execute();
      expect(worldStore.elements2D.size).toBe(1);

      command.undo();
      expect(worldStore.elements2D.size).toBe(0);
    });

    it('should support redo by re-executing operations', () => {
      const command = new CreateFreePointCommand(
        {
          x: 100,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();
      const pointId = result.outputs.pointId;
      
      command.undo();
      expect(worldStore.elements2D.size).toBe(0);

      command.redo();
      expect(worldStore.elements2D.size).toBe(1);
      expect(worldStore.elements2D.has(pointId)).toBe(true);
    });
  });

  describe('visual style', () => {
    it('should set default visual style for free points', () => {
      const command = new CreateFreePointCommand(
        {
          x: 100,
          y: 200,
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      command.execute();
      const point = worldStore.elements2D.get(command.getPointId());

      expect(point.visualStyle).toBeDefined();
      expect(point.visualStyle.color).toBe('#2196f3'); // Blue for free points
      expect(point.visualStyle.opacity).toBe(1.0);
      expect(point.visualStyle.visible).toBe(true);
    });
  });
});
