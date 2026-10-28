export interface ParsedPlaneCoordinates {
  u: number;
  v: number;
}

export class PlaneCoordinateParseError extends Error {
  constructor(message = 'Enter coordinates as u,v') {
    super(message);
    this.name = 'PlaneCoordinateParseError';
  }
}

export function parsePlaneCoordinateInput(input: string): ParsedPlaneCoordinates {
  const normalized = input.trim().replace(/^\((.*)\)$/, '$1').trim();
  if (!normalized) throw new PlaneCoordinateParseError();

  const parts = normalized.includes(';')
    ? normalized.split(';').map(part => part.trim().replace(',', '.'))
    : normalized.split(',').map(part => part.trim());

  if (parts.length !== 2 || parts.some(part => part.length === 0)) {
    throw new PlaneCoordinateParseError();
  }

  const u = Number(parts[0]);
  const v = Number(parts[1]);
  if (!Number.isFinite(u) || !Number.isFinite(v)) {
    throw new PlaneCoordinateParseError('Coordinates must be finite numbers');
  }

  return { u, v };
}
