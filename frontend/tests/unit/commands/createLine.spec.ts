/**
 * Tests for CreateLineCommand
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateLineCommand } from '../../../src/commands/CreateLineCommand';
import { resetCounters } from '../../../src/domain/world/IdGenerator';

// Mock worldStore with points and lines
const createMockWorldStore = () => {
  const elements2D = new Map();
  const dependencyGraph = {
    addNode: () => {},
    addEdge: () => {},
    hasNode: () => false
  };
  
  // Add mock points
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
  
  // Add a mock line for parallel/perpendicular tests
  elements2D.set('L001', {
    id: 'L001',
    kind: 'Line2DByTwoPoints',
    planeId: 'P_H',
    point1Id: 'P001',
    point2Id: 'P002'
  });
  
  // Add non-line element for validation tests
  elements2D.set('S001', {
    id: 'S001',
    kind: 'Segment2DByPoints',
    planeId: 'P_H',
    point1Id: 'P001',
    point2Id: 'P002'
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

describe('CreateLineCommand', () => {
  let worldStore: any;

  beforeEach(() => {
    worldStore = createMockWorldStore();
    resetCounters();
  });

  describe('by-two-points variant', () => {
    describe('validation', () => {
      it('should validate valid parameters', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'by-two-points',
              point1Id: 'P001',
              point2Id: 'P002'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(true);
      });

      it('should reject non-existent points', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'by-two-points',
              point1Id: 'NONEXISTENT',
              point2Id: 'P002'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain('does not exist');
      });

      it('should reject same point twice', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'by-two-points',
              point1Id: 'P001',
              point2Id: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain('same point');
      });

      it('should reject points on different planes', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'by-two-points',
              point1Id: 'P001', // P_H
              point2Id: 'P003'  // P_V
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain('same plane');
      });
    });

    describe('execution', () => {
      it('should create Line2DByTwoPoints element', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'by-two-points',
              point1Id: 'P001',
              point2Id: 'P002'
            },
            planeId: 'P_H',
            actionId: 'action-1',
            name: 'Line_AB'
          },
          worldStore
        );

        const result = command.execute();

        expect(result.success).toBe(true);
        
        const line = worldStore.elements2D.get(command.getLineId());
        expect(line).toBeDefined();
        expect(line.kind).toBe('Line2DByTwoPoints');
        expect(line.point1Id).toBe('P001');
        expect(line.point2Id).toBe('P002');
        expect(line.name).toBe('Line_AB');
        expect(line.planeId).toBe('P_H');
        expect(line.infeasible).toBe(false);
      });

      it('should detect coincident points and mark line as infeasible', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'by-two-points',
              point1Id: 'P001',  // (100, 100)
              point2Id: 'P004'   // (100, 100) - same location
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const result = command.execute();

        expect(result.success).toBe(true);
        expect(result.outputs.infeasible).toBe(true);
        
        const line = worldStore.elements2D.get(command.getLineId());
        expect(line.infeasible).toBe(true);
        expect(line.visualStyle.color).toBe('#f44336'); // Red for infeasible
        expect(line.visualStyle.lineStyle).toBe('dashed');
      });

      it('should use blue solid style for feasible lines', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'by-two-points',
              point1Id: 'P001',
              point2Id: 'P002'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        command.execute();
        const line = worldStore.elements2D.get(command.getLineId());

        expect(line.visualStyle.color).toBe('#2196f3'); // Blue
        expect(line.visualStyle.lineStyle).toBe('solid');
        expect(line.visualStyle.opacity).toBe(1.0);
      });
    });
  });

  describe('parallel variant', () => {
    describe('validation', () => {
      it('should validate valid parameters', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'parallel',
              referenceLineId: 'L001',
              throughPointId: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(true);
      });

      it('should reject non-existent reference line', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'parallel',
              referenceLineId: 'NONEXISTENT',
              throughPointId: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain('does not exist');
      });

      it('should reject non-line reference element', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'parallel',
              referenceLineId: 'S001', // This is a segment, not a line
              throughPointId: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain('must be a line');
      });

      it('should reject non-existent through point', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'parallel',
              referenceLineId: 'L001',
              throughPointId: 'NONEXISTENT'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(false);
        expect(validation.error).toContain('does not exist');
      });
    });

    describe('execution', () => {
      it('should create Line2DParallelThroughPoint element', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'parallel',
              referenceLineId: 'L001',
              throughPointId: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1',
            name: 'Line_parallel'
          },
          worldStore
        );

        const result = command.execute();

        expect(result.success).toBe(true);
        
        const line = worldStore.elements2D.get(command.getLineId());
        expect(line).toBeDefined();
        expect(line.kind).toBe('Line2DParallelThroughPoint');
        expect(line.referenceLineId).toBe('L001');
        expect(line.throughPointId).toBe('P001');
        expect(line.name).toBe('Line_parallel');
        expect(line.infeasible).toBe(false);
      });

      it('should use orange style for parallel lines', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'parallel',
              referenceLineId: 'L001',
              throughPointId: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        command.execute();
        const line = worldStore.elements2D.get(command.getLineId());

        expect(line.visualStyle.color).toBe('#ff9800'); // Orange
        expect(line.visualStyle.lineStyle).toBe('solid');
      });
    });
  });

  describe('perpendicular variant', () => {
    describe('validation', () => {
      it('should validate valid parameters', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'perpendicular',
              referenceLineId: 'L001',
              throughPointId: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        const validation = command.validate();
        expect(validation.valid).toBe(true);
      });
    });

    describe('execution', () => {
      it('should create Line2DPerpendicularThroughPoint element', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'perpendicular',
              referenceLineId: 'L001',
              throughPointId: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1',
            name: 'Line_perpendicular'
          },
          worldStore
        );

        const result = command.execute();

        expect(result.success).toBe(true);
        
        const line = worldStore.elements2D.get(command.getLineId());
        expect(line).toBeDefined();
        expect(line.kind).toBe('Line2DPerpendicularThroughPoint');
        expect(line.referenceLineId).toBe('L001');
        expect(line.throughPointId).toBe('P001');
        expect(line.name).toBe('Line_perpendicular');
        expect(line.infeasible).toBe(false);
      });

      it('should use purple style for perpendicular lines', () => {
        const command = new CreateLineCommand(
          {
            method: {
              type: 'perpendicular',
              referenceLineId: 'L001',
              throughPointId: 'P001'
            },
            planeId: 'P_H',
            actionId: 'action-1'
          },
          worldStore
        );

        command.execute();
        const line = worldStore.elements2D.get(command.getLineId());

        expect(line.visualStyle.color).toBe('#9c27b0'); // Purple
        expect(line.visualStyle.lineStyle).toBe('solid');
      });
    });
  });

  describe('undo/redo', () => {
    it('should support undo for by-two-points lines', () => {
      const command = new CreateLineCommand(
        {
          method: {
            type: 'by-two-points',
            point1Id: 'P001',
            point2Id: 'P002'
          },
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();
      const lineId = result.outputs.lineId;
      expect(worldStore.elements2D.has(lineId)).toBe(true);

      command.undo();
      expect(worldStore.elements2D.has(lineId)).toBe(false);
    });

    it('should support redo for parallel lines', () => {
      const command = new CreateLineCommand(
        {
          method: {
            type: 'parallel',
            referenceLineId: 'L001',
            throughPointId: 'P001'
          },
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();
      const lineId = result.outputs.lineId;
      
      command.undo();
      expect(worldStore.elements2D.has(lineId)).toBe(false);

      command.redo();
      expect(worldStore.elements2D.has(lineId)).toBe(true);
    });
  });

  describe('ID generation', () => {
    it('should generate line ID automatically', () => {
      const command = new CreateLineCommand(
        {
          method: {
            type: 'by-two-points',
            point1Id: 'P001',
            point2Id: 'P002'
          },
          planeId: 'P_H',
          actionId: 'action-1'
        },
        worldStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      const lineId = result.outputs.lineId;
      expect(lineId).toBeDefined();
      expect(lineId).toMatch(/^L\d{3}$/); // Pattern: L001, L002, etc.
    });
  });
});
