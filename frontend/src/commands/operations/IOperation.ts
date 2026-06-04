/**
 * IOperation - Base interface for atomic, reversible mutations.
 *
 * Operations are the smallest command-contained domain change. Persistence is owned by
 * each operation's typed descriptor plus the operation registry; ProjectService must
 * not inspect mutable operation internals or contain operation reconstruction cases.
 */

import type { OperationContext } from './OperationContext';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type OperationOutputBag = JsonObject & Record<string, any>;

export interface OperationResult<TOutputs extends JsonObject = JsonObject> {
  success: boolean;
  outputs: TOutputs;
  error?: string;
}

export interface OperationDescriptor<TType extends string = string, TPayload extends JsonObject = JsonObject> extends JsonObject {
  opType: TType;
  // New descriptors should put operation parameters as flat top-level fields next to opType.
  // Keep payload only for existing serialized shapes that already use it.
  payload?: TPayload;
}

export type SerializedOperation = OperationDescriptor;

export interface IOperation<
  TDescriptor extends OperationDescriptor = OperationDescriptor,
  TOutputs extends JsonObject = JsonObject
> {
  type: TDescriptor['opType'];
  apply(context: OperationContext): OperationResult<TOutputs>;
  undo(context: OperationContext): void;
  serialize?(): TDescriptor;
  outputs: TOutputs;
}
