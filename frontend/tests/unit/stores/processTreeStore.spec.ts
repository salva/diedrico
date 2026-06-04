import { describe, it, expect, beforeEach } from 'vitest';
import { useProcessTreeStore } from '@/stores/processTreeStore';

describe('processTreeStore', () => {
  let store: ReturnType<typeof useProcessTreeStore>;

  beforeEach(() => {
    store = useProcessTreeStore();
    store.reset();
  });

  it('defaults World Initialization to collapsed and others to expanded', () => {
    expect(store.isCollapsed('node-1', 'World Initialization')).toBe(true);
    expect(store.isCollapsed('node-2', 'User Actions')).toBe(false);
  });

  it('toggles collapse state without affecting other nodes', () => {
    store.toggleCollapse('node-1');
    expect(store.isCollapsed('node-1')).toBe(true);
    expect(store.isCollapsed('node-2')).toBe(false);
    store.toggleCollapse('node-1');
    expect(store.isCollapsed('node-1')).toBe(false);
  });
});
