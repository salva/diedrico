import { describe, expect, it, vi } from 'vitest';
import { DependencyService } from '@/domain/world/DependencyService';

describe('DependencyService', () => {
  it('tracks direct dependencies and transitive dependents', () => {
    const service = new DependencyService();

    service.registerNode('line-1', ['point-1', 'point-2']);
    service.registerNode('circle-1', ['line-1']);

    expect(service.getDependencies('line-1')).toEqual(['point-1', 'point-2']);
    expect(service.getDependents('line-1')).toEqual(['circle-1']);
    expect(service.getAllDependents('point-1')).toEqual(['line-1', 'circle-1']);
  });

  it('orders cascade deletion with dependents before selected roots', () => {
    const service = new DependencyService();

    service.registerNode('line-1', ['point-1', 'point-2']);
    service.registerNode('circle-1', ['line-1']);

    expect(service.getElementsInDeletionOrder(['point-1'])).toEqual(['circle-1', 'line-1', 'point-1']);
  });

  it('updates reverse edges when a node is re-registered', () => {
    const service = new DependencyService();

    service.registerNode('line-1', ['point-1', 'point-2']);
    service.registerNode('line-1', ['point-2']);

    expect(service.getDependents('point-1')).toEqual([]);
    expect(service.getDependents('point-2')).toEqual(['line-1']);
    expect(service.getDependencies('line-1')).toEqual(['point-2']);
  });

  it('invalidates a changed element and each dependent once', () => {
    const service = new DependencyService();
    const invalidate = vi.fn();

    service.registerNode('line-1', ['point-1']);
    service.registerNode('circle-1', ['point-1', 'line-1']);

    service.invalidateCascade('point-1', invalidate);

    expect(invalidate.mock.calls.map(([id]) => id)).toEqual(['point-1', 'line-1', 'circle-1']);
  });
});
