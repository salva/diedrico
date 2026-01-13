/**
 * Unit tests for DependencyService
 * 
 * Tests dependency tracking, querying, and circular dependency detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyService } from '@/services/DependencyService';
import { ProcessTree } from '@/domain/processTree/ProcessTree';
import type { Action } from '@/domain/processTree/Action';

describe('DependencyService', () => {
  let processTree: ProcessTree;
  let dependencyService: DependencyService;

  beforeEach(() => {
    processTree = new ProcessTree();
    dependencyService = new DependencyService(processTree);
  });

  describe('getDependents', () => {
    it('should return empty array for element with no dependents', () => {
      // Create a free point (no dependencies)
      const action: Action = {
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Free point'
      };
      processTree.addAction(action);
      dependencyService.rebuildDependencyMaps();

      const dependents = dependencyService.getDependents('point1');
      expect(dependents).toEqual([]);
    });

    it('should return elements that depend on a base element', () => {
      // Create two free points
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point2'],
        parameters: {},
        description: 'Point 2'
      });

      // Create a line from the two points
      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1', 'point2'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line from points'
      });

      dependencyService.rebuildDependencyMaps();

      const dependentsOfPoint1 = dependencyService.getDependents('point1');
      const dependentsOfPoint2 = dependencyService.getDependents('point2');

      expect(dependentsOfPoint1).toContain('line1');
      expect(dependentsOfPoint2).toContain('line1');
    });

    it('should handle multiple dependents', () => {
      // Create one point
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      // Create two circles from the same center
      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateCircle',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['circle1'],
        parameters: {},
        description: 'Circle 1'
      });

      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateCircle',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['circle2'],
        parameters: {},
        description: 'Circle 2'
      });

      dependencyService.rebuildDependencyMaps();

      const dependents = dependencyService.getDependents('point1');
      expect(dependents).toHaveLength(2);
      expect(dependents).toContain('circle1');
      expect(dependents).toContain('circle2');
    });
  });

  describe('getDependencies', () => {
    it('should return empty array for free element (no dependencies)', () => {
      const action: Action = {
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Free point'
      };
      processTree.addAction(action);
      dependencyService.rebuildDependencyMaps();

      const dependencies = dependencyService.getDependencies('point1');
      expect(dependencies).toEqual([]);
    });

    it('should return dependencies for derived element', () => {
      // Create two points
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point2'],
        parameters: {},
        description: 'Point 2'
      });

      // Create line from points
      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1', 'point2'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line'
      });

      dependencyService.rebuildDependencyMaps();

      const dependencies = dependencyService.getDependencies('line1');
      expect(dependencies).toHaveLength(2);
      expect(dependencies).toContain('point1');
      expect(dependencies).toContain('point2');
    });

    it('should return all direct dependencies for intersection point', () => {
      // Create two lines
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1', 'point2'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point3', 'point4'],
        outputs: ['line2'],
        parameters: {},
        description: 'Line 2'
      });

      // Create intersection
      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateIntersectionPoint',
        timestamp: new Date(),
        inputs: ['line1', 'line2'],
        outputs: ['pointIntersection'],
        parameters: {},
        description: 'Intersection'
      });

      dependencyService.rebuildDependencyMaps();

      const dependencies = dependencyService.getDependencies('pointIntersection');
      expect(dependencies).toHaveLength(2);
      expect(dependencies).toContain('line1');
      expect(dependencies).toContain('line2');
    });
  });

  describe('getAllDependents (transitive closure)', () => {
    it('should return empty array for element with no dependents', () => {
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      dependencyService.rebuildDependencyMaps();

      const allDependents = dependencyService.getAllDependents('point1');
      expect(allDependents).toEqual([]);
    });

    it('should return all transitive dependents in chain', () => {
      // point1 -> line1 -> pointIntersection
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point2'],
        parameters: {},
        description: 'Point 2'
      });

      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1', 'point2'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      processTree.addAction({
        id: 'action4',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: [],
        outputs: ['line2'],
        parameters: {},
        description: 'Line 2'
      });

      processTree.addAction({
        id: 'action5',
        type: 'action',
        actionType: 'CreateIntersectionPoint',
        timestamp: new Date(),
        inputs: ['line1', 'line2'],
        outputs: ['pointIntersection'],
        parameters: {},
        description: 'Intersection'
      });

      dependencyService.rebuildDependencyMaps();

      const allDependents = dependencyService.getAllDependents('point1');
      expect(allDependents).toHaveLength(2);
      expect(allDependents).toContain('line1');
      expect(allDependents).toContain('pointIntersection');
    });

    it('should handle diamond dependency pattern', () => {
      // point1 -> line1 -> pointIntersection
      //        -> line2 ->
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['line2'],
        parameters: {},
        description: 'Line 2'
      });

      processTree.addAction({
        id: 'action4',
        type: 'action',
        actionType: 'CreateIntersectionPoint',
        timestamp: new Date(),
        inputs: ['line1', 'line2'],
        outputs: ['pointIntersection'],
        parameters: {},
        description: 'Intersection'
      });

      dependencyService.rebuildDependencyMaps();

      const allDependents = dependencyService.getAllDependents('point1');
      expect(allDependents).toHaveLength(3);
      expect(allDependents).toContain('line1');
      expect(allDependents).toContain('line2');
      expect(allDependents).toContain('pointIntersection');
    });
  });

  describe('getAllDependencies (transitive closure)', () => {
    it('should return all transitive dependencies', () => {
      // point1, point2 -> line1, line2 -> pointIntersection
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point2'],
        parameters: {},
        description: 'Point 2'
      });

      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1', 'point2'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      processTree.addAction({
        id: 'action4',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: [],
        outputs: ['line2'],
        parameters: {},
        description: 'Line 2'
      });

      processTree.addAction({
        id: 'action5',
        type: 'action',
        actionType: 'CreateIntersectionPoint',
        timestamp: new Date(),
        inputs: ['line1', 'line2'],
        outputs: ['pointIntersection'],
        parameters: {},
        description: 'Intersection'
      });

      dependencyService.rebuildDependencyMaps();

      const allDependencies = dependencyService.getAllDependencies('pointIntersection');
      expect(allDependencies).toHaveLength(4);
      expect(allDependencies).toContain('line1');
      expect(allDependencies).toContain('line2');
      expect(allDependencies).toContain('point1');
      expect(allDependencies).toContain('point2');
    });
  });

  describe('wouldCreateCycle', () => {
    it('should return false for valid dependencies', () => {
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point2'],
        parameters: {},
        description: 'Point 2'
      });

      dependencyService.rebuildDependencyMaps();

      // Adding line1 that depends on point1 and point2 should not create cycle
      const wouldCycle = dependencyService.wouldCreateCycle('point1', 'line1');
      expect(wouldCycle).toBe(false);
    });

    it('should detect direct circular dependency', () => {
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      dependencyService.rebuildDependencyMaps();

      // If line1 depends on point1, and we try to make point1 depend on line1, that's a cycle
      const wouldCycle = dependencyService.wouldCreateCycle('line1', 'point1');
      expect(wouldCycle).toBe(true);
    });

    it('should detect indirect circular dependency', () => {
      // point1 -> line1 -> pointIntersection
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateIntersectionPoint',
        timestamp: new Date(),
        inputs: ['line1'],
        outputs: ['pointIntersection'],
        parameters: {},
        description: 'Intersection'
      });

      dependencyService.rebuildDependencyMaps();

      // If pointIntersection depends on line1, and line1 depends on point1,
      // then making point1 depend on pointIntersection would create a cycle
      const wouldCycle = dependencyService.wouldCreateCycle('pointIntersection', 'point1');
      expect(wouldCycle).toBe(true);
    });
  });

  describe('getActionDependencies', () => {
    it('should return dependency edges for an action', () => {
      const action: Action = {
        id: 'action1',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1', 'point2'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line'
      };

      processTree.addAction(action);
      dependencyService.rebuildDependencyMaps();

      const edges = dependencyService.getActionDependencies('action1');
      expect(edges).toHaveLength(2);
      expect(edges).toContainEqual({
        fromElementId: 'point1',
        toElementId: 'line1',
        actionId: 'action1'
      });
      expect(edges).toContainEqual({
        fromElementId: 'point2',
        toElementId: 'line1',
        actionId: 'action1'
      });
    });
  });

  describe('getElementDependencies', () => {
    it('should return complete dependency information', () => {
      // point1 -> line1
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      dependencyService.rebuildDependencyMaps();

      const point1Info = dependencyService.getElementDependencies('point1');
      expect(point1Info.dependencies).toEqual([]);
      expect(point1Info.dependents).toContain('line1');

      const line1Info = dependencyService.getElementDependencies('line1');
      expect(line1Info.dependencies).toContain('point1');
      expect(line1Info.dependents).toEqual([]);
    });
  });

  describe('invalidateCascade', () => {
    it('should call invalidate callback for element and all dependents', () => {
      // point1 -> line1 -> pointIntersection
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateIntersectionPoint',
        timestamp: new Date(),
        inputs: ['line1'],
        outputs: ['pointIntersection'],
        parameters: {},
        description: 'Intersection'
      });

      dependencyService.rebuildDependencyMaps();

      const invalidatedElements: string[] = [];
      dependencyService.invalidateCascade('point1', (id: string) => {
        invalidatedElements.push(id);
      });

      expect(invalidatedElements).toHaveLength(3);
      expect(invalidatedElements).toContain('point1');
      expect(invalidatedElements).toContain('line1');
      expect(invalidatedElements).toContain('pointIntersection');
    });

    it('should handle multiple branches in dependency tree', () => {
      // point1 -> line1, line2 -> both used by pointIntersection
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['point1'],
        parameters: {},
        description: 'Point 1'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['line1'],
        parameters: {},
        description: 'Line 1'
      });

      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateLine',
        timestamp: new Date(),
        inputs: ['point1'],
        outputs: ['line2'],
        parameters: {},
        description: 'Line 2'
      });

      processTree.addAction({
        id: 'action4',
        type: 'action',
        actionType: 'CreateIntersectionPoint',
        timestamp: new Date(),
        inputs: ['line1', 'line2'],
        outputs: ['pointIntersection'],
        parameters: {},
        description: 'Intersection'
      });

      dependencyService.rebuildDependencyMaps();

      const invalidatedElements: string[] = [];
      dependencyService.invalidateCascade('point1', (id: string) => {
        invalidatedElements.push(id);
      });

      expect(invalidatedElements).toHaveLength(4);
      expect(invalidatedElements).toContain('point1');
      expect(invalidatedElements).toContain('line1');
      expect(invalidatedElements).toContain('line2');
      expect(invalidatedElements).toContain('pointIntersection');
    });
  });

  describe('T990: Circle Dependency Tracking', () => {
    it('should track both center and circumference point dependencies for circles', () => {
      // Create two points
      processTree.addAction({
        id: 'action1',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['centerPoint'],
        parameters: {},
        description: 'Center Point'
      });

      processTree.addAction({
        id: 'action2',
        type: 'action',
        actionType: 'CreateFreePoint',
        timestamp: new Date(),
        inputs: [],
        outputs: ['circumferencePoint'],
        parameters: {},
        description: 'Circumference Point'
      });

      // Create circle with BOTH points as dependencies (Phase 57 fix)
      processTree.addAction({
        id: 'action3',
        type: 'action',
        actionType: 'CreateCircle',
        timestamp: new Date(),
        inputs: ['centerPoint', 'circumferencePoint'],  // Both points tracked
        outputs: ['circle1'],
        parameters: {},
        description: 'Circle from two points'
      });

      dependencyService.rebuildDependencyMaps();

      // Circle should depend on BOTH points
      const dependencies = dependencyService.getDependencies('circle1');
      expect(dependencies).toHaveLength(2);
      expect(dependencies).toContain('centerPoint');
      expect(dependencies).toContain('circumferencePoint');

      // Both points should have circle as dependent
      const centerDependents = dependencyService.getDependents('centerPoint');
      expect(centerDependents).toContain('circle1');

      const circumferenceDependents = dependencyService.getDependents('circumferencePoint');
      expect(circumferenceDependents).toContain('circle1');
    });
  });
});
