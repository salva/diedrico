/**
 * Dependency port interfaces.
 *
 * DependencyService owns the mutable dependency graph, but callers should
 * narrow themselves to the port surface they need: registrar for write
 * operations (register/unregister), query for read operations (lookup,
 * deletion order), or the full service for internal domain mutation
 * (invalidation).
 *
 * ProjectionPlaneDependencyRegistrar in ProjectionPlaneContext.ts already
 * provides a narrower registrar surface for projection-plane element stores.
 * This file generalises that pattern for application-layer callers.
 */

export interface DependencyRegistrarPort {
  registerNode(outputId: string, inputIds: string[]): void;
  unregisterNode(elementId: string): void;
}

export interface DependencyQueryPort {
  getDependents(elementId: string): string[];
  getDependencies(elementId: string): string[];
  getAllDependents(elementId: string): string[];
  getAllDependencies(elementId: string): string[];
  getElementsInDeletionOrder(elementIds: string[]): string[];
  getElementDependencies(elementId: string): { dependencies: string[]; dependents: string[] };
}