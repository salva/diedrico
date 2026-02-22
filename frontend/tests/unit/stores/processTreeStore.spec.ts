/**
 * Phase 118: Tests for processTreeStore — collapse state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProcessTreeStore } from '@/stores/processTreeStore';

describe('processTreeStore', () => {
  let store: ReturnType<typeof useProcessTreeStore>;

  beforeEach(() => {
    store = useProcessTreeStore();
    store.reset();
  });

  describe('Default collapse behavior', () => {
    it('should default "World Initialization" to collapsed', () => {
      expect(store.isCollapsed('node-1', 'World Initialization')).toBe(true);
    });

    it('should default other subprocesses to expanded', () => {
      expect(store.isCollapsed('node-2', 'User Actions')).toBe(false);
    });

    it('should default unknown nodes to expanded', () => {
      expect(store.isCollapsed('any-id')).toBe(false);
    });
  });

  describe('toggleCollapse', () => {
    it('should collapse an expanded node', () => {
      expect(store.isCollapsed('node-1', 'My Process')).toBe(false);
      store.toggleCollapse('node-1');
      expect(store.isCollapsed('node-1', 'My Process')).toBe(true);
    });

    it('should expand a collapsed node', () => {
      store.toggleCollapse('node-1'); // collapse
      store.toggleCollapse('node-1'); // expand
      expect(store.isCollapsed('node-1', 'My Process')).toBe(false);
    });

    it('should toggle "World Initialization" from collapsed to expanded', () => {
      // Force the WI node to be explicitly handled
      store.setCollapsed('wi-node');
      expect(store.isCollapsed('wi-node', 'World Initialization')).toBe(true);
      store.toggleCollapse('wi-node');
      expect(store.isCollapsed('wi-node', 'World Initialization')).toBe(false);
    });

    it('should not affect other nodes', () => {
      store.toggleCollapse('node-1');
      expect(store.isCollapsed('node-1')).toBe(true);
      expect(store.isCollapsed('node-2')).toBe(false);
    });
  });

  describe('ensureExpanded', () => {
    it('should expand a collapsed node', () => {
      store.toggleCollapse('node-1'); // collapse
      expect(store.isCollapsed('node-1')).toBe(true);
      store.ensureExpanded('node-1');
      expect(store.isCollapsed('node-1')).toBe(false);
    });

    it('should leave already-expanded nodes unchanged', () => {
      expect(store.isCollapsed('node-1')).toBe(false);
      store.ensureExpanded('node-1');
      expect(store.isCollapsed('node-1')).toBe(false);
    });

    it('should not affect other collapsed nodes', () => {
      store.toggleCollapse('node-1'); // collapse
      store.toggleCollapse('node-2'); // collapse
      store.ensureExpanded('node-1'); // only expand node-1
      expect(store.isCollapsed('node-1')).toBe(false);
      expect(store.isCollapsed('node-2')).toBe(true);
    });
  });

  describe('setCollapsed', () => {
    it('should mark a node as collapsed', () => {
      store.setCollapsed('node-1');
      expect(store.isCollapsed('node-1')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all collapse state', () => {
      store.toggleCollapse('node-1');
      store.toggleCollapse('node-2');
      store.reset();
      expect(store.isCollapsed('node-1')).toBe(false);
      expect(store.isCollapsed('node-2')).toBe(false);
    });
  });

  describe('Preserves user collapses across tree mutations', () => {
    it('should keep manually collapsed nodes collapsed when other nodes change', () => {
      // User collapses node-1
      store.toggleCollapse('node-1');
      expect(store.isCollapsed('node-1')).toBe(true);
      
      // New element added to node-2 — ensureExpanded only on node-2
      store.ensureExpanded('node-2');
      
      // node-1 stays collapsed
      expect(store.isCollapsed('node-1')).toBe(true);
      expect(store.isCollapsed('node-2')).toBe(false);
    });
  });
});
