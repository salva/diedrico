/**
 * IOperation - Base interface for atomic, reversible mutations
 * 
 * Operations represent the smallest unit of change in the system.
 * They are composable, reversible, and can be serialized.
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md §Operation
 * 
 * Key Principles:
 * - Operations execute immediately (not deferred)
 * - Each operation stores both "before" and "after" state for undo
 * - Operations use symbolic paths to reference entities (for serialization)
 * - Operations return outputs that later operations can use
 */

import type { World } from '@/domain/world/World';

/**
 * Result of executing an operation
 */
export interface OperationResult {
  success: boolean;
  outputs: Record<string, any>;  // Named outputs (e.g., { "elementPath": "/world/elements2D/p1", "x": 100 })
  error?: string;
}

/**
 * Base interface for all operations
 */
export interface IOperation {
  type: string;                           // Operation type identifier
  parameters: Record<string, any>;        // Contains both "before" and "after" state
  
  /**
   * Apply the operation to the world
   * Executes the change and stores outputs for use by later operations
   */
  apply(world: World): OperationResult;
  
  /**
   * Reverse the operation using stored "before" state
   * Must restore the world to exactly the state it was in before apply()
   */
  undo(world: World): void;
  
  /**
   * Outputs produced by this operation
   * Set after apply() is called
   */
  outputs: Record<string, any>;
}
