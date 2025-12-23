/**
 * Result type for operations that can fail
 * Implements Railway-Oriented Programming pattern
 */
export type Result<T, E = string> = Ok<T> | Err<E>;

export interface Ok<T> {
  ok: true;
  value: T;
}

export interface Err<E> {
  ok: false;
  error: E;
}

/**
 * Constructor functions for Result type
 */
export function Ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function Err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Helper to check if Result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/**
 * Helper to check if Result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Reasons why geometric construction may be infeasible
 */
export enum InfeasibilityReason {
  CoincidentPoints = 'coincident_points',
  CollinearPoints = 'collinear_points',
  ParallelLines = 'parallel_lines',
  NoIntersection = 'no_intersection',
  InvalidRadius = 'invalid_radius',
  IncompatibleProjections = 'incompatible_projections',
  MissingDependency = 'missing_dependency',
  CircularDependency = 'circular_dependency'
}
