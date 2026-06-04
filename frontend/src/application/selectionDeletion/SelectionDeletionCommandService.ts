import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import type { OperationContext } from '@/commands/operations/OperationContext';
import { DeletionSequenceFactory } from '@/commands/factories/DeletionSequenceFactory';
import type { World } from '@/domain/world/World';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { SelectionDeletionCommandPort } from './SelectionDeletionPorts';

const noopChangeNotifier: ChangeNotifier = { notifyChange: () => {} };

interface SelectionDeletionCommandServiceInternals {
  createCommand(description: string, context: OperationContext, notifier: ChangeNotifier): Command;
  createCascadeDeletion(command: Command, selectedIds: string[], world: World): void;
}

const defaultInternals: SelectionDeletionCommandServiceInternals = {
  createCommand: (description, context, notifier) => new Command(description, context, notifier),
  createCascadeDeletion: (command, selectedIds, world) => {
    DeletionSequenceFactory.createCascadeDeletion(command, selectedIds, world);
  },
};

export class SelectionDeletionCommandService implements SelectionDeletionCommandPort {
  private readonly internals: SelectionDeletionCommandServiceInternals;
  private readonly notifier: ChangeNotifier;
  private readonly visibilityModel: VisibilityModel;
  private readonly commandStack: CommandStack;

  constructor(
    private readonly world: World,
    visibilityModel: VisibilityModel,
    commandStack: CommandStack,
    notifierOrInternals: ChangeNotifier | Partial<SelectionDeletionCommandServiceInternals> = noopChangeNotifier,
    internals: Partial<SelectionDeletionCommandServiceInternals> | undefined = undefined,
  ) {
    this.visibilityModel = visibilityModel;
    this.commandStack = commandStack;
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

    const deleteCommand = this.internals.createCommand('Delete elements', {
      world: this.world,
      visibilityModel: this.visibilityModel,
      processTree: this.world.getProcessTree(),
      dependencies: this.world.getDependencyService(),
      realizations: this.world.getRealizationService(),
      constructionService: this.world.getConstructionService(),
      idAllocator: this.world.getIdAllocator(),
      labelGenerator: this.world.labelGenerator,
    }, this.notifier);
    this.internals.createCascadeDeletion(deleteCommand, [...selectedIds], this.world);
    deleteCommand.commit();
    this.commandStack.push(deleteCommand);
  }
}
