import type { OpenedProjectSession, ProjectSessionPersistencePayload, ProjectSessionPersistencePort } from './AppShellPorts';

export interface SnapshotCapableProjectSessionKernel {
  getVersion(): number;
  snapshot(projectName: string, persistence: ProjectSessionPersistencePort): ProjectSessionPersistencePayload;
}

export interface ProjectSessionKernel extends SnapshotCapableProjectSessionKernel {
  initializeDefaultWorldIfNeeded(): void;
  resetToEmptyInitializedWorld(): void;
  clear(): void;
  validateProjectData(data: unknown, persistence: ProjectSessionPersistencePort): OpenedProjectSession;
  restoreValidatedProject(openedSession: OpenedProjectSession, persistence: ProjectSessionPersistencePort): void;
}
