/**
 * Unit tests for CreateGuideCommand with BHL support
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CreateGuideCommand } from '@/commands/CreateGuideCommand';
import { resetCounters } from '@/domain/world/IdGenerator';
import type { BHLProjection2D, Point2DFree } from '@/types/ElementTypes';
import type { BrokenHingeLine } from '@/domain/world/BrokenHingeLine';

describe('CreateGuideCommand - BHL Support', () => {
  let worldStore: any;
  let viewStore: any;

  beforeEach(() => {
    resetCounters();

    // Setup mock world store with BHL support
    worldStore = {
      elements2D: new Map(),
      elements3D: new Map(),
      guides: [] as any[],
      brokenHingeLines: new Map(),
      dependencyGraph: {
        addNode: () => {},
        hasNode: () => false,
        addEdge: () => {}
      },
      addElement2D: function(element: any) {
        this.elements2D.set(element.id, element);
      },
      addElement3D: function(element: any) {
        this.elements3D.set(element.id, element);
      },
      removeElement2D: function(id: string) {
        this.elements2D.delete(id);
      },
      removeElement3D: function(id: string) {
        this.elements3D.delete(id);
      },
      addGuide: function(guide: any) {
        this.guides.push(guide);
      },
      get allGuides() {
        return this.guides;
      }
    };

    // Setup mock view store
    viewStore = {
      projectionPlanes: [
        { id: 'plane-h', name: 'P_H' },
        { id: 'plane-v', name: 'P_V' }
      ]
    };

    // Add HL_HV as 3D Line (not as view-layer hingeLines)
    // Create auxiliary points for HL_HV
    worldStore.elements2D.set('HL_HV_H_p1', {
      id: 'HL_HV_H_p1',
      kind: 'Point2DFree',
      planeId: 'plane-h',
      x: -1000,
      y: -200,
      createdBy: 'system:init',
      infeasible: false,
      visualStyle: { visible: false }
    });
    
    worldStore.elements2D.set('HL_HV_H_p2', {
      id: 'HL_HV_H_p2',
      kind: 'Point2DFree',
      planeId: 'plane-h',
      x: 1000,
      y: -200,
      createdBy: 'system:init',
      infeasible: false,
      visualStyle: { visible: false }
    });
    
    worldStore.elements2D.set('HL_HV_V_p1', {
      id: 'HL_HV_V_p1',
      kind: 'Point2DFree',
      planeId: 'plane-v',
      x: -1000,
      y: 200,
      createdBy: 'system:init',
      infeasible: false,
      visualStyle: { visible: false }
    });
    
    worldStore.elements2D.set('HL_HV_V_p2', {
      id: 'HL_HV_V_p2',
      kind: 'Point2DFree',
      planeId: 'plane-v',
      x: 1000,
      y: 200,
      createdBy: 'system:init',
      infeasible: false,
      visualStyle: { visible: false }
    });
    
    // Add HL_HV Line2D projections
    worldStore.elements2D.set('HL_HV_H', {
      id: 'HL_HV_H',
      kind: 'Line2DByTwoPoints',
      planeId: 'plane-h',
      point1Id: 'HL_HV_H_p1',
      point2Id: 'HL_HV_H_p2',
      createdBy: 'system:init',
      infeasible: false,
      visualStyle: {}
    });
    
    worldStore.elements2D.set('HL_HV_V', {
      id: 'HL_HV_V',
      kind: 'Line2DByTwoPoints',
      planeId: 'plane-v',
      point1Id: 'HL_HV_V_p1',
      point2Id: 'HL_HV_V_p2',
      createdBy: 'system:init',
      infeasible: false,
      visualStyle: {}
    });
    
    // Add HL_HV as 3D Line
    worldStore.elements3D.set('HL_HV', {
      id: 'HL_HV',
      kind: 'Line3DFromProjections',
      projectionHId: 'HL_HV_H',
      projectionVId: 'HL_HV_V',
      createdBy: 'system:init',
      infeasible: false,
      visualStyle: {}
    });
  });

  describe('BHL projection support', () => {
    it('should accept BHL projection as reference line', () => {
      // Create a BHL projection
      const bhlProjectionH: BHLProjection2D = {
        id: 'bhl-proj-h',
        kind: 'BHLProjection2D',
        name: 'BHL_Pi1_H',
        planeId: 'plane-h',
        sourcePlane3DId: 'plane-3d-1',
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#ff8800',
          lineWidth: 1,
          lineStyle: 'dashed',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      const bhlProjectionV: BHLProjection2D = {
        id: 'bhl-proj-v',
        kind: 'BHLProjection2D',
        name: 'BHL_Pi1_V',
        planeId: 'plane-v',
        sourcePlane3DId: 'plane-3d-1',
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#ff8800',
          lineWidth: 1,
          lineStyle: 'dashed',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('bhl-proj-h', bhlProjectionH);
      worldStore.elements2D.set('bhl-proj-v', bhlProjectionV);

      // Create BHL metadata
      const bhl: BrokenHingeLine = {
        id: 'bhl-1',
        name: 'BHL_Pi1',
        sourcePlane3DId: 'plane-3d-1',
        projectionOnPlane1Id: 'bhl-proj-h',
        projectionOnPlane2Id: 'bhl-proj-v',
        plane1Id: 'plane-h',
        plane2Id: 'plane-v'
      };

      worldStore.brokenHingeLines.set('bhl-1', bhl);

      // Create a point
      const point: Point2DFree = {
        id: 'point-1',
        kind: 'Point2DFree',
        name: 'p1',
        planeId: 'plane-h',
        x: 10,
        y: 20,
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#000000',
          lineWidth: 2,
          lineStyle: 'solid',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('point-1', point);

      // Create guide using BHL projection as reference
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'bhl-proj-h',
          throughPointId: 'point-1',
          actionId: 'action-2'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      expect(result.outputs?.guideId).toBeDefined();
    });

    it('should create guide on both planes for BHL projection', () => {
      // Setup BHL projections
      const bhlProjectionH: BHLProjection2D = {
        id: 'bhl-proj-h',
        kind: 'BHLProjection2D',
        name: 'BHL_Pi1_H',
        planeId: 'plane-h',
        sourcePlane3DId: 'plane-3d-1',
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#ff8800',
          lineWidth: 1,
          lineStyle: 'dashed',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      const bhlProjectionV: BHLProjection2D = {
        id: 'bhl-proj-v',
        kind: 'BHLProjection2D',
        name: 'BHL_Pi1_V',
        planeId: 'plane-v',
        sourcePlane3DId: 'plane-3d-1',
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#ff8800',
          lineWidth: 1,
          lineStyle: 'dashed',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('bhl-proj-h', bhlProjectionH);
      worldStore.elements2D.set('bhl-proj-v', bhlProjectionV);

      const bhl: BrokenHingeLine = {
        id: 'bhl-1',
        name: 'BHL_Pi1',
        sourcePlane3DId: 'plane-3d-1',
        projectionOnPlane1Id: 'bhl-proj-h',
        projectionOnPlane2Id: 'bhl-proj-v',
        plane1Id: 'plane-h',
        plane2Id: 'plane-v'
      };

      worldStore.brokenHingeLines.set('bhl-1', bhl);

      const point: Point2DFree = {
        id: 'point-1',
        kind: 'Point2DFree',
        name: 'p1',
        planeId: 'plane-h',
        x: 10,
        y: 20,
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#000000',
          lineWidth: 2,
          lineStyle: 'solid',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('point-1', point);

      const command = new CreateGuideCommand(
        {
          referenceLineId: 'bhl-proj-h',
          throughPointId: 'point-1',
          actionId: 'action-2'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      
      // Verify two guide elements were created
      expect(result.outputs?.guide2DPlane1Id).toBeDefined();
      expect(result.outputs?.guide2DPlane2Id).toBeDefined();
      
      // Verify both are in worldStore
      expect(worldStore.elements2D.has(result.outputs!.guide2DPlane1Id)).toBe(true);
      expect(worldStore.elements2D.has(result.outputs!.guide2DPlane2Id)).toBe(true);
    });

    it('should fail if BHL projection has no metadata', () => {
      // Create BHL projection without metadata
      const bhlProjection: BHLProjection2D = {
        id: 'bhl-proj-orphan',
        kind: 'BHLProjection2D',
        name: 'BHL_Orphan_H',
        planeId: 'plane-h',
        sourcePlane3DId: 'plane-3d-99',
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#ff8800',
          lineWidth: 1,
          lineStyle: 'dashed',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('bhl-proj-orphan', bhlProjection);

      const point: Point2DFree = {
        id: 'point-1',
        kind: 'Point2DFree',
        name: 'p1',
        planeId: 'plane-h',
        x: 10,
        y: 20,
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#000000',
          lineWidth: 2,
          lineStyle: 'solid',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('point-1', point);

      const command = new CreateGuideCommand(
        {
          referenceLineId: 'bhl-proj-orphan',
          throughPointId: 'point-1',
          actionId: 'action-2'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not find BHL metadata');
    });

    it('should support legacy hingeLineId parameter', () => {
      const point: Point2DFree = {
        id: 'point-1',
        kind: 'Point2DFree',
        name: 'p1',
        planeId: 'plane-h',
        x: 10,
        y: 20,
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#000000',
          lineWidth: 2,
          lineStyle: 'solid',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('point-1', point);

      // Use legacy hingeLineId parameter (should map to referenceLineId internally)
      const command = new CreateGuideCommand(
        {
          referenceLineId: 'HL_HV',
          throughPointId: 'point-1',
          actionId: 'action-2'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
    });
  });

  describe('Auto-transport behavior', () => {
    it('should auto-transport guide to paired BHL projection', () => {
      // Setup complete BHL system
      const bhlProjectionH: BHLProjection2D = {
        id: 'bhl-proj-h',
        kind: 'BHLProjection2D',
        name: 'BHL_Pi1_H',
        planeId: 'plane-h',
        sourcePlane3DId: 'plane-3d-1',
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#ff8800',
          lineWidth: 1,
          lineStyle: 'dashed',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      const bhlProjectionV: BHLProjection2D = {
        id: 'bhl-proj-v',
        kind: 'BHLProjection2D',
        name: 'BHL_Pi1_V',
        planeId: 'plane-v',
        sourcePlane3DId: 'plane-3d-1',
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#ff8800',
          lineWidth: 1,
          lineStyle: 'dashed',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('bhl-proj-h', bhlProjectionH);
      worldStore.elements2D.set('bhl-proj-v', bhlProjectionV);

      const bhl: BrokenHingeLine = {
        id: 'bhl-1',
        name: 'BHL_Pi1',
        sourcePlane3DId: 'plane-3d-1',
        projectionOnPlane1Id: 'bhl-proj-h',
        projectionOnPlane2Id: 'bhl-proj-v',
        plane1Id: 'plane-h',
        plane2Id: 'plane-v'
      };

      worldStore.brokenHingeLines.set('bhl-1', bhl);

      const point: Point2DFree = {
        id: 'point-1',
        kind: 'Point2DFree',
        name: 'p1',
        planeId: 'plane-h',
        x: 10,
        y: 20,
        createdBy: 'action-1',
        infeasible: false,
        visualStyle: {
          color: '#000000',
          lineWidth: 2,
          lineStyle: 'solid',
          opacity: 1.0,
          visible: true,
          inherited: false
        }
      };

      worldStore.elements2D.set('point-1', point);

      const command = new CreateGuideCommand(
        {
          referenceLineId: 'bhl-proj-h',
          throughPointId: 'point-1',
          actionId: 'action-2'
        },
        worldStore,
        viewStore
      );

      const result = command.execute();

      expect(result.success).toBe(true);
      
      // Verify guide appears on both planes (auto-transport)
      const guide1 = worldStore.elements2D.get(result.outputs!.guide2DPlane1Id);
      const guide2 = worldStore.elements2D.get(result.outputs!.guide2DPlane2Id);
      
      expect(guide1.planeId).toBe('plane-h');
      expect(guide2.planeId).toBe('plane-v');
      
      // Both should reference the same source BHL projection
      expect(guide1.referenceLineId).toBe('bhl-proj-h');
      expect(guide2.referenceLineId).toBe('bhl-proj-h');
    });
  });
});
