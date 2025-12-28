/**
 * Tests for CreateGuideCommand
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateGuideCommand } from '../../../src/commands/CreateGuideCommand';
import { resetCounters } from '../../../src/domain/world/IdGenerator';

// Mock worldStore with points, lines, and guides
const createMockWorldStore = () => {
  const elements2D = new Map();
  const elements3D = new Map();
  const guides = new Map();
  const dependencyGraph = {
    addNode: () => {},
    addEdge: () => {},
    hasNode: () => false
  };
  
  // Add auxiliary points for HL_HV line
  elements2D.set('HL_HV_H_p1', {
    id: 'HL_HV_H_p1',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: -1000,
    y: -200,
    createdBy: 'system:init',
    infeasible: false,
    visualStyle: { visible: false }
  });
  
  elements2D.set('HL_HV_H_p2', {
    id: 'HL_HV_H_p2',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: 1000,
    y: -200,
    createdBy: 'system:init',
    infeasible: false,
    visualStyle: { visible: false }
  });
  
  elements2D.set('HL_HV_V_p1', {
    id: 'HL_HV_V_p1',
    kind: 'Point2DFree',
    planeId: 'P_V',
    x: -1000,
    y: 200,
    createdBy: 'system:init',
    infeasible: false,
    visualStyle: { visible: false }
  });
  
  elements2D.set('HL_HV_V_p2', {
    id: 'HL_HV_V_p2',
    kind: 'Point2DFree',
    planeId: 'P_V',
    x: 1000,
    y: 200,
    createdBy: 'system:init',
    infeasible: false,
    visualStyle: { visible: false }
  });
  
  // Add HL_HV Line2D projections
  elements2D.set('HL_HV_H', {
    id: 'HL_HV_H',
    kind: 'Line2DByTwoPoints',
    planeId: 'P_H',
    point1Id: 'HL_HV_H_p1',
    point2Id: 'HL_HV_H_p2',
    createdBy: 'system:init',
    infeasible: false,
    visualStyle: {}
  });
  
  elements2D.set('HL_HV_V', {
    id: 'HL_HV_V',
    kind: 'Line2DByTwoPoints',
    planeId: 'P_V',
    point1Id: 'HL_HV_V_p1',
    point2Id: 'HL_HV_V_p2',
    createdBy: 'system:init',
    infeasible: false,
    visualStyle: {}
  });
  
  // Add HL_HV as 3D Line
  elements3D.set('HL_HV', {
    id: 'HL_HV',
    kind: 'Line3DFromProjections',
    projectionHId: 'HL_HV_H',
    projectionVId: 'HL_HV_V',
    createdBy: 'system:init',
    infeasible: false,
    visualStyle: {}
  });
  
  // Add mock points
  elements2D.set('P001', {
    id: 'P001',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: 100,
    y: 100,
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
  
  elements2D.set('P003', {
    id: 'P003',
    kind: 'Point2DFree',
    planeId: 'P_H',
    x: -50,
    y: 75,
    createdBy: 'action-0',
    infeasible: false,
    visualStyle: {}
  });
  
  return {
    elements2D,
    elements3D,
    guides,
    dependencyGraph,
    get allGuides() {
      return Array.from(guides.values());
    },
    addElement2D: (element: any) => {
      elements2D.set(element.id, element);
    },
    removeElement2D: (id: string) => {
      elements2D.delete(id);
    },
    addElement3D: (element: any) => {
      elements3D.set(element.id, element);
    },
    addGuide: (guide: any) => {
      guides.set(guide.id, guide);
    },
    removeGuide: (id: string) => {
      guides.delete(id);
    },
    getGuide: (id: string) => guides.get(id)
  };
};

// Mock viewStore (simplified, no longer needs hinge lines)
const createMockViewStore = () => {
  return {
    activePlaneId: 'P_H',
    planes: [
      { id: 'P_H', name: 'Horizontal Plane', isVisible: true },
      { id: 'P_V', name: 'Vertical Plane', isVisible: true }
    ]
  };
};

describe('CreateGuideCommand', () => {
  let worldStore: any;
  let viewStore: any;

  beforeEach(() => {
    worldStore = createMockWorldStore();
    viewStore = createMockViewStore();
    resetCounters();
  });

  describe('successful guide creation', () => {
    it('should create a guide from HL_HV through point P001', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs?.guideId).toBeDefined();
      expect(result.outputs?.guide2DPlane1Id).toBeDefined();
      expect(result.outputs?.guide2DPlane2Id).toBeDefined();
    });

    it('should create two Guide2D elements (one per plane)', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      command.execute();

      // Check that two guide elements were added
      const guideElements = Array.from(worldStore.elements2D.values()).filter(
        (el: any) => el.kind === 'Guide2DPerpendicularToLine'
      );

      expect(guideElements).toHaveLength(2);
    });

    it('should store Guide entity in worldStore', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();
      const guideId = result.outputs?.guideId;

      expect(worldStore.getGuide(guideId)).toBeDefined();
      const guide = worldStore.getGuide(guideId);
      expect(guide.referenceLineId).toBe('HL_HV');
      expect(guide.sourcePointId).toBe('P001');
      expect(guide.plane1Id).toBe('P_H');
      expect(guide.plane2Id).toBe('P_V');
    });

    it('should create guides on correct planes', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      command.execute();

      const guideElements = Array.from(worldStore.elements2D.values()).filter(
        (el: any) => el.kind === 'Guide2DPerpendicularToLine'
      );

      const planeIds = guideElements.map((el: any) => el.planeId);
      expect(planeIds).toContain('P_H');
      expect(planeIds).toContain('P_V');
    });

    it('should set guide visual style (green, dashed)', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      command.execute();

      const guideElements = Array.from(worldStore.elements2D.values()).filter(
        (el: any) => el.kind === 'Guide2DPerpendicularToLine'
      );

      expect((guideElements[0] as any).visualStyle?.color).toBe('#00aa00');
      expect((guideElements[0] as any).visualStyle?.lineStyle).toBe('dashed');
    });

    it('should reference the through point in guide elements', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      command.execute();

      const guideElements = Array.from(worldStore.elements2D.values()).filter(
        (el: any) => el.kind === 'Guide2DPerpendicularToLine'
      );

      expect((guideElements[0] as any).throughPointId).toBe('P001');
      expect((guideElements[1] as any).throughPointId).toBe('P001');
    });
  });

  describe('name generation', () => {
    it('should generate auto-incremented names (g1, g2, ...)', () => {
      const command1 = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      const result1 = command1.execute();
      const guide1 = worldStore.getGuide(result1.outputs?.guideId);
      expect(guide1.name).toBe('g1');

      const command2 = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P002',
          actionId: 'action-2'
        },
        worldStore,
        viewStore
      );

      const result2 = command2.execute();
      const guide2 = worldStore.getGuide(result2.outputs?.guideId);
      expect(guide2.name).toBe('g2');
    });

    it('should accept custom name', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1',
          name: 'myGuide'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();
      const guide = worldStore.getGuide(result.outputs?.guideId);
      expect(guide.name).toBe('myGuide');
    });
  });

  describe('error handling', () => {
    it('should fail if hinge line not found', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_INVALID',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reference line not found');
    });

    it('should fail if point not found', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P999',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Point not found');
    });
  });

  describe('dependency tracking', () => {
    it('should create dependency edges from point to both guide elements', () => {
      const dependencyEdges: Array<{ from: string; to: string }> = [];
      
      worldStore.dependencyGraph.addEdge = (from: string, to: string) => {
        dependencyEdges.push({ from, to });
      };

      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      const guide2DPlane1Id = result.outputs?.guide2DPlane1Id;
      const guide2DPlane2Id = result.outputs?.guide2DPlane2Id;

      expect(dependencyEdges).toContainEqual({ from: 'P001', to: guide2DPlane1Id });
      expect(dependencyEdges).toContainEqual({ from: 'P001', to: guide2DPlane2Id });
    });
  });

  describe('output element IDs', () => {
    it('should return both guide element IDs', () => {
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'P001',
          actionId: 'action-1'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();
      const outputIds = command.getOutputElementIds();

      expect(outputIds).toHaveLength(2);
      expect(outputIds).toContain(result.outputs?.guide2DPlane1Id);
      expect(outputIds).toContain(result.outputs?.guide2DPlane2Id);
    });
  });
});
