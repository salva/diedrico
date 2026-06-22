import type { IOperation, OperationDescriptor } from './IOperation';

type OperationRestorer<TDescriptor extends OperationDescriptor = OperationDescriptor> = (descriptor: TDescriptor) => IOperation;

export class OperationRegistry {
  private readonly restorers = new Map<string, OperationRestorer>();

  register<TDescriptor extends OperationDescriptor>(opType: TDescriptor['opType'], restore: OperationRestorer<TDescriptor>): void {
    if (this.restorers.has(opType)) {
      throw new Error(`Duplicate operation descriptor registration: ${opType}`);
    }
    this.restorers.set(opType, restore as OperationRestorer);
  }

  deserialize(descriptor: OperationDescriptor): IOperation {
    assertOperationDescriptor(descriptor);
    const restore = this.restorers.get(descriptor.opType);
    if (!restore) {
      throw new Error(`Unknown operation type: ${descriptor.opType}`);
    }
    return restore(descriptor);
  }

  assertRestorable(descriptor: OperationDescriptor): void {
    this.deserialize(descriptor);
  }

  serialize(operation: IOperation): OperationDescriptor {
    if (!operation.serialize) {
      throw new Error(`Operation type cannot be persisted without a descriptor serializer: ${operation.type}`);
    }
    const descriptor = operation.serialize();
    assertOperationDescriptor(descriptor);
    if (!this.restorers.has(descriptor.opType)) {
      throw new Error(`Operation type is not registered: ${descriptor.opType}`);
    }
    return descriptor;
  }

  getRegisteredTypes(): readonly string[] {
    return [...this.restorers.keys()].sort();
  }
}

export function assertOperationDescriptor(value: unknown): asserts value is OperationDescriptor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid operation descriptor: expected object');
  }
  const opType = (value as { opType?: unknown }).opType;
  if (typeof opType !== 'string' || opType.length === 0) {
    throw new Error('Invalid operation descriptor: missing opType');
  }
}

const defaultRegistry = new OperationRegistry();
let registered = false;

function registerAllOperations(registry: OperationRegistry = defaultRegistry): OperationRegistry {
  if (registry === defaultRegistry && registered) {
    return defaultRegistry;
  }
  registerWorldOperationDescriptors(registry);
  registerProcessTreeOperationDescriptors(registry);
  if (registry === defaultRegistry) {
    registered = true;
  }
  return registry;
}

export function serializeOperation(operation: IOperation): OperationDescriptor {
  return registerAllOperations().serialize(operation);
}

export function deserializeOperation(descriptor: OperationDescriptor): IOperation {
  return registerAllOperations().deserialize(descriptor);
}

export function assertRestorableOperationDescriptor(descriptor: OperationDescriptor): void {
  registerAllOperations().assertRestorable(descriptor);
}

export function getRegisteredOperationTypes(): readonly string[] {
  return registerAllOperations().getRegisteredTypes();
}

import { registerWorldOperationDescriptors } from './world/registerWorldOperationDescriptors';
import { registerProcessTreeOperationDescriptors } from './processTree/registerProcessTreeOperationDescriptors';
