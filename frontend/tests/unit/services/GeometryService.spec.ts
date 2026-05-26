import { describe, expect, it } from 'vitest';
import { GeometryService } from '@/services/GeometryService';

function expectOk<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.value;
}

describe('GeometryService', () => {
  it('calculates a finite line-line intersection through the service boundary', () => {
    const result = GeometryService.calculateLineLineIntersection(
      { x1: 0, y1: 0, x2: 10, y2: 10 },
      { x1: 0, y1: 10, x2: 10, y2: 0 }
    );

    expect(expectOk(result)).toEqual({ x: 5, y: 5 });
  });

  it('returns a null intersection for parallel lines', () => {
    const result = GeometryService.calculateLineLineIntersection(
      { x1: 0, y1: 0, x2: 10, y2: 0 },
      { x1: 0, y1: 1, x2: 10, y2: 1 }
    );

    expect(expectOk(result)).toBeNull();
  });
});
