import type { OpenedProjectSession, ProjectSessionPersistencePayload } from './AppShellPorts';

export interface SnapshotCapableProjectSessionKernel {
  getVersion(): number;
  snapshot(projectName: string): ProjectSessionPersistencePayload;
}

export interface ProjectSessionKernel extends SnapshotCapableProjectSessionKernel {
  initializeDefaultWorldIfNeeded(): void;
  snapshotEmptyProject(projectName: string): ProjectSessionPersistencePayload;
  resetToEmptyInitializedWorld(): void;
  clear(): void;
  validateProjectData(data: unknown): OpenedProjectSession;
  restoreValidatedProject(openedSession: OpenedProjectSession): void;
}
