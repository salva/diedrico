import { ProjectService, type ProjectData } from '@/services/ProjectService';
import type { ProjectSessionPersistencePort, RuntimeSessionRestoreHandle, RuntimeSessionSnapshotHandle, SerializedProjectSession } from './AppShellPorts';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';

export class ProjectSessionPersistenceAdapter implements ProjectSessionPersistencePort {
  snapshotCurrentSession(session: RuntimeSessionSnapshotHandle, projectName: string): SerializedProjectSession {
    const runtime = session as RuntimeSessionSnapshotHandle & { commandStack: CommandStack };
    return ProjectService.serializeCommands(runtime.commandStack, runtime.nextElementId, projectName);
  }

  assertProjectData(data: unknown): asserts data is SerializedProjectSession {
    ProjectService.validateProjectData(data);
  }

  restoreSession(data: SerializedProjectSession, target: RuntimeSessionRestoreHandle): void {
    const runtime = target as { world: World; commandStack: CommandStack };
    ProjectService.deserializeCommands(data as unknown as ProjectData, runtime.world, runtime.commandStack);
  }
}
