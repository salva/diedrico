/**
 * Unit tests for ProcessTree
 * 
 * Tests the process tree's ability to:
 * - Track construction actions
 * - Maintain tree structure
 * - Query actions by dependencies
 * - Traverse in execution order
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProcessTree } from '@/domain/processTree/ProcessTree';
import { createPointAction } from '@/domain/processTree/actions/CreatePointAction';
import { createLineAction } from '@/domain/processTree/actions/CreateLineAction';
import { Vector3 } from 'three';

describe('ProcessTree', () => {
  let tree: ProcessTree;

  beforeEach(() => {
    tree = new ProcessTree();
  });

  describe('initialization', () => {
    it('should create a root subprocess', () => {
      expect(tree.root).toBeDefined();
      expect(tree.root.type).toBe('subprocess');
      expect(tree.root.name).toBe('Root Process');
      expect(tree.root.children).toEqual([]);
    });
  });

  describe('addAction', () => {
    it('should add a point action to the tree', () => {
      const action = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      const group = tree.addAction(action);

      expect(group.type).toBe('actionGroup');
      expect(group.children).toHaveLength(1);
      expect(group.children[0].id).toBe(action.id);
      expect(tree.root.children).toContain(group);
    });

    it('should add a line action to the tree', () => {
      const action = createLineAction('line_1', 'plane_H', 'point_1', 'point_2');
      const group = tree.addAction(action);

      expect(group.type).toBe('actionGroup');
      expect(group.children).toHaveLength(1);
      expect(group.children[0].id).toBe(action.id);
    });

    it('should create separate action groups for each action', () => {
      const action1 = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      const action2 = createPointAction('point_2', 'plane_H', new Vector3(30, 40, 1));

      tree.addAction(action1);
      tree.addAction(action2);

      expect(tree.root.children).toHaveLength(2);
    });
  });

  describe('addSubprocess', () => {
    it('should add a subprocess to the root', () => {
      const subprocess = tree.addSubprocess('Construction Phase 1');

      expect(subprocess.type).toBe('subprocess');
      expect(subprocess.name).toBe('Construction Phase 1');
      expect(subprocess.visible).toBe(true);
      expect(tree.root.children).toContain(subprocess);
    });

    it('should add a nested subprocess', () => {
      const parent = tree.addSubprocess('Phase 1');
      const child = tree.addSubprocess('Substep A', parent);

      expect(parent.children).toContain(child);
      expect(child.type).toBe('subprocess');
    });
  });

  describe('getAllActions', () => {
    it('should return empty array for empty tree', () => {
      const actions = tree.getAllActions();
      expect(actions).toEqual([]);
    });

    it('should return all actions in execution order', () => {
      const action1 = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      const action2 = createPointAction('point_2', 'plane_H', new Vector3(30, 40, 1));
      const action3 = createLineAction('line_1', 'plane_H', 'point_1', 'point_2');

      tree.addAction(action1);
      tree.addAction(action2);
      tree.addAction(action3);

      const actions = tree.getAllActions();
      expect(actions.length).toBe(3);
      expect(actions[0].id).toBe(action1.id);
      expect(actions[1].id).toBe(action2.id);
      expect(actions[2].id).toBe(action3.id);
    });

    it('should traverse nested subprocesses in depth-first order', () => {
      const subprocess = tree.addSubprocess('Phase 1');
      const action1 = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      const action2 = createPointAction('point_2', 'plane_H', new Vector3(30, 40, 1));

      // Add action to root first
      tree.addAction(action1);

      // Manually add action to subprocess for testing
      const group = {
        id: 'group_test',
        type: 'actionGroup' as const,
        name: 'Test Group',
        children: [action2],
        isAuxiliary: false,
        created: new Date()
      };
      subprocess.children.push(group);

      const actions = tree.getAllActions();
      // Depth-first traversal visits children in order: first action group (action1), then subprocess (action2)
      expect(actions).toHaveLength(2);
      expect(actions[0].id).toBe(action2.id); // Subprocess comes first in children
      expect(actions[1].id).toBe(action1.id); // Root action group comes after
    });
  });

  describe('findAction', () => {
    it('should find action by ID', () => {
      const action = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      tree.addAction(action);

      const found = tree.findAction(action.id);
      expect(found?.id).toBe(action.id);
    });

    it('should return undefined for non-existent action', () => {
      const found = tree.findAction('non_existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getActionsProducingElement', () => {
    it('should find actions that produce a specific element', () => {
      const action1 = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      const action2 = createPointAction('point_2', 'plane_H', new Vector3(30, 40, 1));
      const action3 = createLineAction('line_1', 'plane_H', 'point_1', 'point_2');

      tree.addAction(action1);
      tree.addAction(action2);
      tree.addAction(action3);

      const producers = tree.getActionsProducingElement('point_1');
      expect(producers).toHaveLength(1);
      expect(producers[0].id).toBe(action1.id);
    });

    it('should return empty array if no action produces the element', () => {
      const action = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      tree.addAction(action);

      const producers = tree.getActionsProducingElement('point_99');
      expect(producers).toEqual([]);
    });
  });

  describe('getActionsDependingOnElement', () => {
    it('should find actions that depend on a specific element', () => {
      const action1 = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      const action2 = createPointAction('point_2', 'plane_H', new Vector3(30, 40, 1));
      const action3 = createLineAction('line_1', 'plane_H', 'point_1', 'point_2');

      tree.addAction(action1);
      tree.addAction(action2);
      tree.addAction(action3);

      const dependents = tree.getActionsDependingOnElement('point_1');
      expect(dependents).toHaveLength(1);
      expect(dependents[0].id).toBe(action3.id);
    });

    it('should return empty array if no action depends on the element', () => {
      const action = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      tree.addAction(action);

      const dependents = tree.getActionsDependingOnElement('point_1');
      expect(dependents).toEqual([]);
    });

    it('should find multiple dependents', () => {
      const action1 = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));
      const action2 = createPointAction('point_2', 'plane_H', new Vector3(30, 40, 1));
      const action3 = createLineAction('line_1', 'plane_H', 'point_1', 'point_2');
      const action4 = createLineAction('line_2', 'plane_H', 'point_1', 'point_2');

      tree.addAction(action1);
      tree.addAction(action2);
      tree.addAction(action3);
      tree.addAction(action4);

      const dependents = tree.getActionsDependingOnElement('point_1');
      expect(dependents).toHaveLength(2);
      expect(dependents.map(a => a.id)).toContain(action3.id);
      expect(dependents.map(a => a.id)).toContain(action4.id);
    });
  });

  describe('action factory functions', () => {
    it('createPointAction should create valid action with no inputs', () => {
      const action = createPointAction('point_1', 'plane_H', new Vector3(10, 20, 1));

      expect(action.type).toBe('action');
      expect(action.actionType).toBe('CreateFreePoint');
      expect(action.inputs).toEqual([]);
      expect(action.outputs).toEqual(['point_1']);
      expect(action.parameters.planeId).toBe('plane_H');
      expect(action.parameters.position).toEqual({ x: 10, y: 20, z: 1 });
    });

    it('createLineAction should create valid action with inputs', () => {
      const action = createLineAction('line_1', 'plane_H', 'point_1', 'point_2');

      expect(action.type).toBe('action');
      expect(action.actionType).toBe('CreateLine');
      expect(action.inputs).toEqual(['point_1', 'point_2']);
      expect(action.outputs).toEqual(['line_1']);
      expect(action.parameters.planeId).toBe('plane_H');
      expect(action.parameters.point1Id).toBe('point_1');
      expect(action.parameters.point2Id).toBe('point_2');
    });
  });
});
