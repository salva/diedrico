/**
 * Tests for DependencyGraph - DAG for tracking element and action dependencies
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../../src/domain/world/DependencyGraph';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('addNode', () => {
    it('should add a node to the graph', () => {
      graph.addNode('P001', 'element');
      
      expect(graph.hasNode('P001')).toBe(true);
      const node = graph.getNode('P001');
      expect(node).toBeDefined();
      expect(node?.id).toBe('P001');
      expect(node?.type).toBe('element');
      expect(node?.infeasible).toBe(false);
    });

    it('should add action nodes', () => {
      graph.addNode('A001', 'action');
      
      const node = graph.getNode('A001');
      expect(node?.type).toBe('action');
    });

    it('should not duplicate nodes', () => {
      graph.addNode('P001', 'element');
      graph.addNode('P001', 'element');
      
      const nodes = graph.getAllNodes();
      expect(nodes.filter(n => n.id === 'P001').length).toBe(1);
    });
  });

  describe('addEdge', () => {
    beforeEach(() => {
      graph.addNode('P001', 'element');
      graph.addNode('P002', 'element');
      graph.addNode('S001', 'element');
    });

    it('should add an edge between two nodes', () => {
      graph.addEdge('P001', 'S001');
      
      // S001 should be a descendant of P001
      const descendants = graph.getDescendants('P001');
      expect(descendants.has('S001')).toBe(true);
      
      // P001 should be an ancestor of S001
      const ancestors = graph.getAncestors('S001');
      expect(ancestors.has('P001')).toBe(true);
    });

    it('should add multiple edges from one node', () => {
      graph.addEdge('P001', 'S001');
      graph.addEdge('P002', 'S001');
      
      const ancestors = graph.getAncestors('S001');
      expect(ancestors.has('P001')).toBe(true);
      expect(ancestors.has('P002')).toBe(true);
    });

    it('should throw error if from node does not exist', () => {
      expect(() => {
        graph.addEdge('NONEXISTENT', 'P001');
      }).toThrow('Node NONEXISTENT not found');
    });

    it('should throw error if to node does not exist', () => {
      expect(() => {
        graph.addEdge('P001', 'NONEXISTENT');
      }).toThrow('Node NONEXISTENT not found');
    });
  });

  describe('cycle detection', () => {
    beforeEach(() => {
      graph.addNode('P001', 'element');
      graph.addNode('P002', 'element');
      graph.addNode('S001', 'element');
      graph.addNode('L001', 'element');
    });

    it('should detect direct cycles', () => {
      graph.addEdge('P001', 'S001');
      
      // Trying to add S001 -> P001 would create a cycle
      expect(() => {
        graph.addEdge('S001', 'P001');
      }).toThrow('would create a cycle');
    });

    it('should detect indirect cycles', () => {
      // Create chain: P001 -> S001 -> L001
      graph.addEdge('P001', 'S001');
      graph.addEdge('S001', 'L001');
      
      // Trying to add L001 -> P001 would create a cycle
      expect(() => {
        graph.addEdge('L001', 'P001');
      }).toThrow('would create a cycle');
    });

    it('should allow parallel edges', () => {
      // P001 -> S001 and P002 -> S001 should both be allowed
      graph.addEdge('P001', 'S001');
      graph.addEdge('P002', 'S001');
      
      const ancestors = graph.getAncestors('S001');
      expect(ancestors.size).toBe(2);
    });

    it('should allow diamond patterns', () => {
      // Create diamond: P001 -> P002, P001 -> S001, P002 -> L001, S001 -> L001
      graph.addEdge('P001', 'P002');
      graph.addEdge('P001', 'S001');
      graph.addEdge('P002', 'L001');
      graph.addEdge('S001', 'L001');
      
      // L001 should have P001 as ancestor through two paths
      const ancestors = graph.getAncestors('L001');
      expect(ancestors.has('P001')).toBe(true);
      expect(ancestors.has('P002')).toBe(true);
      expect(ancestors.has('S001')).toBe(true);
    });
  });

  describe('getAncestors', () => {
    beforeEach(() => {
      // Create dependency chain: P001 -> P002 -> S001 -> L001
      graph.addNode('P001', 'element');
      graph.addNode('P002', 'element');
      graph.addNode('S001', 'element');
      graph.addNode('L001', 'element');
      
      graph.addEdge('P001', 'P002');
      graph.addEdge('P002', 'S001');
      graph.addEdge('S001', 'L001');
    });

    it('should get all ancestors transitively', () => {
      const ancestors = graph.getAncestors('L001');
      
      expect(ancestors.has('S001')).toBe(true);
      expect(ancestors.has('P002')).toBe(true);
      expect(ancestors.has('P001')).toBe(true);
      expect(ancestors.size).toBe(3);
    });

    it('should return empty set for root node', () => {
      const ancestors = graph.getAncestors('P001');
      
      expect(ancestors.size).toBe(0);
    });

    it('should handle nodes with multiple ancestors', () => {
      // Add another path: P003 -> S001
      graph.addNode('P003', 'element');
      graph.addEdge('P003', 'S001');
      
      const ancestors = graph.getAncestors('L001');
      
      expect(ancestors.has('P001')).toBe(true);
      expect(ancestors.has('P002')).toBe(true);
      expect(ancestors.has('P003')).toBe(true);
      expect(ancestors.has('S001')).toBe(true);
    });
  });

  describe('getDescendants', () => {
    beforeEach(() => {
      // Create dependency chain: P001 -> P002 -> S001 -> L001
      graph.addNode('P001', 'element');
      graph.addNode('P002', 'element');
      graph.addNode('S001', 'element');
      graph.addNode('L001', 'element');
      
      graph.addEdge('P001', 'P002');
      graph.addEdge('P002', 'S001');
      graph.addEdge('S001', 'L001');
    });

    it('should get all descendants transitively', () => {
      const descendants = graph.getDescendants('P001');
      
      expect(descendants.has('P002')).toBe(true);
      expect(descendants.has('S001')).toBe(true);
      expect(descendants.has('L001')).toBe(true);
      expect(descendants.size).toBe(3);
    });

    it('should return empty set for leaf node', () => {
      const descendants = graph.getDescendants('L001');
      
      expect(descendants.size).toBe(0);
    });

    it('should handle nodes with multiple descendants', () => {
      // Add another path: P001 -> S002
      graph.addNode('S002', 'element');
      graph.addEdge('P001', 'S002');
      
      const descendants = graph.getDescendants('P001');
      
      expect(descendants.has('P002')).toBe(true);
      expect(descendants.has('S001')).toBe(true);
      expect(descendants.has('L001')).toBe(true);
      expect(descendants.has('S002')).toBe(true);
    });
  });

  describe('topologicalSort', () => {
    beforeEach(() => {
      // Create diamond pattern:
      //   P001 -> P002 -> L001
      //   P001 -> S001 -> L001
      graph.addNode('P001', 'element');
      graph.addNode('P002', 'element');
      graph.addNode('S001', 'element');
      graph.addNode('L001', 'element');
      
      graph.addEdge('P001', 'P002');
      graph.addEdge('P001', 'S001');
      graph.addEdge('P002', 'L001');
      graph.addEdge('S001', 'L001');
    });

    it('should return nodes in dependency order', () => {
      const nodeIds = new Set(['P001', 'P002', 'S001', 'L001']);
      const sorted = graph.topologicalSort(nodeIds);
      
      // P001 must come before P002 and S001
      const p001Idx = sorted.indexOf('P001');
      const p002Idx = sorted.indexOf('P002');
      const s001Idx = sorted.indexOf('S001');
      const l001Idx = sorted.indexOf('L001');
      
      expect(p001Idx).toBeLessThan(p002Idx);
      expect(p001Idx).toBeLessThan(s001Idx);
      expect(p002Idx).toBeLessThan(l001Idx);
      expect(s001Idx).toBeLessThan(l001Idx);
    });

    it('should handle subset of nodes', () => {
      // Only sort P002, S001, L001 (exclude P001)
      const nodeIds = new Set(['P002', 'S001', 'L001']);
      const sorted = graph.topologicalSort(nodeIds);
      
      expect(sorted.length).toBe(3);
      expect(sorted).not.toContain('P001');
      
      // L001 should still come after P002 and S001
      const p002Idx = sorted.indexOf('P002');
      const s001Idx = sorted.indexOf('S001');
      const l001Idx = sorted.indexOf('L001');
      
      expect(p002Idx).toBeLessThan(l001Idx);
      expect(s001Idx).toBeLessThan(l001Idx);
    });

    it('should return empty array for empty set', () => {
      const sorted = graph.topologicalSort(new Set());
      
      expect(sorted).toEqual([]);
    });

    it('should handle linear chain', () => {
      const nodeIds = new Set(['P001', 'P002', 'S001', 'L001']);
      const sorted = graph.topologicalSort(nodeIds);
      
      // Should be in order: P001, then P002/S001, then L001
      expect(sorted[0]).toBe('P001');
      expect(sorted[sorted.length - 1]).toBe('L001');
    });
  });

  describe('propagateInfeasibility', () => {
    beforeEach(() => {
      // Create dependency tree:
      //   P001 -> S001 -> L001
      //   P002 -> S001
      graph.addNode('P001', 'element');
      graph.addNode('P002', 'element');
      graph.addNode('S001', 'element');
      graph.addNode('L001', 'element');
      
      graph.addEdge('P001', 'S001');
      graph.addEdge('P002', 'S001');
      graph.addEdge('S001', 'L001');
    });

    it('should mark node as infeasible', () => {
      graph.propagateInfeasibility('S001');
      
      const node = graph.getNode('S001');
      expect(node?.infeasible).toBe(true);
    });

    it('should mark all descendants as infeasible', () => {
      graph.propagateInfeasibility('S001');
      
      const s001 = graph.getNode('S001');
      const l001 = graph.getNode('L001');
      
      expect(s001?.infeasible).toBe(true);
      expect(l001?.infeasible).toBe(true);
    });

    it('should not mark ancestors as infeasible', () => {
      graph.propagateInfeasibility('S001');
      
      const p001 = graph.getNode('P001');
      const p002 = graph.getNode('P002');
      
      expect(p001?.infeasible).toBe(false);
      expect(p002?.infeasible).toBe(false);
    });

    it('should return set of affected nodes', () => {
      const affected = graph.propagateInfeasibility('S001');
      
      expect(affected.has('S001')).toBe(true);
      expect(affected.has('L001')).toBe(true);
      expect(affected.has('P001')).toBe(false);
      expect(affected.has('P002')).toBe(false);
      expect(affected.size).toBe(2);
    });

    it('should handle propagation from leaf node', () => {
      const affected = graph.propagateInfeasibility('L001');
      
      expect(affected.size).toBe(1);
      expect(affected.has('L001')).toBe(true);
    });
  });

  describe('clearInfeasibility', () => {
    beforeEach(() => {
      graph.addNode('P001', 'element');
      graph.addNode('S001', 'element');
      graph.addEdge('P001', 'S001');
    });

    it('should clear infeasibility flag', () => {
      graph.propagateInfeasibility('S001');
      expect(graph.getNode('S001')?.infeasible).toBe(true);
      
      graph.clearInfeasibility('S001');
      expect(graph.getNode('S001')?.infeasible).toBe(false);
    });

    it('should not affect other nodes', () => {
      graph.addNode('L001', 'element');
      graph.addEdge('S001', 'L001');
      
      graph.propagateInfeasibility('S001');
      graph.clearInfeasibility('S001');
      
      // L001 should still be infeasible
      expect(graph.getNode('L001')?.infeasible).toBe(true);
    });
  });

  describe('removeNode', () => {
    beforeEach(() => {
      graph.addNode('P001', 'element');
      graph.addNode('P002', 'element');
      graph.addNode('S001', 'element');
      
      graph.addEdge('P001', 'S001');
      graph.addEdge('P002', 'S001');
    });

    it('should remove node from graph', () => {
      graph.removeNode('S001');
      
      expect(graph.hasNode('S001')).toBe(false);
      expect(graph.getNode('S001')).toBeUndefined();
    });

    it('should remove outgoing edges', () => {
      graph.addNode('L001', 'element');
      graph.addEdge('S001', 'L001');
      
      graph.removeNode('S001');
      
      // L001 should have no ancestors
      const ancestors = graph.getAncestors('L001');
      expect(ancestors.has('S001')).toBe(false);
    });

    it('should remove incoming edges', () => {
      graph.removeNode('S001');
      
      // P001 should have no descendants
      const descendants = graph.getDescendants('P001');
      expect(descendants.has('S001')).toBe(false);
    });
  });

  describe('getAllNodes', () => {
    it('should return empty array for empty graph', () => {
      const nodes = graph.getAllNodes();
      
      expect(nodes).toEqual([]);
    });

    it('should return all nodes', () => {
      graph.addNode('P001', 'element');
      graph.addNode('P002', 'element');
      graph.addNode('A001', 'action');
      
      const nodes = graph.getAllNodes();
      
      expect(nodes.length).toBe(3);
      expect(nodes.some(n => n.id === 'P001')).toBe(true);
      expect(nodes.some(n => n.id === 'P002')).toBe(true);
      expect(nodes.some(n => n.id === 'A001')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all nodes and edges', () => {
      graph.addNode('P001', 'element');
      graph.addNode('S001', 'element');
      graph.addEdge('P001', 'S001');
      
      graph.clear();
      
      expect(graph.getAllNodes()).toEqual([]);
      expect(graph.hasNode('P001')).toBe(false);
      expect(graph.hasNode('S001')).toBe(false);
    });
  });
});
