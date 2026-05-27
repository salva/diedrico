import { ProjectService, type ProjectData } from '@/services/ProjectService';
import type { OpenedProjectSession, PersistedProjectSession, ProjectSessionPersistencePort, RuntimeSessionRestoreHandle, RuntimeSessionSnapshotHandle } from './AppShellPorts';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';

export class ProjectSessionPersistenceAdapter implements ProjectSessionPersistencePort {
  snapshotCurrentSession(session: RuntimeSessionSnapshotHandle, projectName: string): object {
    const runtime = session as RuntimeSessionSnapshotHandle & { commandStack: CommandStack };
    return ProjectService.serializeCommands(runtime.commandStack, runtime.nextElementId, projectName);
  }

  validateProjectData(data: unknown): OpenedProjectSession {
    ProjectService.validateProjectData(data);
    const projectData = data as ProjectData;
    return {
      projectName: projectData.name,
      payload: projectData as unknown as PersistedProjectSession,
    };
  }

  restoreSession(data: PersistedProjectSession, target: RuntimeSessionRestoreHandle): void {
    const runtime = target as { world: World; commandStack: CommandStack };
    ProjectService.deserializeCommands(data as unknown as ProjectData, runtime.world, runtime.commandStack);
  }
}
