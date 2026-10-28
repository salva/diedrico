import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import type { OperationContext } from '@/commands/operations/OperationContext';
import { DeletionSequenceFactory, type DeletionSequenceContext } from '@/commands/factories/DeletionSequenceFactory';
import type { World } from '@/domain/world/World';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';
import type { SelectionDeletionCommandPort } from './SelectionDeletionPorts';

const noopChangeNotifier: ChangeNotifier = { notifyChange: () => {} };

interface SelectionDeletionCommandServiceInternals {
  createCommand(description: string, context: OperationContext, notifier: ChangeNotifier): Command;
  createCascadeDeletion(command: Command, selectedIds: string[], context: DeletionSequenceContext): void;
}

const defaultInternals: SelectionDeletionCommandServiceInternals = {
  createCommand: (description, context, notifier) => new Command(description, context, notifier),
  createCascadeDeletion: (command, selectedIds, context) => {
    DeletionSequenceFactory.createCascadeDeletion(command, selectedIds, context);
  },
};

export class SelectionDeletionCommandService implements SelectionDeletionCommandPort {
  private readonly internals: SelectionDeletionCommandServiceInternals;
  private readonly notifier: ChangeNotifier;
  private readonly commandStack: CommandStack;

  constructor(
    private readonly world: World,
    commandStack: CommandStack,
    private readonly operationContext: OperationContext,
    internals: Partial<SelectionDeletionCommandServiceInternals> = {},
    notifier: ChangeNotifier = noopChangeNotifier,
  ) {
    this.commandStack = commandStack;
    this.notifier = notifier;
    this.internals = { ...defaultInternals, ...internals };
  }

  execute(selectedIds: readonly string[]): void {
    if (selectedIds.length === 0) return;

    const operationContext = this.operationContext;
    const deleteCommand = this.internals.createCommand('Delete elements', operationContext, this.notifier);
    this.internals.createCascadeDeletion(deleteCommand, [...selectedIds], {
      world: this.world,
      dependencyQuery: operationContext.dependencies,
      processTree: operationContext.processTree,
    });
    deleteCommand.commit();
    this.commandStack.push(deleteCommand);
  }
}
