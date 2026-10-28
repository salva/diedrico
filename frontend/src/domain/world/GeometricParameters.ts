import { Vector3 } from 'three';

export const MIN_PARAMETER_RADIUS = 1e-6;

export function normalizeAngleRadians(angle: number): number {
  if (!Number.isFinite(angle)) {
    throw new Error('Angle must be finite.');
  }
  const twoPi = Math.PI * 2;
  let normalized = ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  if (normalized <= -Math.PI) normalized += twoPi;
  return normalized;
}

export function rotateVector2D(vector: Vector3, angleRadians: number): Vector3 {
  const angle = normalizeAngleRadians(angleRadians);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return new Vector3(
    vector.x * cos - vector.y * sin,
    vector.x * sin + vector.y * cos,
    0,
  );
}

export function signedAngleCCW(from: Vector3, to: Vector3): number {
  const cross = from.x * to.y - from.y * to.x;
  const dot = from.x * to.x + from.y * to.y;
  return normalizeAngleRadians(Math.atan2(cross, dot));
}

export function finiteRadiusVector(vector: Vector3): Vector3 {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) {
    throw new Error('Radius vector components must be finite.');
  }
  const radiusVector = new Vector3(vector.x, vector.y, 0);
  if (radiusVector.length() < MIN_PARAMETER_RADIUS) {
    throw new Error(`Radius must be at least ${MIN_PARAMETER_RADIUS}.`);
  }
  return radiusVector;
}
