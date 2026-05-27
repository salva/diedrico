import { CommandStack } from '@/commands/CommandStack';
import { World } from '@/domain/world/World';
import { initializeWorld } from '@/application/world/initializeWorld';
import type { ProjectSessionPersistencePort, RuntimeSessionRestoreHandle, RuntimeSessionSnapshotHandle, SerializedProjectSession } from './AppShellPorts';

export interface RuntimeSessionReader extends RuntimeSessionSnapshotHandle {
  readonly world: World;
  readonly commandStack: CommandStack;
}

export interface RuntimeSessionRestoreTarget extends RuntimeSessionRestoreHandle {
  readonly world: World;
  readonly commandStack: CommandStack;
}

export class RuntimeSession {
  private readonly world = new World();
  private readonly commandStack = new CommandStack();

  worldForView(): World {
    return this.world;
  }

  commandStackForShortcuts(): CommandStack {
    return this.commandStack;
  }

  worldForUseCases(): World {
    return this.world;
  }

  commandStackForCommandServices(): CommandStack {
    return this.commandStack;
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

  snapshot(projectName: string, persistence: ProjectSessionPersistencePort): SerializedProjectSession {
    return persistence.snapshotCurrentSession(this.reader(), projectName);
  }

  validateProjectData(data: unknown, persistence: ProjectSessionPersistencePort): SerializedProjectSession {
    persistence.assertProjectData(data);
    return data;
  }

  restoreValidatedProject(data: SerializedProjectSession, persistence: ProjectSessionPersistencePort): void {
    const candidateWorld = new World();
    const candidateCommandStack = new CommandStack();
    persistence.restoreSession(data, { world: candidateWorld, commandStack: candidateCommandStack });
    if (candidateWorld.getAllProjectionPlanes().length === 0) initializeWorld(candidateWorld, candidateCommandStack);
    candidateWorld.markDirty();

    this.world.clear();
    this.commandStack.clear();
    persistence.restoreSession(data, this.restoreTarget());
    if (this.world.getAllProjectionPlanes().length === 0) this.initializeDefaultWorldIfNeeded();
    this.world.markDirty();
  }

  private reader(): RuntimeSessionReader {
    return {
      world: this.world,
      commandStack: this.commandStack,
      nextElementId: this.world.peekNextId(),
    };
  }

  private restoreTarget(): RuntimeSessionRestoreTarget {
    return {
      world: this.world,
      commandStack: this.commandStack,
    };
  }
}
