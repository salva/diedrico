import type { OperationRegistry } from '../OperationRegistry';
import type { IOperation, JsonObject } from '../IOperation';
import type { ActionGroup, ActionNode, RemovedActionMetadata, Subprocess } from '@/domain/processTree/ProcessTree';
import { AddProcessTreeActionOp } from './AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from './AddProcessTreeActionGroupOp';
import { PushSubprocessOp } from './PushSubprocessOp';
import { PopSubprocessOp } from './PopSubprocessOp';
import { RenameSubprocessOp } from './RenameSubprocessOp';
import { ToggleEncapsulationOp } from './ToggleEncapsulationOp';
import { ToggleOutputOp } from './ToggleOutputOp';
import { RemoveActionFromProcessTreeOp } from './ProcessTreeOperations';

const PROCESS_TREE_SCHEMA_VERSION = '8.0.0';

function assertKeys(d: JsonObject, keys: readonly string[]): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(d)) {
    if (!allowed.has(key)) throw new Error(`Invalid ${String(d.opType)} descriptor: unexpected field ${key}`);
  }
}

function assertV8(d: JsonObject): void {
  if (d.schemaVersion !== PROCESS_TREE_SCHEMA_VERSION) {
    throw new Error(`Invalid ${String(d.opType)} descriptor: schemaVersion must be ${PROCESS_TREE_SCHEMA_VERSION}`);
  }
}

function s(d: JsonObject, key: string): string {
  const v = d[key];
  if (typeof v !== 'string') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be string`);
  return v;
}

function so(d: JsonObject, key: string): string | undefined {
  const v = d[key];
  if (v === undefined) return undefined;
  if (typeof v !== 'string') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be string`);
  return v;
}

function n(d: JsonObject, key: string): number {
  const v = d[key];
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be a non-negative integer`);
  return v;
}

function obj(d: JsonObject, key: string): JsonObject {
  const v = d[key];
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be object`);
  return v as JsonObject;
}

function parseDateIso(d: JsonObject, key: string): Date {
  const value = s(d, key);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be an ISO timestamp`);
  return date;
}

function actionNodeDescriptor(d: JsonObject, key: string): ActionNode {
  const action = obj(d, key);
  assertKeys(action, ['id', 'type', 'created', 'elementId', 'description']);
  if (action.type !== 'action') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key}.type must be action`);
  return {
    id: s(action, 'id'),
    type: 'action',
    created: parseDateIso(action, 'created'),
    elementId: s(action, 'elementId'),
    description: s(action, 'description'),
  } satisfies ActionNode;
}

function actionGroupDescriptor(d: JsonObject): ActionGroup {
  const group = obj(d, 'group');
  assertKeys(group, ['id', 'type', 'created']);
  if (group.type !== 'actionGroup') throw new Error(`Invalid ${String(d.opType)} descriptor: group.type must be actionGroup`);
  return { id: s(group, 'id'), type: 'actionGroup', created: parseDateIso(group, 'created'), children: [] } satisfies ActionGroup;
}

function subprocessDescriptor(d: JsonObject): Subprocess {
  const subprocess = obj(d, 'subprocess');
  assertKeys(subprocess, ['id', 'type', 'created', 'name']);
  if (subprocess.type !== 'subprocess') throw new Error(`Invalid ${String(d.opType)} descriptor: subprocess.type must be subprocess`);
  return { id: s(subprocess, 'id'), type: 'subprocess', created: parseDateIso(subprocess, 'created'), name: s(subprocess, 'name'), children: [] } satisfies Subprocess;
}

function registerStrict(registry: OperationRegistry, opType: string, keys: readonly string[], restore: (d: JsonObject) => IOperation): void {
  registry.register(opType, d => {
    assertV8(d);
    assertKeys(d, keys);
    return restore(d);
  });
}

export function registerProcessTreeOperationDescriptors(registry: OperationRegistry): void {
  registerStrict(registry, 'AddProcessTreeActionOp', ['opType', 'schemaVersion', 'groupId', 'actionNode'], d => (
    new AddProcessTreeActionOp(actionNodeDescriptor(d, 'actionNode'), s(d, 'groupId'))
  ));

  registerStrict(registry, 'AddProcessTreeActionGroup', ['opType', 'schemaVersion', 'group'], d => (
    new AddProcessTreeActionGroupOp(actionGroupDescriptor(d))
  ));

  registerStrict(registry, 'PushSubprocess', ['opType', 'schemaVersion', 'subprocess'], d => {
    const subprocess = subprocessDescriptor(d);
    return new PushSubprocessOp(subprocess.name, subprocess);
  });

  registerStrict(registry, 'PopSubprocess', ['opType', 'schemaVersion'], () => new PopSubprocessOp());
  registerStrict(registry, 'RenameSubprocess', ['opType', 'schemaVersion', 'subprocessId', 'newName'], d => new RenameSubprocessOp(s(d, 'subprocessId'), s(d, 'newName')));
  registerStrict(registry, 'ToggleEncapsulation', ['opType', 'schemaVersion', 'subprocessId'], d => new ToggleEncapsulationOp(s(d, 'subprocessId')));
  registerStrict(registry, 'ToggleOutput', ['opType', 'schemaVersion', 'nodeId'], d => new ToggleOutputOp(s(d, 'nodeId')));
  registerStrict(registry, 'RemoveActionFromProcessTree', ['opType', 'schemaVersion', 'groupId', 'actionId', 'removedActionNode', 'originalIndex', 'previousSiblingId', 'nextSiblingId'], d => {
    const metadata: RemovedActionMetadata = {
      groupId: s(d, 'groupId'),
      actionNode: actionNodeDescriptor(d, 'removedActionNode'),
      originalIndex: n(d, 'originalIndex'),
      previousSiblingId: so(d, 'previousSiblingId'),
      nextSiblingId: so(d, 'nextSiblingId'),
    };
    return new RemoveActionFromProcessTreeOp(s(d, 'actionId'), metadata);
  });
}
