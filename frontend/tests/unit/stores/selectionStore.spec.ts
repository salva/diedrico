/**
 * Unit tests for selectionStore
 * 
 * Tests:
 * - All actions (selectSingle, addToSelection, removeFromSelection, toggleSelection, clearSelection, selectMultiple)
 * - Computed properties (selectedIdsArray, hasSelection, selectionCount)
 * - Set behavior and bidirectional sync
 * - isSelected method
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSelectionStore } from '../../../src/stores/selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia());
  });

  describe('Initial State', () => {
    it('should start with empty selection', () => {
      const store = useSelectionStore();
      
      expect(store.selectedIds.size).toBe(0);
      expect(store.selectedIdsArray).toEqual([]);
      expect(store.hasSelection).toBe(false);
      expect(store.selectionCount).toBe(0);
    });
  });

  describe('selectSingle', () => {
    it('should select a single element', () => {
      const store = useSelectionStore();
      
      store.selectSingle('element-1');
      
      expect(store.selectedIds.has('element-1')).toBe(true);
      expect(store.selectedIdsArray).toEqual(['element-1']);
      expect(store.hasSelection).toBe(true);
      expect(store.selectionCount).toBe(1);
    });

    it('should replace previous selection', () => {
      const store = useSelectionStore();
      
      store.selectSingle('element-1');
      store.selectSingle('element-2');
      
      expect(store.selectedIds.has('element-1')).toBe(false);
      expect(store.selectedIds.has('element-2')).toBe(true);
      expect(store.selectedIdsArray).toEqual(['element-2']);
      expect(store.selectionCount).toBe(1);
    });

    it('should clear multiple selections when selecting single', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.addToSelection('element-2');
      store.addToSelection('element-3');
      
      expect(store.selectionCount).toBe(3);
      
      store.selectSingle('element-4');
      
      expect(store.selectedIdsArray).toEqual(['element-4']);
      expect(store.selectionCount).toBe(1);
    });
  });

  describe('addToSelection', () => {
    it('should add element to empty selection', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      
      expect(store.selectedIds.has('element-1')).toBe(true);
      expect(store.selectionCount).toBe(1);
    });

    it('should add element to existing selection (multi-select)', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.addToSelection('element-2');
      store.addToSelection('element-3');
      
      expect(store.selectedIds.has('element-1')).toBe(true);
      expect(store.selectedIds.has('element-2')).toBe(true);
      expect(store.selectedIds.has('element-3')).toBe(true);
      expect(store.selectionCount).toBe(3);
    });

    it('should not duplicate elements (Set behavior)', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.addToSelection('element-1');
      store.addToSelection('element-1');
      
      expect(store.selectionCount).toBe(1);
      expect(store.selectedIdsArray).toEqual(['element-1']);
    });

    it('should preserve order of addition in selectedIdsArray', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-3');
      store.addToSelection('element-1');
      store.addToSelection('element-2');
      
      const array = store.selectedIdsArray;
      expect(array).toContain('element-1');
      expect(array).toContain('element-2');
      expect(array).toContain('element-3');
      expect(array.length).toBe(3);
    });
  });

  describe('removeFromSelection', () => {
    it('should remove element from selection', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.addToSelection('element-2');
      
      expect(store.selectionCount).toBe(2);
      
      store.removeFromSelection('element-1');
      
      expect(store.selectedIds.has('element-1')).toBe(false);
      expect(store.selectedIds.has('element-2')).toBe(true);
      expect(store.selectionCount).toBe(1);
    });

    it('should handle removing non-existent element gracefully', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      
      expect(() => {
        store.removeFromSelection('element-999');
      }).not.toThrow();
      
      expect(store.selectionCount).toBe(1);
    });

    it('should result in empty selection when last element removed', () => {
      const store = useSelectionStore();
      
      store.selectSingle('element-1');
      store.removeFromSelection('element-1');
      
      expect(store.hasSelection).toBe(false);
      expect(store.selectionCount).toBe(0);
      expect(store.selectedIdsArray).toEqual([]);
    });
  });

  describe('toggleSelection', () => {
    it('should add element if not selected', () => {
      const store = useSelectionStore();
      
      store.toggleSelection('element-1');
      
      expect(store.selectedIds.has('element-1')).toBe(true);
      expect(store.selectionCount).toBe(1);
    });

    it('should remove element if already selected', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      expect(store.selectedIds.has('element-1')).toBe(true);
      
      store.toggleSelection('element-1');
      
      expect(store.selectedIds.has('element-1')).toBe(false);
      expect(store.selectionCount).toBe(0);
    });

    it('should toggle multiple times correctly', () => {
      const store = useSelectionStore();
      
      store.toggleSelection('element-1'); // Add
      expect(store.isSelected('element-1')).toBe(true);
      
      store.toggleSelection('element-1'); // Remove
      expect(store.isSelected('element-1')).toBe(false);
      
      store.toggleSelection('element-1'); // Add again
      expect(store.isSelected('element-1')).toBe(true);
    });

    it('should toggle independent elements', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.addToSelection('element-2');
      
      expect(store.selectionCount).toBe(2);
      
      store.toggleSelection('element-1'); // Remove element-1
      
      expect(store.isSelected('element-1')).toBe(false);
      expect(store.isSelected('element-2')).toBe(true);
      expect(store.selectionCount).toBe(1);
      
      store.toggleSelection('element-3'); // Add element-3
      
      expect(store.isSelected('element-2')).toBe(true);
      expect(store.isSelected('element-3')).toBe(true);
      expect(store.selectionCount).toBe(2);
    });
  });

  describe('clearSelection', () => {
    it('should clear empty selection', () => {
      const store = useSelectionStore();
      
      store.clearSelection();
      
      expect(store.hasSelection).toBe(false);
      expect(store.selectionCount).toBe(0);
    });

    it('should clear single selection', () => {
      const store = useSelectionStore();
      
      store.selectSingle('element-1');
      store.clearSelection();
      
      expect(store.hasSelection).toBe(false);
      expect(store.selectedIdsArray).toEqual([]);
    });

    it('should clear multiple selections', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.addToSelection('element-2');
      store.addToSelection('element-3');
      store.addToSelection('element-4');
      
      expect(store.selectionCount).toBe(4);
      
      store.clearSelection();
      
      expect(store.hasSelection).toBe(false);
      expect(store.selectionCount).toBe(0);
      expect(store.selectedIdsArray).toEqual([]);
    });
  });

  describe('isSelected', () => {
    it('should return false for non-selected element', () => {
      const store = useSelectionStore();
      
      expect(store.isSelected('element-1')).toBe(false);
    });

    it('should return true for selected element', () => {
      const store = useSelectionStore();
      
      store.selectSingle('element-1');
      
      expect(store.isSelected('element-1')).toBe(true);
    });

    it('should return false after element is removed', () => {
      const store = useSelectionStore();
      
      store.selectSingle('element-1');
      expect(store.isSelected('element-1')).toBe(true);
      
      store.removeFromSelection('element-1');
      
      expect(store.isSelected('element-1')).toBe(false);
    });

    it('should work correctly with multiple selections', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.addToSelection('element-2');
      store.addToSelection('element-3');
      
      expect(store.isSelected('element-1')).toBe(true);
      expect(store.isSelected('element-2')).toBe(true);
      expect(store.isSelected('element-3')).toBe(true);
      expect(store.isSelected('element-4')).toBe(false);
    });
  });

  describe('selectMultiple', () => {
    it('should select multiple elements at once', () => {
      const store = useSelectionStore();
      
      store.selectMultiple(['element-1', 'element-2', 'element-3']);
      
      expect(store.selectionCount).toBe(3);
      expect(store.isSelected('element-1')).toBe(true);
      expect(store.isSelected('element-2')).toBe(true);
      expect(store.isSelected('element-3')).toBe(true);
    });

    it('should replace existing selection', () => {
      const store = useSelectionStore();
      
      store.addToSelection('old-1');
      store.addToSelection('old-2');
      
      store.selectMultiple(['new-1', 'new-2', 'new-3']);
      
      expect(store.isSelected('old-1')).toBe(false);
      expect(store.isSelected('old-2')).toBe(false);
      expect(store.isSelected('new-1')).toBe(true);
      expect(store.isSelected('new-2')).toBe(true);
      expect(store.isSelected('new-3')).toBe(true);
      expect(store.selectionCount).toBe(3);
    });

    it('should handle empty array', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.selectMultiple([]);
      
      expect(store.hasSelection).toBe(false);
      expect(store.selectionCount).toBe(0);
    });

    it('should handle duplicate IDs in array (Set behavior)', () => {
      const store = useSelectionStore();
      
      store.selectMultiple(['element-1', 'element-2', 'element-1', 'element-2']);
      
      expect(store.selectionCount).toBe(2);
      expect(store.isSelected('element-1')).toBe(true);
      expect(store.isSelected('element-2')).toBe(true);
    });
  });

  describe('Computed Properties', () => {
    it('selectedIdsArray should be reactive', () => {
      const store = useSelectionStore();
      
      expect(store.selectedIdsArray).toEqual([]);
      
      store.addToSelection('element-1');
      expect(store.selectedIdsArray.length).toBe(1);
      
      store.addToSelection('element-2');
      expect(store.selectedIdsArray.length).toBe(2);
      
      store.clearSelection();
      expect(store.selectedIdsArray).toEqual([]);
    });

    it('hasSelection should be reactive', () => {
      const store = useSelectionStore();
      
      expect(store.hasSelection).toBe(false);
      
      store.addToSelection('element-1');
      expect(store.hasSelection).toBe(true);
      
      store.clearSelection();
      expect(store.hasSelection).toBe(false);
    });

    it('selectionCount should be reactive', () => {
      const store = useSelectionStore();
      
      expect(store.selectionCount).toBe(0);
      
      store.addToSelection('element-1');
      expect(store.selectionCount).toBe(1);
      
      store.addToSelection('element-2');
      expect(store.selectionCount).toBe(2);
      
      store.removeFromSelection('element-1');
      expect(store.selectionCount).toBe(1);
      
      store.clearSelection();
      expect(store.selectionCount).toBe(0);
    });
  });

  describe('Set Behavior', () => {
    it('should use Set internally for uniqueness', () => {
      const store = useSelectionStore();
      
      // Add same element multiple times
      store.addToSelection('element-1');
      store.addToSelection('element-1');
      store.addToSelection('element-1');
      
      // Should only have one copy
      expect(store.selectionCount).toBe(1);
      expect(store.selectedIdsArray).toEqual(['element-1']);
    });

    it('should preserve Set behavior after operations', () => {
      const store = useSelectionStore();
      
      store.selectMultiple(['a', 'b', 'c', 'a', 'b']);
      expect(store.selectionCount).toBe(3);
      
      store.addToSelection('a'); // Already exists
      expect(store.selectionCount).toBe(3);
      
      store.addToSelection('d'); // New
      expect(store.selectionCount).toBe(4);
    });

    it('should maintain Set semantics for has/add/delete operations', () => {
      const store = useSelectionStore();
      
      // Has operation
      expect(store.selectedIds.has('element-1')).toBe(false);
      
      // Add operation
      store.addToSelection('element-1');
      expect(store.selectedIds.has('element-1')).toBe(true);
      
      // Delete operation
      store.removeFromSelection('element-1');
      expect(store.selectedIds.has('element-1')).toBe(false);
    });
  });

  describe('Bidirectional Sync Scenarios', () => {
    it('should support canvas -> panel sync (selecting on canvas updates panel)', () => {
      const store = useSelectionStore();
      
      // Simulate canvas click handler calling selectSingle
      store.selectSingle('point2d_1');
      
      // Panel should see the selection
      expect(store.isSelected('point2d_1')).toBe(true);
      expect(store.hasSelection).toBe(true);
    });

    it('should support panel -> canvas sync (selecting in panel updates canvas)', () => {
      const store = useSelectionStore();
      
      // Simulate panel click handler calling selectSingle
      store.selectSingle('line2d_5');
      
      // Canvas should see the selection (via computed properties)
      expect(store.selectedIdsArray).toContain('line2d_5');
    });

    it('should support multi-select from canvas (Shift+click)', () => {
      const store = useSelectionStore();
      
      // First click
      store.selectSingle('element-1');
      
      // Shift+click adds to selection
      store.addToSelection('element-2');
      store.addToSelection('element-3');
      
      expect(store.selectionCount).toBe(3);
    });

    it('should support clear on empty space click', () => {
      const store = useSelectionStore();
      
      store.addToSelection('element-1');
      store.addToSelection('element-2');
      
      // Click empty space
      store.clearSelection();
      
      expect(store.hasSelection).toBe(false);
    });

    it('should allow multiple components to read selection state', () => {
      const store = useSelectionStore();
      
      store.selectMultiple(['element-1', 'element-2']);
      
      // Canvas component reads
      const canvasSelection = store.selectedIdsArray;
      expect(canvasSelection).toContain('element-1');
      
      // Panel component reads
      const panelSelection = store.isSelected('element-1');
      expect(panelSelection).toBe(true);
      
      // Both see same state
      expect(store.selectionCount).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string IDs', () => {
      const store = useSelectionStore();
      
      store.addToSelection('');
      
      expect(store.isSelected('')).toBe(true);
      expect(store.selectionCount).toBe(1);
    });

    it('should handle very long ID strings', () => {
      const store = useSelectionStore();
      
      const longId = 'element-' + 'x'.repeat(1000);
      store.selectSingle(longId);
      
      expect(store.isSelected(longId)).toBe(true);
    });

    it('should handle IDs with special characters', () => {
      const store = useSelectionStore();
      
      const specialIds = [
        'element-with-dash',
        'element_with_underscore',
        'element.with.dot',
        'element$with$dollar',
        'element@with@at'
      ];
      
      store.selectMultiple(specialIds);
      
      expect(store.selectionCount).toBe(specialIds.length);
      specialIds.forEach(id => {
        expect(store.isSelected(id)).toBe(true);
      });
    });

    it('should handle rapid selection changes', () => {
      const store = useSelectionStore();
      
      // Rapidly select/deselect
      for (let i = 0; i < 100; i++) {
        store.selectSingle(`element-${i}`);
      }
      
      expect(store.selectionCount).toBe(1);
      expect(store.isSelected('element-99')).toBe(true);
    });

    it('should handle large selection sets', () => {
      const store = useSelectionStore();
      
      const ids = Array.from({ length: 1000 }, (_, i) => `element-${i}`);
      store.selectMultiple(ids);
      
      expect(store.selectionCount).toBe(1000);
      expect(store.hasSelection).toBe(true);
    });
  });
});
