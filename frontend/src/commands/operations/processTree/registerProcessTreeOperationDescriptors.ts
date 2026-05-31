import type { OperationRegistry } from '../OperationRegistry';
import type { JsonObject } from '../IOperation';
import { createActionGroup } from '@/domain/processTree/ActionGroup';
import { AddProcessTreeActionOp } from './AddProcessTreeActionOp';
import { AddProcessTreeActionGroupOp } from './AddProcessTreeActionGroupOp';
import { PushSubprocessOp } from './PushSubprocessOp';
import { PopSubprocessOp } from './PopSubprocessOp';
import { RenameSubprocessOp } from './RenameSubprocessOp';
import { ToggleEncapsulationOp } from './ToggleEncapsulationOp';
import { ToggleOutputOp } from './ToggleOutputOp';
import { RemoveActionFromProcessTreeOp } from './ProcessTreeOperations';
import type { Action } from '@/domain/processTree/Action';

function s(d: JsonObject, key: string): string { const v = d[key]; if (typeof v !== 'string') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be string`); return v; }
function so(d: JsonObject, key: string): string | undefined { const v = d[key]; if (v === undefined || v === null) return undefined; if (typeof v !== 'string') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be string`); return v; }
function obj(d: JsonObject, key: string): JsonObject { const v = d[key]; if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be object`); return v as JsonObject; }
function b(d: JsonObject, key: string): boolean { const v = d[key]; if (typeof v !== 'boolean') throw new Error(`Invalid ${String(d.opType)} descriptor: ${key} must be boolean`); return v; }
function restoreOutput<T extends { outputs: JsonObject }>(op: T, outputs: unknown): T { if (outputs && typeof outputs === 'object' && !Array.isArray(outputs)) op.outputs = outputs as JsonObject; return op; }
function actionDescriptor(d: JsonObject): Action {
  const action = obj(d, 'action');
  return {
    elementId: s(action, 'elementId'),
    description: s(action, 'description'),
    isOutput: b(action, 'isOutput')
  };
}

export function registerProcessTreeOperationDescriptors(registry: OperationRegistry): void {
  registry.register('AddProcessTreeActionOp', d => restoreOutput(new AddProcessTreeActionOp(actionDescriptor(d), s(d, 'groupId')), d.outputs));
  registry.register('AddProcessTreeActionGroup', d => {
    const group = createActionGroup(s(d, 'groupId'));
    group.isOutput = d.isOutput !== false;
    group.isAuxiliary = d.isAuxiliary === true;
    return restoreOutput(new AddProcessTreeActionGroupOp(group), d.outputs);
  });
  registry.register('PushSubprocess', d => restoreOutput(new PushSubprocessOp(s(d, 'subprocessName'), so(d, 'subprocessId')), d.outputs));
  registry.register('PopSubprocess', () => new PopSubprocessOp());
  registry.register('RenameSubprocess', d => new RenameSubprocessOp(s(d, 'subprocessId'), s(d, 'newName')));
  registry.register('ToggleEncapsulation', d => new ToggleEncapsulationOp(s(d, 'subprocessId')));
  registry.register('ToggleOutput', d => new ToggleOutputOp(s(d, 'nodeId')));
  registry.register('RemoveActionFromProcessTree', d => new RemoveActionFromProcessTreeOp(s(d, 'actionId')));
}
