import { useProcessStore } from '@/stores/processStore';
import type { Command } from '@/commands/Command';

/**
 * Result type for command execution
 */
export interface CommandResult<T = any> {
  success: boolean;
  value?: T;
  error?: string;
}

/**
 * Composable for building and executing commands
 * Handles command construction, validation, and execution with undo/redo
 */
export function useCommandExecution() {
  const processStore = useProcessStore();

  /**
   * Execute a command with full lifecycle
   * 1. Validate command
   * 2. Execute (addAndExecute on command)
   * 3. Add to command history
   * 4. Return result
   */
  const executeCommand = async <T = any>(command: Command): Promise<CommandResult<T>> => {
    try {
      // Validate command before execution
      const validation = await command.validate();
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Command validation failed'
        };
      }

      // Execute command (this calls addAndExecute which commits all operations)
      const result = await command.addAndExecute();

      // Add to command history for undo/redo
      processStore.pushCommand(command);

      return {
        success: true,
        value: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed'
      };
    }
  };

  /**
   * Execute command without adding to history (for preview/test)
   */
  const previewCommand = async <T = any>(command: Command): Promise<CommandResult<T>> => {
    try {
      const validation = await command.validate();
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Command validation failed'
        };
      }

      const result = await command.addAndExecute();

      return {
        success: true,
        value: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command preview failed'
      };
    }
  };

  /**
   * Undo last command
   */
  const undo = (): boolean => {
    return processStore.undo();
  };

  /**
   * Redo last undone command
   */
  const redo = (): boolean => {
    return processStore.redo();
  };

  /**
   * Check if undo is available
   */
  const canUndo = (): boolean => {
    return processStore.canUndo;
  };

  /**
   * Check if redo is available
   */
  const canRedo = (): boolean => {
    return processStore.canRedo;
  };

  return {
    executeCommand,
    previewCommand,
    undo,
    redo,
    canUndo,
    canRedo
  };
}
