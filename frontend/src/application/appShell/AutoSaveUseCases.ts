import type { Ref } from 'vue';
import type { DrivePort, IntervalHandle, LastProjectRepositoryPort, ProjectSessionPersistencePort, SaveStatus, SchedulerPort, TimeoutHandle } from './AppShellPorts';
import { isAuthenticationError, isMissingRemoteFileError, isQuotaError } from './AppShellErrorClassifier';

export interface AutoSaveRuntimeSessionPort {
  getVersion(): number;
  snapshot(projectName: string, persistence: ProjectSessionPersistencePort): object;
}

export class AutoSaveUseCases {
  private pollInterval: IntervalHandle | null = null;
  private debounceTimer: TimeoutHandle | null = null;
  private savedStatusTimer: TimeoutHandle | null = null;
  private lastVersion = 0;

  constructor(
    private readonly deps: {
      session: AutoSaveRuntimeSessionPort;
      drive: DrivePort | null;
      persistence: ProjectSessionPersistencePort;
      lastProjectRepository: LastProjectRepositoryPort;
      scheduler: SchedulerPort;
      currentFileId: Ref<string | null>;
      currentProjectName: Ref<string | null>;
      saveStatus: Ref<SaveStatus>;
      showStartupDialog: Ref<boolean>;
      isSignedIn: Ref<boolean>;
      alert: (message: string) => void;
    },
    private readonly delayMs = 2000,
  ) {}

  start(): void {
    this.stopPolling();
    this.lastVersion = this.deps.session.getVersion();
    this.pollInterval = this.deps.scheduler.setInterval(() => {
      const currentVersion = this.deps.session.getVersion();
      if (currentVersion !== this.lastVersion) {
        this.lastVersion = currentVersion;
        this.schedule();
      }
    }, 100);
  }

  schedule(): void {
    if (this.debounceTimer) this.deps.scheduler.clearTimeout(this.debounceTimer);
    this.deps.saveStatus.value = 'saving';
    this.debounceTimer = this.deps.scheduler.setTimeout(() => {
      void this.perform();
    }, this.delayMs);
  }

  async perform(): Promise<void> {
    const { drive, currentFileId, currentProjectName } = this.deps;
    if (!drive || !currentFileId.value || !currentProjectName.value) return;
    try {
      const projectData = this.deps.session.snapshot(currentProjectName.value, this.deps.persistence);
      await drive.updateFile(currentFileId.value, projectData);
      this.markSavedThenIdle();
    } catch (error: unknown) {
      await this.handleSaveError(error);
    }
  }

  stop(): void {
    this.stopPolling();
    if (this.debounceTimer) this.deps.scheduler.clearTimeout(this.debounceTimer);
    if (this.savedStatusTimer) this.deps.scheduler.clearTimeout(this.savedStatusTimer);
    this.debounceTimer = null;
    this.savedStatusTimer = null;
    this.deps.saveStatus.value = 'idle';
  }

  dispose(): void {
    this.stop();
  }

  private stopPolling(): void {
    if (this.pollInterval) this.deps.scheduler.clearInterval(this.pollInterval);
    this.pollInterval = null;
  }

  private markSavedThenIdle(): void {
    this.deps.saveStatus.value = 'saved';
    if (this.savedStatusTimer) this.deps.scheduler.clearTimeout(this.savedStatusTimer);
    this.savedStatusTimer = this.deps.scheduler.setTimeout(() => {
      if (this.deps.saveStatus.value === 'saved') this.deps.saveStatus.value = 'idle';
    }, 2000);
  }

  private async handleSaveError(error: unknown): Promise<void> {
    this.deps.saveStatus.value = 'idle';
    if (isMissingRemoteFileError(error)) {
      try {
        if (!this.deps.drive || !this.deps.currentProjectName.value) throw new Error('No project name');
        const projectData = this.deps.session.snapshot(this.deps.currentProjectName.value, this.deps.persistence);
        const newFileId = await this.deps.drive.createFile(this.deps.currentProjectName.value, projectData);
        this.deps.currentFileId.value = newFileId;
        this.deps.lastProjectRepository.setLastProject({ id: newFileId, name: this.deps.currentProjectName.value });
        this.markSavedThenIdle();
        return;
      } catch {
        this.deps.alert('Remote file was deleted and could not be re-saved. Please try to export your work or refresh if connection is lost.');
      }
    }
    if (isAuthenticationError(error)) {
      this.deps.showStartupDialog.value = true;
      this.deps.isSignedIn.value = false;
      this.stop();
    } else if (isQuotaError(error)) {
      this.deps.alert('Google Drive storage quota exceeded. Please free up space or upgrade your account.');
    }
  }
}
