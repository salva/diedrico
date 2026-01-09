/**
 * Command status tracking for incremental execution
 */
export enum CommandStatus {
  Building = 'building',      // Operations being added/executed
  Committed = 'committed',    // Command complete, in undo stack
  Undone = 'undone'           // Command has been undone
}

/**
 * Result of an operation execution
 * Contains structured outputs with symbolic paths and fixed values
 */
export interface OperationResult {
  success: boolean;
  outputs: Record<string, any>;  // Dictionary of symbolic paths or fixed values
  error?: string;
}
