import { ProjectService, type ProjectData } from '@/services/ProjectService';
import type { OpenedProjectSession, PersistedProjectSession, ProjectSessionPersistencePort } from './AppShellPorts';
import type { RuntimeSessionPersistenceRestoreHandle, RuntimeSessionPersistenceSnapshotHandle } from './RuntimeSession';

export class ProjectSessionPersistenceAdapter implements ProjectSessionPersistencePort {
  snapshotCurrentSession(session: RuntimeSessionPersistenceSnapshotHandle, projectName: string): object {
    return ProjectService.serializeCommands(session.commandStack, session.nextElementId, projectName);
  }

  validateProjectData(data: unknown): OpenedProjectSession {
    ProjectService.validateProjectData(data);
    const projectData = data as ProjectData;
    return {
      projectName: projectData.name,
      payload: projectData as unknown as PersistedProjectSession,
    };
  }

  restoreSession(data: PersistedProjectSession, target: RuntimeSessionPersistenceRestoreHandle): void {
    ProjectService.deserializeCommands(data as unknown as ProjectData, target.world, target.commandStack);
  }
}
