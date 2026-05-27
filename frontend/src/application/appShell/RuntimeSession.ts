import { CommandStack } from '@/commands/CommandStack';
import { World } from '@/domain/world/World';
import { initializeWorld } from '@/application/world/initializeWorld';
import { SelectionDeletionCommandService } from '@/application/selectionDeletion/SelectionDeletionCommandService';
import type { SelectionDeletionCommandPort } from '@/application/selectionDeletion/SelectionDeletionPorts';
import { CanvasToolController } from '@/application/tools/CanvasToolController';
import type { CanvasToolControllerToolStore } from '@/application/tools/CanvasToolController';
import { ProcessHistoryController } from '@/application/processHistory/ProcessHistoryController';
import type { ActivePlanePort, CommandHistoryPort, OpenedProjectSession, ProjectSessionPersistencePort, RuntimeSessionRestoreHandle, RuntimeSessionSnapshotHandle, SelectionReadPort } from './AppShellPorts';

export interface RuntimeSessionPersistenceSnapshotHandle extends RuntimeSessionSnapshotHandle {
  readonly commandStack: CommandStack;
}

export interface RuntimeSessionPersistenceRestoreHandle extends RuntimeSessionRestoreHandle {
  readonly world: World;
  readonly commandStack: CommandStack;
}

export class RuntimeSession {
  private readonly world = new World();
  private readonly commandStack = new CommandStack();

  worldForView(): World {
    return this.world;
  }

  canvasCommandProducerPort(toolStore: CanvasToolControllerToolStore): CanvasToolController {
    return new CanvasToolController({
      world: this.world,
      commandStack: this.commandStack,
      toolStore,
    });
  }

  processHistoryCommandPort(): ProcessHistoryController {
    return new ProcessHistoryController({
      world: this.world,
      commandStack: this.commandStack,
    });
  }

  activePlanePort(): ActivePlanePort {
    return {
      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
      getActivePlaneId: () => this.world.getActivePlaneId(),
      setActivePlaneId: (id) => this.world.setActivePlaneId(id),
      getProjectionPlaneSummaries: () => this.world.getAllProjectionPlanes().map((plane) => ({ id: plane.id, name: plane.name })),
      getProjectionPlaneName: (id) => this.world.getProjectionPlaneById(id)?.name,
    };
  }

  selectionReadPort(): SelectionReadPort {
    return {
      getSelectableIdsInPlane: (planeId) => {
        const plane = this.world.getProjectionPlaneById(planeId);
        if (!plane) return [];
        return [
          ...plane.getAllPoints().map((point) => point.id),
          ...plane.getAllLines().map((line) => line.id),
          ...plane.getAllCircles().map((circle) => circle.id),
        ];
      },
      getCascadePreviewIds: (selectedIds) => {
        const deletionOrder = this.world.getDependencyService().getElementsInDeletionOrder([...selectedIds]);
        return deletionOrder.filter((id) => !selectedIds.includes(id));
      },
    };
  }

  commandHistoryPort(): CommandHistoryPort {
    return {
      canUndo: () => this.commandStack.canUndo(),
      undo: () => this.commandStack.undo(),
      canRedo: () => this.commandStack.canRedo(),
      redo: () => this.commandStack.redo(),
      subscribe: (listener) => this.commandStack.subscribe(listener),
    };
  }

  selectionDeletionCommandPort(): SelectionDeletionCommandPort {
    return new SelectionDeletionCommandService(this.world, this.commandStack);
  }

  initializeDefaultWorldIfNeeded(): void {
    initializeWorld(this.world, this.commandStack);
  }

  resetToEmptyInitializedWorld(): void {
    this.world.clear();
    this.commandStack.clear();
    this.initializeDefaultWorldIfNeeded();
  }

  clear(): void {
    this.world.clear();
    this.commandStack.clear();
  }

  getVersion(): number {
    return this.world.getVersion();
  }

  snapshot(projectName: string, persistence: ProjectSessionPersistencePort): object {
    return persistence.snapshotCurrentSession(this.snapshotHandle(), projectName);
  }

  validateProjectData(data: unknown, persistence: ProjectSessionPersistencePort): OpenedProjectSession {
    return persistence.validateProjectData(data);
  }

  restoreValidatedProject(openedSession: OpenedProjectSession, persistence: ProjectSessionPersistencePort): void {
    const candidateWorld = new World();
    const candidateCommandStack = new CommandStack();
    persistence.restoreSession(openedSession.payload, { world: candidateWorld, commandStack: candidateCommandStack });
    if (candidateWorld.getAllProjectionPlanes().length === 0) initializeWorld(candidateWorld, candidateCommandStack);
    candidateWorld.markDirty();

    this.world.clear();
    this.commandStack.clear();
    persistence.restoreSession(openedSession.payload, this.restoreTarget());
    if (this.world.getAllProjectionPlanes().length === 0) this.initializeDefaultWorldIfNeeded();
    this.world.markDirty();
  }

  private snapshotHandle(): RuntimeSessionPersistenceSnapshotHandle {
    return {
      commandStack: this.commandStack,
      nextElementId: this.world.peekNextId(),
    };
  }

  private restoreTarget(): RuntimeSessionPersistenceRestoreHandle {
    return {
      world: this.world,
      commandStack: this.commandStack,
    };
  }
}
