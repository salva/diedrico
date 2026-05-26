export interface PushSubprocessRequest {
  name?: string;
}

export interface PopSubprocessRequest {}

export interface ToggleEncapsulationRequest {
  nodeId: string;
}

export interface ToggleOutputRequest {
  nodeId: string;
}

export interface RenameSubprocessRequest {
  nodeId: string;
  newName: string;
}

export interface ProcessHistoryState {
  canPop: boolean;
  activeSubprocessId: string;
  stackDepth: number;
}

export interface ProcessHistoryResult {
  success: boolean;
  state: ProcessHistoryState;
  error?: string;
}

export interface ProcessHistoryIntentSink {
  getState(): ProcessHistoryState;
  pushSubprocess(request?: PushSubprocessRequest): ProcessHistoryResult;
  popSubprocess(request?: PopSubprocessRequest): ProcessHistoryResult;
  toggleEncapsulation(request: ToggleEncapsulationRequest): ProcessHistoryResult;
  toggleOutput(request: ToggleOutputRequest): ProcessHistoryResult;
  renameSubprocess(request: RenameSubprocessRequest): ProcessHistoryResult;
}
