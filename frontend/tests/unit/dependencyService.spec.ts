/**
 * Tests for DependencyService - Service layer for dependency management and recomputation
 * 
 * DependencyService provides a high-level API for:
 * - Adding dependencies with cycle detection
 * - Recomputing affected elements
 * - Getting recomputation order via topological sort
 * - Propagating and clearing infeasibility flags
 * - Querying dependents and dependencies
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../../src/domain/world/DependencyGraph';
import { DependencyService } from '../../src/services/DependencyService';

describe('DependencyService', () => {
  let graph: DependencyGraph;
  let service: DependencyService;

  beforeEach(() => {
    graph = new DependencyGraph();
    service = new DependencyService(graph);
    
    // Set up a basic dependency structure for testing:
    // P001 -> P002 -> S001 -> L001
    // P003 -> S001
    graph.addNode('P001', 'element');
    graph.addNode('P002', 'element');
    graph.addNode('P003', 'element');
    graph.addNode('S001', 'element');
    graph.addNode('L001', 'element');
    
    graph.addEdge('P001', 'P002');
    graph.addEdge('P002', 'S001');
    graph.addEdge('P003', 'S001');
    graph.addEdge('S001', 'L001');
  });

  describe('addDependency', () => {
    it('should add dependency edge successfully', () => {
      graph.addNode('C001', 'element');
      graph.addNode('C002', 'element');
      
      const result = service.addDependency('C001', 'C002');
      
      expect(result.ok).toBe(true);
      expect(graph.getDescendants('C001').has('C002')).toBe(true);
    });

    it('should detect and prevent cycles', () => {
      // Try to create a cycle: L001 -> P001
      // This would create: P001 -> P002 -> S001 -> L001 -> P001 (cycle)
      const result = service.addDependency('L001', 'P001');
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('cycle');
      }
    });

    it('should validate node existence', () => {
      // Try to add edge from non-existent node
      const result = service.addDependency('INVALID_ID', 'P001');
      
      expect(result.ok).toBe(false);
    });
  });

  describe('recomputeAffected', () => {
    it('should return all descendants when an element changes', () => {
      const affected = service.recomputeAffected('P001');
      
      // P001 affects: P002, S001, L001 (all descendants)
      expect(affected).toHaveLength(3);
      expect(affected).toContain('P002');
      expect(affected).toContain('S001');
      expect(affected).toContain('L001');
    });

    it('should return empty array for leaf elements', () => {
      const affected = service.recomputeAffected('L001');
      
      // L001 has no descendants
      expect(affected).toEqual([]);
    });

    it('should handle transitive dependencies correctly', () => {
      const affected = service.recomputeAffected('P002');
      
      // P002 affects: S001, L001
      expect(affected).toHaveLength(2);
      expect(affected).toContain('S001');
      expect(affected).toContain('L001');
    });
  });

  describe('getRecomputationOrder', () => {
    it('should return topological sort of affected elements', () => {
      const affected = ['P002', 'S001', 'L001'];
      const result = service.getRecomputationOrder(affected);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        const order = result.value;
        expect(order).toHaveLength(3);
        
        // P002 must come before S001
        expect(order.indexOf('P002')).toBeLessThan(order.indexOf('S001'));
        // S001 must come before L001
        expect(order.indexOf('S001')).toBeLessThan(order.indexOf('L001'));
      }
    });

    it('should handle single element', () => {
      const result = service.getRecomputationOrder(['L001']);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['L001']);
      }
    });

    it('should handle empty array', () => {
      const result = service.getRecomputationOrder([]);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should handle diamond pattern dependencies', () => {
      // Add diamond: P001 -> P002, P001 -> P003, P002 -> S001, P003 -> S001
      // Already have: P001 -> P002 -> S001 and P003 -> S001
      graph.addEdge('P001', 'P003');
      
      const affected = ['P002', 'P003', 'S001'];
      const result = service.getRecomputationOrder(affected);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        const order = result.value;
        // Both P002 and P003 must come before S001
        expect(order.indexOf('P002')).toBeLessThan(order.indexOf('S001'));
        expect(order.indexOf('P003')).toBeLessThan(order.indexOf('S001'));
      }
    });
  });

  describe('getDependents', () => {
    it('should return all elements that depend on given element', () => {
      const dependents = service.getDependents('P001');
      
      // P001's dependents: P002, S001, L001
      expect(dependents).toContain('P002');
      expect(dependents).toContain('S001');
      expect(dependents).toContain('L001');
    });

    it('should return empty for leaf element', () => {
      const dependents = service.getDependents('L001');
      
      expect(dependents).toEqual([]);
    });

    it('should include transitive dependents', () => {
      const dependents = service.getDependents('P003');
      
      // P003 -> S001 -> L001
      expect(dependents).toContain('S001');
      expect(dependents).toContain('L001');
    });
  });

  describe('getDependencies', () => {
    it('should return all elements that the given element depends on', () => {
      const dependencies = service.getDependencies('L001');
      
      // L001 depends on: S001, P001, P002, P003
      expect(dependencies).toContain('S001');
      expect(dependencies).toContain('P001');
      expect(dependencies).toContain('P002');
      expect(dependencies).toContain('P003');
    });

    it('should return empty for root element', () => {
      const dependencies = service.getDependencies('P001');
      
      expect(dependencies).toEqual([]);
    });

    it('should include transitive dependencies', () => {
      const dependencies = service.getDependencies('S001');
      
      // S001 depends on: P002, P003 (direct) and P001 (transitive via P002)
      expect(dependencies).toContain('P001');
      expect(dependencies).toContain('P002');
      expect(dependencies).toContain('P003');
    });
  });

  describe('propagateInfeasibility', () => {
    it('should mark element and all dependents as infeasible', () => {
      const affected = service.propagateInfeasibility('P002');
      
      // Should mark P002, S001, L001 as infeasible
      expect(affected).toContain('P002');
      expect(affected).toContain('S001');
      expect(affected).toContain('L001');
      expect(affected).toHaveLength(3);
      
      // Verify flags are set
      expect(graph.getNode('P002')?.infeasible).toBe(true);
      expect(graph.getNode('S001')?.infeasible).toBe(true);
      expect(graph.getNode('L001')?.infeasible).toBe(true);
    });

    it('should not mark ancestors as infeasible', () => {
      service.propagateInfeasibility('S001');
      
      // P001, P002, P003 should NOT be infeasible
      expect(graph.getNode('P001')?.infeasible).toBe(false);
      expect(graph.getNode('P002')?.infeasible).toBe(false);
      expect(graph.getNode('P003')?.infeasible).toBe(false);
      
      // S001 and L001 SHOULD be infeasible
      expect(graph.getNode('S001')?.infeasible).toBe(true);
      expect(graph.getNode('L001')?.infeasible).toBe(true);
    });

    it('should handle leaf element correctly', () => {
      const affected = service.propagateInfeasibility('L001');
      
      // Only L001 should be marked (no descendants)
      expect(affected).toEqual(['L001']);
      expect(graph.getNode('L001')?.infeasible).toBe(true);
    });

    it('should handle transitive propagation', () => {
      service.propagateInfeasibility('P001');
      
      // All descendants of P001 should be infeasible
      expect(graph.getNode('P001')?.infeasible).toBe(true);
      expect(graph.getNode('P002')?.infeasible).toBe(true);
      expect(graph.getNode('S001')?.infeasible).toBe(true);
      expect(graph.getNode('L001')?.infeasible).toBe(true);
      
      // P003 should NOT be infeasible (not a descendant of P001)
      expect(graph.getNode('P003')?.infeasible).toBe(false);
    });
  });

  describe('clearInfeasibility', () => {
    it('should clear infeasibility flag', () => {
      // Mark as infeasible first
      graph.propagateInfeasibility('P002');
      expect(graph.getNode('P002')?.infeasible).toBe(true);
      
      // Clear the flag
      service.clearInfeasibility('P002');
      expect(graph.getNode('P002')?.infeasible).toBe(false);
    });

    it('should not affect other elements', () => {
      // Mark P002 and descendants as infeasible
      graph.propagateInfeasibility('P002');
      
      // Clear only P002
      service.clearInfeasibility('P002');
      
      // P002 should be clear, but descendants should still be infeasible
      expect(graph.getNode('P002')?.infeasible).toBe(false);
      expect(graph.getNode('S001')?.infeasible).toBe(true);
      expect(graph.getNode('L001')?.infeasible).toBe(true);
    });
  });

  describe('validateDependencies', () => {
    it('should return Ok for valid graph', () => {
      const result = service.validateDependencies();
      
      expect(result.ok).toBe(true);
    });

    it('should always return Ok since addEdge prevents cycles', () => {
      // Since DependencyGraph.addEdge prevents cycles,
      // validateDependencies always returns Ok
      const result = service.validateDependencies();
      
      expect(result.ok).toBe(true);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle moving a point and recomputing all affected elements', () => {
      // Simulate moving P001 - need to recompute all descendants
      const affected = service.recomputeAffected('P001');
      const result = service.getRecomputationOrder(affected);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        const order = result.value;
        
        // Should include all descendants: P002, S001, L001
        expect(order).toHaveLength(3);
        expect(order).toContain('P002');
        expect(order).toContain('S001');
        expect(order).toContain('L001');
        
        // Verify order respects dependencies
        expect(order.indexOf('P002')).toBeLessThan(order.indexOf('S001'));
        expect(order.indexOf('S001')).toBeLessThan(order.indexOf('L001'));
      }
    });

    it('should handle infeasibility propagation when constraint fails', () => {
      // Simulate a constraint failure at P002
      const affected = service.propagateInfeasibility('P002');
      
      // P002 and all descendants should be infeasible
      expect(affected).toContain('P002');
      expect(affected).toContain('S001');
      expect(affected).toContain('L001');
      
      // P001 and P003 should NOT be infeasible
      expect(graph.getNode('P001')?.infeasible).toBe(false);
      expect(graph.getNode('P003')?.infeasible).toBe(false);
      
      // P002, S001, L001 should be infeasible
      expect(graph.getNode('P002')?.infeasible).toBe(true);
      expect(graph.getNode('S001')?.infeasible).toBe(true);
      expect(graph.getNode('L001')?.infeasible).toBe(true);
    });

    it('should handle multiple changes in sequence', () => {
      // Change P001, get affected elements
      const affected1 = service.recomputeAffected('P001');
      expect(affected1).toHaveLength(3); // P002, S001, L001
      
      // Change P003, get affected elements
      const affected2 = service.recomputeAffected('P003');
      expect(affected2).toHaveLength(2); // S001, L001
      
      // Merge affected sets and get recomputation order
      const allAffected = Array.from(new Set([...affected1, ...affected2]));
      const result = service.getRecomputationOrder(allAffected);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        const order = result.value;
        
        // All affected elements should be in order
        expect(order).toContain('P002');
        expect(order).toContain('S001');
        expect(order).toContain('L001');
        
        // Dependencies must be respected
        expect(order.indexOf('P002')).toBeLessThan(order.indexOf('S001'));
        expect(order.indexOf('S001')).toBeLessThan(order.indexOf('L001'));
      }
    });
  });
});
