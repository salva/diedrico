/**
 * Tests for CreateSegmentCommand
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateSegmentCommand } from '../../../src/commands/CreateSegmentCommand';
import { resetCounters } from '../../../src/domain/world/IdGenerator';

// Mock worldStore with points
const createMockWorldStore = () => {
  const elements2D = new Map();
  const dependencyGraph = {
    addNode: () => {},
    addEdge: () => {},
    hasNode: () => false
  };
  
  // Add mock points for testing
  elements2D.set('P001', {
    id: 'P001',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: 100,
    y: 100
  });
  
  elements2D.set('P002', {
    id: 'P002',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: 200,
    y: 200
  });
  
  elements2D.set('P003', {
    id: 'P003',
    kind: 'Point2DFree',
    planeId: 'P_V',
    x: 150,
    y: 150
  });
  
  elements2D.set('P004', {
    id: 'P004',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: 100,  // Same location as P001
    y: 100
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

describe('CreateSegmentCommand', () => {
  let worldStore: any;

  beforeEach(() => {
    worldStore = createMockWorldStore();
    resetCounters();
  });

  describe('validation', () => {
    it('should validate valid parameters', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P002',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(true);
    });

    it('should reject non-existent point1', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'NONEXISTENT',
          point2Id: 'P002',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('does not exist');
    });

    it('should reject non-existent point2', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'NONEXISTENT',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('does not exist');
    });

    it('should reject points on different planes', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001', // on P_H
          point2Id: 'P003', // on P_V
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('same plane');
    });

    it('should reject same point for both endpoints', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P001', // Same as point1
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const validation = command.validate();
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('same point');
    });
  });

  describe('execution', () => {
    it('should create a Segment2DByPoints element', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P002',
          planeId: 'P_H',
          actionId: 'action-1',
          name: 'AB'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(worldStore.elements2D.size).toBe(5); // 4 mock points + 1 segment
      
      const segment = worldStore.elements2D.get(command.getSegmentId());
      expect(segment).toBeDefined();
      expect(segment.kind).toBe('Segment2DByPoints');
      expect(segment.point1Id).toBe('P001');
      expect(segment.point2Id).toBe('P002');
      expect(segment.name).toBe('AB');
      expect(segment.planeId).toBe('P_H');
    });

    it('should generate segment ID automatically', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P002',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      const segmentId = result.outputs.segmentId;
      expect(segmentId).toBeDefined();
      expect(segmentId).toMatch(/^S\d{3}$/); // Pattern: S001, S002, etc.
    });

    it('should return segmentId, elementPath, and infeasibility status', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P002',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs.segmentId).toBeDefined();
      expect(result.outputs.elementPath).toBe(`/world/elements2D/${result.outputs.segmentId}`);
      expect(result.outputs.infeasible).toBeDefined();
      expect(result.outputs.infeasible).toBe(false); // P001 and P002 are not coincident
    });
  });

  describe('infeasibility - coincident points', () => {
    it('should detect coincident points and mark segment as infeasible', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',  // (100, 100)
          point2Id: 'P004',  // (100, 100) - same location
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs.infeasible).toBe(true);
      
      const segment = worldStore.elements2D.get(command.getSegmentId());
      expect(segment.infeasible).toBe(true);
    });

    it('should use red dashed style for infeasible segments', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P004',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      command.execute();
      const segment = worldStore.elements2D.get(command.getSegmentId());

      expect(segment.visualStyle.color).toBe('#f44336'); // Red
      expect(segment.visualStyle.lineStyle).toBe('dashed');
      expect(segment.visualStyle.opacity).toBe(0.6);
    });

    it('should use green solid style for feasible segments', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P002',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      command.execute();
      const segment = worldStore.elements2D.get(command.getSegmentId());

      expect(segment.visualStyle.color).toBe('#4caf50'); // Green
      expect(segment.visualStyle.lineStyle).toBe('solid');
      expect(segment.visualStyle.opacity).toBe(1.0);
    });
  });

  describe('undo/redo', () => {
    it('should support undo by rolling back operations', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P002',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      command.execute();
      expect(worldStore.elements2D.size).toBe(5);

      command.undo();
      expect(worldStore.elements2D.size).toBe(4); // Back to just points
    });

    it('should support redo by re-executing operations', () => {
      const command = new CreateSegmentCommand(
        {
          point1Id: 'P001',
          point2Id: 'P002',
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();
      const segmentId = result.outputs.segmentId;
      
      command.undo();
      expect(worldStore.elements2D.size).toBe(4);

      command.redo();
      expect(worldStore.elements2D.size).toBe(5);
      expect(worldStore.elements2D.has(segmentId)).toBe(true);
    });
  });
});
