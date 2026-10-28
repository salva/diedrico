import { describe, expect, it } from 'vitest';
import { parsePlaneCoordinateInput } from '@/application/coordinates/parsePlaneCoordinateInput';

describe('parsePlaneCoordinateInput', () => {
  it('parses comma-separated dot-decimal coordinates', () => {
    expect(parsePlaneCoordinateInput('-20,105')).toEqual({ u: -20, v: 105 });
    expect(parsePlaneCoordinateInput('37.45, 70.36')).toEqual({ u: 37.45, v: 70.36 });
    expect(parsePlaneCoordinateInput('(+10,-30)')).toEqual({ u: 10, v: -30 });
  });

  it('parses semicolon-separated decimal-comma coordinates', () => {
    expect(parsePlaneCoordinateInput('-20,5;10,2')).toEqual({ u: -20.5, v: 10.2 });
  });

  it('rejects malformed or non-finite coordinates', () => {
    expect(() => parsePlaneCoordinateInput('-20')).toThrow('Enter coordinates as u,v');
    expect(() => parsePlaneCoordinateInput('-20,105,0')).toThrow('Enter coordinates as u,v');
    expect(() => parsePlaneCoordinateInput('Infinity,0')).toThrow('Coordinates must be finite numbers');
    expect(() => parsePlaneCoordinateInput('u=-20, v=105')).toThrow('Coordinates must be finite numbers');
  });
});
