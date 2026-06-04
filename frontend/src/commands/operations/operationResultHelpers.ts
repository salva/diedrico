import type { JsonObject, OperationResult } from './IOperation';

export function operationSuccess<TOutputs extends JsonObject>(outputs: TOutputs): OperationResult<TOutputs> {
  return { success: true, outputs };
}

export function operationFailure<TOutputs extends JsonObject>(error: unknown): OperationResult<TOutputs> {
  return {
    success: false,
    outputs: {} as TOutputs,
    error: error instanceof Error ? error.message : String(error)
  };
}
