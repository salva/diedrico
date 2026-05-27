import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import { DeletionSequenceFactory } from '@/commands/factories/DeletionSequenceFactory';
import type { World } from '@/domain/world/World';
import type { SelectionDeletionCommandPort } from './SelectionDeletionPorts';

interface SelectionDeletionCommandServiceInternals {
  createCommand(description: string, world: World): Command;
  createCascadeDeletion(command: Command, selectedIds: string[], world: World): void;
}

const defaultInternals: SelectionDeletionCommandServiceInternals = {
  createCommand: (description, world) => new Command(description, world),
  createCascadeDeletion: (command, selectedIds, world) => {
    DeletionSequenceFactory.createCascadeDeletion(command, selectedIds, world);
  },
};

export class SelectionDeletionCommandService implements SelectionDeletionCommandPort {
  private readonly internals: SelectionDeletionCommandServiceInternals;

  constructor(
    private readonly world: World,
    private readonly commandStack: CommandStack,
    internals: Partial<SelectionDeletionCommandServiceInternals> = {},
  ) {
    this.internals = { ...defaultInternals, ...internals };
  }

  execute(selectedIds: readonly string[]): void {
    if (selectedIds.length === 0) return;

    const deleteCommand = this.internals.createCommand('Delete elements', this.world);
    this.internals.createCascadeDeletion(deleteCommand, [...selectedIds], this.world);
    deleteCommand.commit();
    this.commandStack.push(deleteCommand);
  }
}
