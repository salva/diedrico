import type { Vector3 } from 'three';

export interface ToolArgumentInputRequest {
  kind: 'plane-position' | 'scalar';
  valueKind?: 'distance' | 'angle';
  label: string;
  placeholder: string;
}

export type ParsedToolArgumentInput =
  | { kind: 'plane-position'; position: Vector3 }
  | { kind: 'scalar'; valueKind: 'distance'; value: number }
  | { kind: 'scalar'; valueKind: 'angle'; radians: number };
