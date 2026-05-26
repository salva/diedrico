import type { Ref } from 'vue';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import type { GoogleDriveFile, GoogleUserProfile } from '@/services/GoogleDriveService';
import type { ProjectData } from '@/services/ProjectService';
import type { ToolType } from '@/stores/toolStore';

export type SaveStatus = 'idle' | 'saving' | 'saved';

export interface DrivePort {
  initialize(): Promise<void>;
  isSignedIn(): boolean;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  fetchUserProfile(): Promise<GoogleUserProfile>;
  listFiles(): Promise<GoogleDriveFile[]>;
  createFile(fileName: string, data: object): Promise<string>;
  loadFile(fileId: string): Promise<object>;
  updateFile(fileId: string, data: object): Promise<void>;
  renameFile(fileId: string, newName: string): Promise<void>;
  generateDefaultProjectName(): Promise<string>;
}

export interface ProjectPersistencePort {
  serializeCommands(commandStack: CommandStack, nextElementId: number, projectName: string): ProjectData;
  validateProjectData(data: unknown): asserts data is ProjectData;
  deserializeCommands(data: ProjectData, world: World, commandStack: CommandStack): void;
}

export interface BrowserStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
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
  setAuthenticated(profile: GoogleUserProfile, accessToken: string, refreshToken?: string): void;
  clearAuth(): void;
}

export interface SelectionStorePort {
  selectedIdsArray: string[];
  clearSelection(): void;
  selectMultiple(ids: string[]): void;
  setCascadeHighlight(ids: string[]): void;
  clearCascadeHighlight(): void;
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
  persistence: ProjectPersistencePort;
  storage: BrowserStoragePort;
  scheduler: SchedulerPort;
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
