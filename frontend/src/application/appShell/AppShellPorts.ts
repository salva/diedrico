import type { Ref } from 'vue';
import type { ToolType } from '@/application/tools/ToolTypes';
import type { GoogleDriveFile, GoogleUserProfile } from './DrivePortTypes';
import type { ProjectData } from './ProjectService';
import type { KeyboardShortcutRouterTarget } from './KeyboardShortcutRouter';

export type SaveStatus = 'idle' | 'saving' | 'saved';
export type ProjectSessionPersistencePayload = ProjectData;

export interface OpenedProjectSession {
  readonly projectName: string;
  readonly payload: ProjectSessionPersistencePayload;
}

export interface DrivePort {
  initialize(): Promise<void>;
  isSignedIn(): boolean;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  fetchUserProfile(): Promise<GoogleUserProfile>;
  listFiles(): Promise<GoogleDriveFile[]>;
  createFile(fileName: string, data: ProjectSessionPersistencePayload): Promise<string>;
  loadFile(fileId: string): Promise<unknown>;
  updateFile(fileId: string, data: ProjectSessionPersistencePayload): Promise<void>;
  renameFile(fileId: string, newName: string): Promise<void>;
  generateDefaultProjectName(): Promise<string>;
}


export interface ActivePlaneSummary {
  readonly id: string;
  readonly name: string;
}

export interface ActivePlanePort {
  subscribeToChanges(listener: () => void): void;
  unsubscribeFromChanges(listener: () => void): void;
  getActivePlaneId(): string | undefined;
  setActivePlaneId(id: string): void;
  getProjectionPlaneSummaries(): readonly ActivePlaneSummary[];
  getProjectionPlaneName(id: string): string | undefined;
}

export interface SelectionReadPort {
  getSelectableIdsInPlane(planeId: string): readonly string[];
  getCascadePreviewIds(selectedIds: readonly string[]): readonly string[];
}

export interface CommandHistoryPort {
  canUndo(): boolean;
  undo(): void;
  canRedo(): boolean;
  redo(): void;
  subscribe(listener: () => void): () => void;
}

export interface ProjectSessionPersistencePort {
  snapshotCurrentSession(session: { readonly nextElementId: number }, projectName: string): ProjectSessionPersistencePayload;
  validateProjectData(data: unknown): OpenedProjectSession;
  restoreSession(session: ProjectSessionPersistencePayload, target: unknown): void;
}

export interface LastProjectRecord {
  id: string;
  name: string;
}

export interface LastProjectRepositoryPort {
  getLastProject(): LastProjectRecord | null;
  setLastProject(project: LastProjectRecord): void;
  clearLastProject(): void;
}

export type TimeoutHandle = number;
export type IntervalHandle = number;

export interface SchedulerPort {
  setTimeout(handler: () => void, ms: number): TimeoutHandle;
  clearTimeout(handle: TimeoutHandle): void;
  setInterval(handler: () => void, ms: number): IntervalHandle;
  clearInterval(handle: IntervalHandle): void;
}

export interface AuthStorePort {
  restoreSession(): boolean;
  setUser(profile: GoogleUserProfile): void;
  setAuthenticated(profile: GoogleUserProfile, accessToken: string, expiry?: Date): void;
  clearAuth(): void;
}

export interface SelectionStorePort {
  selectedIdsArray: string[];
  selectSingle(id: string): void;
  addToSelection(id: string): void;
  clearSelection(): void;
  selectMultiple(ids: string[]): void;
  setCascadeHighlight(ids: string[]): void;
  clearCascadeHighlight(): void;
}

export interface SelectionActionPort {
  selectElement(id: string): void;
  addElementToSelection(id: string): void;
  clearSelection(): void;
  selectAllInActivePlane(): void;
}

export interface ToolStorePort {
  setTool(tool: ToolType): void;
  selectSubTool(familyId: string, toolId: string): void;
}

export interface ViewStorePort {
  toggleProjectedElements(): void;
}

export interface AppShellCallbacks {
  fitToView(): void;
  startRename(): void;
  alert(message: string): void;
}

export interface StartupDialogState {
  files: Ref<GoogleDriveFile[]>;
  loading: Ref<boolean>;
  loadingFiles: Ref<boolean>;
  error: Ref<string | null>;
}

export interface AppShellRuntimePorts {
  drive: DrivePort | null;
  persistence: ProjectSessionPersistencePort;
  lastProjectRepository: LastProjectRepositoryPort;
  scheduler: SchedulerPort;
  keyboardTarget: KeyboardShortcutRouterTarget;
  authStore: AuthStorePort;
  selectionStore: SelectionStorePort;
  toolStore: ToolStorePort;
  viewStore: ViewStorePort;
  callbacks: AppShellCallbacks;
}

export function createBrowserScheduler(): SchedulerPort {
  return {
    setTimeout: (handler, ms) => window.setTimeout(handler, ms),
    clearTimeout: (handle) => window.clearTimeout(handle),
    setInterval: (handler, ms) => window.setInterval(handler, ms),
    clearInterval: (handle) => window.clearInterval(handle),
  };
}
