/**
 * Unit Tests: UpdateFreePoint2DPositionOp
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { World } from '@/domain/world/World';
import { UpdateFreePoint2DPositionOp } from '@/commands/operations/world/UpdateFreePoint2DPositionOp';
import { getHorizontalPlane, getHorizontalPlaneId, getHorizontalOriginId, createTestWorld } from '../../helpers/worldHelpers';

describe('UpdateFreePoint2DPositionOp', () => {
  let world: World;

  beforeEach(() => {
    const { world: w } = createTestWorld();
    world = w;
  });

  it('updates a free point position and supports undo', () => {
    const plane = getHorizontalPlane(world);
    const planeId = getHorizontalPlaneId(world);

    const point = world.getConstructionService().addFreePoint2D(plane, new Vector3(10, 20, 1));

    const op = new UpdateFreePoint2DPositionOp(planeId, point.id, new Vector3(100, 200, 1));
    const result = op.apply(world);
    expect(result.success).toBe(true);

    const moved = plane.getPoint(point.id);
    expect(moved).toBeDefined();
    expect(moved!.position.x).toBe(100);
    expect(moved.position.y).toBe(200);

    op.undo(world);
    const restored = plane.getPoint(point.id) as any;
    expect(restored.position.x).toBe(10);
    expect(restored.position.y).toBe(20);
  });

  it('refuses to move locked points (origins)', () => {
    const planeId = getHorizontalPlaneId(world);
    const originId = getHorizontalOriginId(world);

    const op = new UpdateFreePoint2DPositionOp(planeId, originId, new Vector3(1, 2, 1));
    const result = op.apply(world);
    expect(result.success).toBe(false);
    expect(result.error).toContain('locked');
  });
});
