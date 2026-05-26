export type ToolbarHistoryIntent = 'undo' | 'redo';

export interface ToolbarHistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export interface ToolbarHistoryResult {
  success: boolean;
  state: ToolbarHistoryState;
  error?: string;
}

export interface ToolbarHistoryIntentSink {
  getState(): ToolbarHistoryState;
  subscribe(listener: () => void): () => void;
  undo(): ToolbarHistoryResult;
  redo(): ToolbarHistoryResult;
}
