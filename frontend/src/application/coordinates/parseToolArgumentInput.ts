import { parsePlaneCoordinateInput } from './parsePlaneCoordinateInput';
import type { ParsedToolArgumentInput, ToolArgumentInputRequest } from '@/types/ToolArgumentInput';
import { Vector3 } from 'three';

function parseScalar(raw: string): number {
  const text = raw.trim().replace(',', '.');
  if (!text) throw new Error('Enter a value.');
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error('Enter a finite number.');
  return value;
}

export function parseToolArgumentInput(
  raw: string,
  request: ToolArgumentInputRequest
): ParsedToolArgumentInput {
  if (request.kind === 'plane-position') {
    const coords = parsePlaneCoordinateInput(raw);
    return { kind: 'plane-position', position: new Vector3(coords.u, coords.v, 1) };
  }

  if (request.valueKind === 'distance') {
    const value = parseScalar(raw);
    if (value <= 0) throw new Error('Distance must be positive.');
    return { kind: 'scalar', valueKind: 'distance', value };
  }

  if (request.valueKind === 'angle') {
    const trimmed = raw.trim().toLowerCase();
    const radiansMatch = trimmed.match(/^([+-]?(?:\d+(?:[.,]\d*)?|\.\d+))\s*rad$/);
    if (radiansMatch) {
      return { kind: 'scalar', valueKind: 'angle', radians: parseScalar(radiansMatch[1]) };
    }
    const degreesText = trimmed.replace(/deg|°/g, '').trim();
    const degrees = parseScalar(degreesText);
    return { kind: 'scalar', valueKind: 'angle', radians: degrees * Math.PI / 180 };
  }

  throw new Error('Unsupported input.');
}
