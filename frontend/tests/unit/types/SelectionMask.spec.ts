import { describe, it, expect } from 'vitest';
import { SelectionMask, isTypeMask, isUnionMask } from '@/types/SelectionMask';
import { FreePoint2D } from '@/domain/world/Point';
import { Line2DByTwoPoints } from '@/domain/world/Line';
import { Segment2DByPoints } from '@/domain/world/Segment';
import { Guide2D } from '@/domain/world/Guide';
import { Circle2DByCenterAndPoint } from '@/domain/world/Circle';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { Vector3 } from 'three';

describe('SelectionMask', () => {
  const planeId = 'projPlane1';
  const point = new FreePoint2D(`${planeId}/point2d_1`, new Vector3(0, 0, 1), planeId);
  const line = new Line2DByTwoPoints(`${planeId}/line2d_1`, `${planeId}/point2d_1`, `${planeId}/point2d_2`, planeId);
  const segment = new Segment2DByPoints(`${planeId}/segment2d_1`, `${planeId}/point2d_1`, `${planeId}/point2d_2`, planeId);
  const guide = new Guide2D(`${planeId}/guide2d_1`, `${planeId}/point2d_1`, new Vector3(1, 0, 0), planeId);
  const circle = new Circle2DByCenterAndPoint(`${planeId}/circle2d_1`, `${planeId}/point2d_1`, `${planeId}/point2d_2`, planeId);
  const halfHingeLine = new HalfHingeLine2D(`${planeId}/hhl2d_1`, { id: 'hinge_1' } as any, planeId);

  it('matches concrete element categories', () => {
    expect(SelectionMask.point().matches(point)).toBe(true);
    expect(SelectionMask.point().matches(line)).toBe(false);
    expect(SelectionMask.line().matches(line)).toBe(true);
    expect(SelectionMask.line().matches(segment)).toBe(true);
    expect(SelectionMask.line().matches(guide)).toBe(true);
    expect(SelectionMask.line().matches(halfHingeLine)).toBe(true);
    expect(SelectionMask.circle().matches(circle)).toBe(true);
    expect(SelectionMask.circle().matches(point)).toBe(false);
  });

  it('supports union masks and single-item unwrap', () => {
    const union = SelectionMask.union(SelectionMask.point(), SelectionMask.circle());
    expect(union.matches(point)).toBe(true);
    expect(union.matches(circle)).toBe(true);
    expect(union.matches(line)).toBe(false);
    expect(isUnionMask(union)).toBe(true);
    expect(isTypeMask(SelectionMask.union(SelectionMask.point()))).toBe(true);
    expect(() => SelectionMask.union()).toThrow('union() requires at least one mask');
  });

  it('creates factory masks', () => {
    expect(isTypeMask(SelectionMask.point())).toBe(true);
    expect(isTypeMask(SelectionMask.line())).toBe(true);
    expect(isTypeMask(SelectionMask.segment())).toBe(true);
    expect(isTypeMask(SelectionMask.circle())).toBe(true);
    expect(isTypeMask(SelectionMask.halfHingeLine())).toBe(true);
    expect(SelectionMask.none().matches(point)).toBe(false);
  });
});
