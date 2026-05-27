import type { Ref } from 'vue';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import { initializeWorld } from '@/application/world/initializeWorld';
import type { ProjectData } from '@/services/ProjectService';
import type { AutoSaveUseCases } from './AutoSaveUseCases';
import type { AppShellRuntimePorts, SaveStatus, StartupDialogState } from './AppShellPorts';
import { describeUnknownError } from './AppShellErrorClassifier';

export class ProjectSessionUseCases {
  constructor(
    private readonly deps: {
      world: World;
      commandStack: CommandStack;
      hasGoogleCredentials: boolean;
      showStartupDialog: Ref<boolean>;
      isSignedIn: Ref<boolean>;
      currentProjectName: Ref<string | null>;
      currentFileId: Ref<string | null>;
      isRenamingProject: Ref<boolean>;
      saveStatus: Ref<SaveStatus>;
      startupDialog: StartupDialogState;
      autoSave: AutoSaveUseCases;
      ports: AppShellRuntimePorts;
    },
  ) {}

  async initialize(): Promise<void> {
    const { drive, authStore, lastProjectRepository } = this.deps.ports;
    if (!this.deps.hasGoogleCredentials || !drive) {
      initializeWorld(this.deps.world, this.deps.commandStack);
      this.deps.showStartupDialog.value = false;
      return;
    }
    try {
      await drive.initialize();
      this.deps.isSignedIn.value = drive.isSignedIn();
      if (this.deps.isSignedIn.value && authStore.restoreSession()) {
        try { authStore.setUser(await drive.fetchUserProfile()); } catch { /* profile refresh is non-blocking */ }
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
          initializeWorld(this.deps.world, this.deps.commandStack);
        }
      }
      this.deps.showStartupDialog.value = true;
    } catch {
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
        this.deps.ports.authStore.setAuthenticated(profile, '', undefined);
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
    await drive.signOut();
    this.deps.ports.authStore.clearAuth();
    this.deps.isSignedIn.value = false;
    this.deps.currentProjectName.value = null;
    this.deps.currentFileId.value = null;
    this.deps.autoSave.stop();
    this.deps.world.clear();
    this.deps.commandStack.clear();
    this.deps.showStartupDialog.value = true;
  }

  async createProject(projectName: string): Promise<void> {
    const drive = this.requireDrive();
    try {
      this.deps.world.clear();
      this.deps.commandStack.clear();
      initializeWorld(this.deps.world, this.deps.commandStack);
      const projectData = this.deps.ports.persistence.snapshotCurrentSession({
        commandStack: this.deps.commandStack,
        world: this.deps.world,
        projectName,
      });
      const fileId = await drive.createFile(projectName, projectData);
      this.setCurrentProject(projectName, fileId);
      this.deps.showStartupDialog.value = false;
      this.deps.autoSave.start();
      this.deps.saveStatus.value = 'saved';
    } catch (error: unknown) {
      this.deps.startupDialog.error.value = `Failed to create project: ${describeUnknownError(error)}`;
      this.deps.startupDialog.loading.value = false;
    }
  }

  async openProject(fileId: string): Promise<void> {
    const drive = this.requireDrive();
    try {
      const projectData = await drive.loadFile(fileId) as ProjectData;
      this.deps.world.clear();
      this.deps.ports.persistence.assertProjectData(projectData);
      this.deps.ports.persistence.restoreSession(projectData, {
        world: this.deps.world,
        commandStack: this.deps.commandStack,
      });
      if (this.deps.world.getAllProjectionPlanes().length === 0) initializeWorld(this.deps.world, this.deps.commandStack);
      this.deps.world.markDirty();
      this.setCurrentProject(projectData.name, fileId);
      this.deps.showStartupDialog.value = false;
      this.deps.autoSave.start();
      this.deps.saveStatus.value = 'saved';
    } catch (error: unknown) {
      this.deps.startupDialog.error.value = `Failed to open project: ${describeUnknownError(error)}`;
      this.deps.startupDialog.loading.value = false;
      throw error;
    }
  }

  async newProject(): Promise<void> {
    const drive = this.requireDrive();
    try {
      const projectName = await drive.generateDefaultProjectName();
      this.deps.world.clear();
      this.deps.commandStack.clear();
      await this.createProject(projectName);
    } catch {
      this.deps.showStartupDialog.value = true;
    }
  }

  showStartupProjectChooser(): void {
    this.deps.showStartupDialog.value = true;
  }

  async renameProject(newName: string): Promise<void> {
    const drive = this.requireDrive();
    if (!this.deps.currentFileId.value) return;
    this.deps.isRenamingProject.value = true;
    try {
      await drive.renameFile(this.deps.currentFileId.value, newName);
      this.deps.currentProjectName.value = newName;
      this.deps.ports.lastProjectRepository.setLastProject({ id: this.deps.currentFileId.value, name: newName });
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
    this.deps.startupDialog.files.value = [];
    this.deps.startupDialog.loading.value = false;
    this.deps.startupDialog.loadingFiles.value = false;
    this.deps.startupDialog.error.value = null;
  }

  private setCurrentProject(projectName: string, fileId: string): void {
    this.deps.currentProjectName.value = projectName;
    this.deps.currentFileId.value = fileId;
    this.deps.ports.lastProjectRepository.setLastProject({ id: fileId, name: projectName });
  }

  private requireDrive() {
    if (!this.deps.ports.drive) throw new Error('Google Drive service not available');
    return this.deps.ports.drive;
  }
}
