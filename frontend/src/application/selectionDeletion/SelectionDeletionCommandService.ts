import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import { DeletionSequenceFactory } from '@/commands/factories/DeletionSequenceFactory';
import type { World } from '@/domain/world/World';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';
import type { SelectionDeletionCommandPort } from './SelectionDeletionPorts';

const noopChangeNotifier: ChangeNotifier = { notifyChange: () => {} };

interface SelectionDeletionCommandServiceInternals {
  createCommand(description: string, world: World, notifier: ChangeNotifier): Command;
  createCascadeDeletion(command: Command, selectedIds: string[], world: World): void;
}

const defaultInternals: SelectionDeletionCommandServiceInternals = {
  createCommand: (description, world, notifier) => new Command(description, world, notifier),
  createCascadeDeletion: (command, selectedIds, world) => {
    DeletionSequenceFactory.createCascadeDeletion(command, selectedIds, world);
  },
};

export class SelectionDeletionCommandService implements SelectionDeletionCommandPort {
  private readonly internals: SelectionDeletionCommandServiceInternals;
  private readonly notifier: ChangeNotifier;

  constructor(
    private readonly world: World,
    private readonly commandStack: CommandStack,
    notifierOrInternals: ChangeNotifier | Partial<SelectionDeletionCommandServiceInternals> = noopChangeNotifier,
    internals: Partial<SelectionDeletionCommandServiceInternals> | undefined = undefined,
  ) {
    if ('notifyChange' in notifierOrInternals) {
      this.notifier = notifierOrInternals;
      this.internals = { ...defaultInternals, ...(internals ?? {}) };
    } else {
      this.notifier = noopChangeNotifier;
      this.internals = { ...defaultInternals, ...notifierOrInternals };
    }
  }

  execute(selectedIds: readonly string[]): void {
    if (selectedIds.length === 0) return;

    const deleteCommand = this.internals.createCommand('Delete elements', this.world, this.notifier);
    this.internals.createCascadeDeletion(deleteCommand, [...selectedIds], this.world);
    deleteCommand.commit();
    this.commandStack.push(deleteCommand);
  }
}
