/**
 * IOperation - Base interface for atomic, reversible mutations.
 *
 * Operations are the smallest command-contained domain change. Persistence is owned by
 * each operation's typed descriptor plus the operation registry; ProjectService must
 * not inspect mutable operation internals or contain operation reconstruction cases.
 */

import type { World } from '@/domain/world/World';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface OperationResult<TOutputs extends JsonObject = JsonObject> {
  success: boolean;
  outputs: TOutputs;
  error?: string;
}

export interface OperationDescriptor<TType extends string = string, TPayload extends JsonObject = JsonObject> extends JsonObject {
  opType: TType;
  payload?: TPayload;
}

export type SerializedOperation = OperationDescriptor;

export interface IOperation<TDescriptor extends OperationDescriptor = OperationDescriptor> {
  type: TDescriptor['opType'];
  apply(world: World): OperationResult;
  undo(world: World): void;
  serialize?(): TDescriptor;
  outputs: JsonObject;
}
