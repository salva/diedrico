import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FreePoint2D } from '@/domain/world/Point';
import { RealizationService } from '@/domain/world/RealizationService';
import { AuxiliaryProjectionPlane } from '@/domain/world/projectionPlane/AuxiliaryProjectionPlane';
import type { DependencyQueryPort } from '@/domain/world/DependencyPorts';
import { createTestWorld } from '../../helpers/worldHelpers';

describe('RealizationService', () => {
  it('invalidates one cached 2D realization without clearing unrelated entries', () => {
    const { world } = createTestWorld();
    const service = new RealizationService();
    const point = new FreePoint2D('projPlane1/point1', new Vector3(0, 0, 1), 'projPlane1');
    const otherPoint = new FreePoint2D('projPlane1/point2', new Vector3(1, 1, 1), 'projPlane1');
    const dependencyQuery: DependencyQueryPort = {
      getDependents: () => [],
      getDependencies: () => [],
      getAllDependents: () => [],
      getElementsInDeletionOrder: (ids) => ids,
    };

    const pointRealization = service.realizePoint2D(point, world);
    const otherRealization = service.realizePoint2D(otherPoint, world);

    expect(service.invalidateElement(point.id, dependencyQuery, new Map())).toEqual([point.id]);

    expect(service.realizePoint2D(point, world)).not.toBe(pointRealization);
    expect(service.realizePoint2D(otherPoint, world)).toBe(otherRealization);
  });

  it('clears auxiliary projection-plane matrix caches when a trace dependency is invalidated', () => {
    const { world } = createTestWorld();
    const service = new RealizationService();
    const traceId = 'projPlane1/trace-line';
    const plane = new AuxiliaryProjectionPlane('auxPlane1', 'Auxiliary', traceId, 'other-trace', 'other-trace-prime');
    const dependencyQuery: DependencyQueryPort = {
      getDependents: () => [],
      getDependencies: () => [],
      getAllDependents: () => [],
      getElementsInDeletionOrder: (ids) => ids,
    };

    const first2D = service.realizeProjectionPlane2D(plane, world);
    const first3D = service.realizeProjectionPlane3D(plane, world);

    service.invalidateElement(traceId, dependencyQuery, [plane]);

    expect(service.realizeProjectionPlane2D(plane, world)).not.toBe(first2D);
    expect(service.realizeProjectionPlane3D(plane, world)).not.toBe(first3D);
  });
});
