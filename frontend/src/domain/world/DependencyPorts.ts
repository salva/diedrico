/**
 * Dependency port interfaces.
 *
 * DependencyService owns the mutable dependency graph, but callers should
 * narrow themselves to the port surface they need: registrar for write
 * operations (register/unregister) or query for read operations (lookup,
 * deletion order).
 */

export interface DependencyRegistrarPort {
  registerNode(outputId: string, inputIds: string[]): void;
  unregisterNode(elementId: string): void;
}

export interface DependencyQueryPort {
  getDependents(elementId: string): string[];
  getDependencies(elementId: string): string[];
  getAllDependents(elementId: string): string[];
  getElementsInDeletionOrder(elementIds: string[]): string[];
}
