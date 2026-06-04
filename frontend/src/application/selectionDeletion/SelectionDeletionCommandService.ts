import { Command } from '@/commands/Command';
import type { CommandStack } from '@/commands/CommandStack';
import type { OperationContext } from '@/commands/operations/OperationContext';
import { DeletionSequenceFactory, type DeletionSequenceContext } from '@/commands/factories/DeletionSequenceFactory';
import type { World } from '@/domain/world/World';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
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
  private readonly visibilityModel: VisibilityModel;
  private readonly commandStack: CommandStack;

  constructor(
    private readonly world: World,
    visibilityModel: VisibilityModel,
    commandStack: CommandStack,
    notifierOrInternals: ChangeNotifier | Partial<SelectionDeletionCommandServiceInternals> = noopChangeNotifier,
    internals: Partial<SelectionDeletionCommandServiceInternals> | undefined = undefined,
    private readonly operationContext?: OperationContext,
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

    const operationContext: OperationContext = this.operationContext ?? {
      world: this.world,
      visibilityModel: this.visibilityModel,
      processTree: this.world.getProcessTree(),
      dependencies: this.world.getDependencyService(),
      realizations: this.world.getRealizationService(),
      constructionService: this.world.getConstructionService(),
      idAllocator: this.world.getIdAllocator(),
      labelGenerator: this.world.labelGenerator,
    };
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
