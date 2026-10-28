import type { Ref } from 'vue';
import type { AutoSaveUseCases } from './AutoSaveUseCases';
import type { AuthStorePort, DrivePort, LastProjectRepositoryPort, OpenedProjectSession, SaveStatus, StartupDialogState } from './AppShellPorts';
import { describeUnknownError } from './AppShellErrorClassifier';
import type { ProjectSessionKernel } from './ProjectSessionKernel';

export class ProjectSessionUseCases {
  private transition = 0;
  constructor(
    private readonly deps: {
      session: ProjectSessionKernel;
      hasGoogleCredentials: boolean;
      showStartupDialog: Ref<boolean>;
      isSignedIn: Ref<boolean>;
      currentProjectName: Ref<string | null>;
      currentFileId: Ref<string | null>;
      isRenamingProject: Ref<boolean>;
      saveStatus: Ref<SaveStatus>;
      startupDialog: StartupDialogState;
      autoSave: AutoSaveUseCases;
      drive: DrivePort | null;
      authStore: AuthStorePort;
      lastProjectRepository: LastProjectRepositoryPort;
    },
  ) {}

  async initialize(): Promise<void> {
    const { drive, authStore, lastProjectRepository } = this.deps;
    if (!this.deps.hasGoogleCredentials || !drive) {
      this.deps.session.initializeDefaultWorldIfNeeded();
      this.deps.showStartupDialog.value = false;
      return;
    }
    try {
      await drive.initialize();
      this.deps.isSignedIn.value = drive.isSignedIn();
      if (this.deps.isSignedIn.value) {
        try { authStore.setUser(await drive.fetchUserProfile()); } catch { /* profile refresh is non-blocking */ }
      } else {
        authStore.clearAuth();
      }
      const lastProject = lastProjectRepository.getLastProject();
      if (this.deps.isSignedIn.value && lastProject) {
        try {
          await this.openProject(lastProject.id);
          return;
        } catch {
          lastProjectRepository.clearLastProject();
          this.deps.currentProjectName.value = null;
          this.deps.currentFileId.value = null;
          this.deps.session.initializeDefaultWorldIfNeeded();
        }
      }
      this.deps.showStartupDialog.value = true;
    } catch {
      this.deps.session.initializeDefaultWorldIfNeeded();
      this.deps.showStartupDialog.value = false;
    }
  }

  async signIn(): Promise<void> {
    const drive = this.requireDrive();
    this.deps.startupDialog.loading.value = true;
    this.deps.startupDialog.error.value = null;
    try {
      await drive.signIn();
      this.deps.isSignedIn.value = drive.isSignedIn();
      try {
        const profile = await drive.fetchUserProfile();
        this.deps.authStore.setUser(profile);
      } catch { /* allow Drive use without profile */ }
      await this.requestFiles();
    } catch (error: unknown) {
      this.deps.startupDialog.error.value = `Sign-in failed: ${describeUnknownError(error)}`;
    } finally {
      this.deps.startupDialog.loading.value = false;
    }
  }

  async toolbarSignIn(): Promise<void> {
    await this.signIn();
  }

  async signOut(): Promise<void> {
    const drive = this.requireDrive();
    this.transition++;
    await drive.signOut();
    this.deps.authStore.clearAuth();
    this.deps.isSignedIn.value = false;
    this.deps.currentProjectName.value = null;
    this.deps.currentFileId.value = null;
    this.deps.autoSave.stop();
    this.deps.session.clear();
    this.deps.showStartupDialog.value = true;
  }

  async createProject(projectName: string): Promise<void> {
    const drive = this.requireDrive();
    const transition = ++this.transition;
    try {
      const projectData = this.deps.session.snapshotEmptyProject(projectName);
      const fileId = await drive.createFile(projectName, projectData);
      if (transition !== this.transition) return;
      this.installProject(this.deps.session.validateProjectData(projectData), fileId);
    } catch (error: unknown) {
      if (transition !== this.transition) return;
      this.deps.startupDialog.error.value = `Failed to create project: ${describeUnknownError(error)}`;
      this.deps.startupDialog.loading.value = false;
    }
  }

  async openProject(fileId: string): Promise<void> {
    const drive = this.requireDrive();
    const transition = ++this.transition;
    try {
      const loadedProject = await drive.loadFile(fileId);
      if (transition !== this.transition) return;
      const openedSession = this.deps.session.validateProjectData(loadedProject);
      this.installProject(openedSession, fileId);
    } catch (error: unknown) {
      if (transition !== this.transition) return;
      this.deps.startupDialog.error.value = `Failed to open project: ${describeUnknownError(error)}`;
      this.deps.startupDialog.loading.value = false;
      throw error;
    }
  }

  async newProject(): Promise<void> {
    const drive = this.requireDrive();
    const transition = ++this.transition;
    try {
      const projectName = await drive.generateDefaultProjectName();
      if (transition !== this.transition) return;
      await this.createProject(projectName);
    } catch {
      if (transition !== this.transition) return;
      this.deps.showStartupDialog.value = true;
    }
  }

  showStartupProjectChooser(): void {
    this.deps.showStartupDialog.value = true;
  }

  async renameProject(newName: string): Promise<void> {
    const drive = this.requireDrive();
    if (!this.deps.currentFileId.value) return;
    const fileId = this.deps.currentFileId.value;
    const transition = this.transition;
    const originalName = this.deps.currentProjectName.value;
    this.deps.isRenamingProject.value = true;
    try {
      await drive.renameFile(fileId, newName);
      if (transition !== this.transition || this.deps.currentFileId.value !== fileId || this.deps.currentProjectName.value !== originalName) return;
      this.deps.currentProjectName.value = newName;
      this.deps.lastProjectRepository.setLastProject({ id: fileId, name: newName });
      this.deps.autoSave.schedule();
    } finally {
      this.deps.isRenamingProject.value = false;
    }
  }

  async requestFiles(): Promise<void> {
    const drive = this.requireDrive();
    this.deps.startupDialog.loadingFiles.value = true;
    this.deps.startupDialog.error.value = null;
    try {
      this.deps.startupDialog.files.value = await drive.listFiles();
    } catch (error: unknown) {
      this.deps.startupDialog.error.value = `Failed to load files: ${describeUnknownError(error)}`;
    } finally {
      this.deps.startupDialog.loadingFiles.value = false;
    }
  }

  dispose(): void {
    this.transition++;
    this.deps.startupDialog.files.value = [];
    this.deps.startupDialog.loading.value = false;
    this.deps.startupDialog.loadingFiles.value = false;
    this.deps.startupDialog.error.value = null;
  }

  private installProject(openedSession: OpenedProjectSession, fileId: string): void {
    this.deps.session.restoreValidatedProject(openedSession);
    this.deps.currentProjectName.value = openedSession.projectName;
    this.deps.currentFileId.value = fileId;
    this.deps.lastProjectRepository.setLastProject({ id: fileId, name: openedSession.projectName });
    this.deps.showStartupDialog.value = false;
    this.deps.autoSave.start();
    this.deps.saveStatus.value = 'saved';
  }

  private requireDrive() {
    if (!this.deps.drive) throw new Error('Google Drive service not available');
    return this.deps.drive;
  }
}
