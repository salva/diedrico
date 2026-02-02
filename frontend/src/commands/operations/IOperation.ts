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
 * 
 * ========================================
 * SERIALIZATION REQUIREMENTS (Phase 40)
 * ========================================
 * 
 * All IOperation implementations MUST meet these requirements for command sourcing:
 * 
 * 1. **DETERMINISTIC**: Same parameters → same result
 *    - No randomness (Math.random(), crypto.getRandomValues())
 *    - No timestamps (Date.now(), new Date())
 *    - No external dependencies (network calls, file system)
 *    - No reliance on execution order (operations must be independent)
 *    
 * 2. **SERIALIZABLE**: Parameters must be JSON-compatible
 *    - Only primitive types: string, number, boolean, null
 *    - Plain objects: { key: value }
 *    - Arrays: [item1, item2]
 *    - No functions, closures, or circular references
 *    - No class instances (convert to plain objects)
 * 
 * 3. **FLAT SERIALIZATION (Phase 96)**:
 *    - All operations must implement `serialize()` returning a flat object
 *    - Key `opType` identifies the operation class
 *    - All parameters and critical outputs (IDs) must be at root level
 *    
 * 4. **SELF-CONTAINED**: Parameters contain ALL needed data
 *    - Don't rely on World state to provide missing information
 *    - Don't assume specific IDs exist (may fail on fresh World)
 *    - Don't depend on CommandStack history
 *    - All references by ID (string), not object references
 *    
 * 4. **ID MANAGEMENT**: Operations handle IDs correctly
 *    - CREATE operations: Generate ID in constructor, store in outputs
 *    - MODIFY operations: Take elementId as parameter
 *    - DELETE operations: Store elementId + beforeState for undo
 *    - IDs must be stable across serialization (no regeneration on load)
 *    
 * 5. **TYPE FIELD**: Must have unique `type: string` field
 *    - Used by ProjectService.reconstructOperation() switch
 *    - Must match exactly (case-sensitive)
 *    - Example: 'AddFreePoint2D', 'RemoveLine2D', 'UpdateElementStyle'
 *    
 * 6. **PARAMETERS FIELD**: Must expose `parameters: Record<string, any>`
 *    - Contains all data needed to reconstruct operation
 *    - Must be serializable (see requirement #2)
 *    - Used by ProjectService.serializeCommands()
 *    
 * HOW TO ADD A NEW OPERATION:
 * 
 * 1. Create operation class implementing IOperation
 * 2. Add unique `readonly type = 'YourOperationType'` field
 * 3. Store all data in `parameters` object (make it serializable)
 * 4. Add case to ProjectService.reconstructOperation() switch
 * 5. Add test to ProjectService.roundTrip.spec.ts
 * 6. Verify architectural test passes (serializationCoverage.spec.ts)
 * 
 * EXAMPLE - Serializable Operation:
 * 
 * ```typescript
 * export class AddFreePoint2DOp implements IOperation {
 *   readonly type = 'AddFreePoint2D';
 *   parameters: Record<string, any>;
 *   outputs: Record<string, any> = {};
 *   
 *   constructor(planeId: string, position: Vector3) {
 *     // All data in parameters (serializable)
 *     this.parameters = {
 *       planeId,
 *       position: { x: position.x, y: position.y, z: position.z }  // Plain object, not Vector3
 *     };
 *   }
 *   
 *   apply(world: World): OperationResult {
 *     const pointId = world.generateId('point2d');
 *     const plane = world.getProjectionPlane(this.parameters.planeId);
 *     const pos = new Vector3(
 *       this.parameters.position.x,
 *       this.parameters.position.y,
 *       this.parameters.position.z
 *     );
 *     const point = plane.addFreePoint2D(pointId, pos);
 *     
 *     this.outputs = { pointId: point.id };
 *     return { success: true, outputs: this.outputs };
 *   }
 *   
 *   undo(world: World): void {
 *     const plane = world.getProjectionPlane(this.parameters.planeId);
 *     plane.removePoint(this.outputs.pointId);
 *   }
 * }
 * ```
 * 
 * See: ProjectService.ts for full serialization implementation
 * See: ProjectService.roundTrip.spec.ts for serialization tests
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
 * Serialized form of an operation (Phase 96)
 * Flat structure with opType and mixed parameters/outputs
 */
export interface SerializedOperation {
  opType: string;
  [key: string]: any;
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
   * Convert to flat persistent storage format (Phase 96)
   * If not implemented, ProjectService will fallback to legacy format (temporarily)
   */
  serialize?(): SerializedOperation;

  /**
   * Outputs produced by this operation
   * Set after apply() is called
   */
  outputs: Record<string, any>;
}
