import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSelectionStore } from '../../../src/stores/selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('selects one or many elements', () => {
    const store = useSelectionStore();
    store.selectSingle('element-1');
    expect(store.selectedIdsArray).toEqual(['element-1']);
    store.addToSelection('element-2');
    expect(store.selectedIdsArray).toEqual(['element-1', 'element-2']);
    expect(store.isSelected('element-2')).toBe(true);
    store.selectMultiple(['element-3', 'element-4']);
    expect(store.selectedIdsArray).toEqual(['element-3', 'element-4']);
  });

  it('clears selections and cascade highlights', () => {
    const store = useSelectionStore();
    store.selectMultiple(['a', 'b']);
    store.clearSelection();
    expect(store.selectedIdsArray).toEqual([]);
    store.setCascadeHighlight(['dependent']);
    expect(store.cascadeHighlightIdsArray).toEqual(['dependent']);
    store.clearCascadeHighlight();
    expect(store.cascadeHighlightIdsArray).toEqual([]);
  });
});
