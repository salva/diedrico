import { DriveAuthenticationError } from './DriveAuthenticationError';
import type { Ref } from 'vue';
import type { DrivePort, IntervalHandle, LastProjectRepositoryPort, SaveStatus, SchedulerPort, TimeoutHandle } from './AppShellPorts';
import type { SnapshotCapableProjectSessionKernel } from './ProjectSessionKernel';
import { isAuthenticationError, isMissingRemoteFileError, isQuotaError } from './AppShellErrorClassifier';

export class AutoSaveUseCases {
  private pollInterval: IntervalHandle | null = null;
  private debounceTimer: TimeoutHandle | null = null;
  private savedStatusTimer: TimeoutHandle | null = null;
  private lastObservedVersion = 0;
  private inFlight = false;
  private saveRequested = false;
  private generation = 0;

  constructor(
    private readonly deps: {
      session: SnapshotCapableProjectSessionKernel;
      drive: DrivePort | null;
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
    this.stop();
    this.lastObservedVersion = this.deps.session.getVersion();
    this.pollInterval = this.deps.scheduler.setInterval(() => {
      const currentVersion = this.deps.session.getVersion();
      if (currentVersion !== this.lastObservedVersion) {
        this.lastObservedVersion = currentVersion;
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
    if (this.inFlight) { this.saveRequested = true; return; }
    this.inFlight = true;
    const generation = this.generation;
    const fileId = currentFileId.value;
    const projectName = currentProjectName.value;
    // A restart also invalidates requests when reopening the same file ID.
    const isCurrent = () => generation === this.generation
      && currentFileId.value === fileId && currentProjectName.value === projectName;
    const revision = this.deps.session.getVersion();
    try {
      const projectData = this.deps.session.snapshot(projectName);
      await drive.updateFile(fileId, projectData);
      if (isCurrent() && !this.saveRequested && this.deps.session.getVersion() === revision) this.markSavedThenIdle();
    } catch (error: unknown) {
      if (isCurrent()) await this.handleSaveError(error, isCurrent);
    } finally {
      this.inFlight = false;
      if (this.saveRequested) {
        this.saveRequested = false;
        this.schedule();
      }
    }
  }

  stop(): void {
    this.generation += 1;
    this.saveRequested = false;
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

  private async handleSaveError(error: unknown, isCurrent: () => boolean): Promise<void> {
    if (error instanceof DriveAuthenticationError && !error.ownsCurrentSession) return;
    this.deps.saveStatus.value = 'idle';
    if (isMissingRemoteFileError(error)) {
      try {
        if (!this.deps.drive || !this.deps.currentProjectName.value) throw new Error('No project name');
        const revision = this.deps.session.getVersion();
        const projectData = this.deps.session.snapshot(this.deps.currentProjectName.value);
        const newFileId = await this.deps.drive.createFile(this.deps.currentProjectName.value, projectData);
        // The remote create may have succeeded after a switch; do not adopt it.
        if (!isCurrent()) return;
        this.deps.currentFileId.value = newFileId;
        this.deps.lastProjectRepository.setLastProject({ id: newFileId, name: this.deps.currentProjectName.value });
        if (!this.saveRequested && this.deps.session.getVersion() === revision) this.markSavedThenIdle();
        return;
      } catch (recoveryError) {
        if (!isCurrent()) return;
        if (isAuthenticationError(recoveryError)) {
          await this.handleSaveError(recoveryError, isCurrent);
          return;
        }
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
