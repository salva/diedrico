import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import type { OperationContext } from '@/commands/operations/OperationContext';
import { buildWorldInitialization } from '@/commands/factories/InitializationSequenceFactory';
import { AddProcessTreeActionGroupOp } from '@/commands/operations/processTree/AddProcessTreeActionGroupOp';
import { PopSubprocessOp } from '@/commands/operations/processTree/PopSubprocessOp';
import { PushSubprocessOp } from '@/commands/operations/processTree/PushSubprocessOp';
import { createActionGroup } from '@/domain/processTree/ProcessTree';
import type { World } from '@/domain/world/World';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';

const noopChangeNotifier: ChangeNotifier = { notifyChange: () => {} };

function createInitializationGroupId(): string {
  return `group_init_${Date.now()}`;
}

/**
 * Application use case for initializing the default Diedrico world.
 *
 * The domain World owns geometric state only; command construction and history
 * recording belong at the application/command boundary.
 */
export function initializeWorld(
  world: World,
  commandStack: CommandStack,
  operationContext: OperationContext,
  notifier: ChangeNotifier = noopChangeNotifier,
): void {
  if (world.getAllProjectionPlanes().length > 0) return;
  const initCmd = new Command('Initialize World', operationContext, notifier);

  initCmd.addAndExecute(new PushSubprocessOp('World Initialization'));

  const groupId = createInitializationGroupId();
  const group = createActionGroup(groupId);
  initCmd.addAndExecute(new AddProcessTreeActionGroupOp(group));

  buildWorldInitialization(initCmd, groupId);

  initCmd.addAndExecute(new PopSubprocessOp());
  initCmd.commit();
  commandStack.push(initCmd);
  notifier.notifyChange();
}
