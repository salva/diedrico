import type { OpenedProjectSession, ProjectSessionPersistencePort } from './AppShellPorts';

export interface SnapshotCapableProjectSessionKernel {
  getVersion(): number;
  snapshot(projectName: string, persistence: ProjectSessionPersistencePort): object;
}

export interface ProjectSessionKernel extends SnapshotCapableProjectSessionKernel {
  initializeDefaultWorldIfNeeded(): void;
  resetToEmptyInitializedWorld(): void;
  clear(): void;
  validateProjectData(data: unknown, persistence: ProjectSessionPersistencePort): OpenedProjectSession;
  restoreValidatedProject(openedSession: OpenedProjectSession, persistence: ProjectSessionPersistencePort): void;
}
