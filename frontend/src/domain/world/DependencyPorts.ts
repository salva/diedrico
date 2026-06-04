/**
 * Dependency port interfaces.
 *
 * World is the sole owner of the mutable DependencyService instance.
 *
 * Callers should narrow themselves to the port surface they need: registrar
 * for write operations (register/unregister) or query for read operations
 * (lookup, deletion order). Projection-plane element storage registers and
 * unregisters its elements through DependencyRegistrarPort instead of reaching
 * for DependencyService directly.
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
