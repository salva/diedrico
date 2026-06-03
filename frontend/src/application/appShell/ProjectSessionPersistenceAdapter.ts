import { ProjectService } from './ProjectService';
import type { OpenedProjectSession, ProjectSessionPersistencePayload, ProjectSessionPersistencePort } from './AppShellPorts';
import type { RuntimeSessionPersistenceRestoreHandle, RuntimeSessionPersistenceSnapshotHandle } from './ProjectSessionPersistenceTargets';

export class ProjectSessionPersistenceAdapter implements ProjectSessionPersistencePort {
  snapshotCurrentSession(session: RuntimeSessionPersistenceSnapshotHandle, projectName: string): ProjectSessionPersistencePayload {
    return ProjectService.serializeCommands(session.commandStack, session.nextElementId, projectName);
  }

  validateProjectData(data: unknown): OpenedProjectSession {
    ProjectService.validateProjectData(data);
    return {
      projectName: data.name,
      payload: data,
    };
  }

  restoreSession(data: ProjectSessionPersistencePayload, target: RuntimeSessionPersistenceRestoreHandle): void {
    ProjectService.deserializeCommands(data, target.world, target.commandStack, target.notifier);
  }
}
