import type { GoogleDriveConfig } from './DrivePortTypes';
import { GoogleDriveService } from '@/infrastructure/googleDrive/GoogleDriveService';
import { createAppShellRuntime } from './AppShellRuntime';
import type { AppShellCallbacks, AuthStorePort, SelectionStorePort, ToolStorePort, ViewStorePort } from './AppShellPorts';
import { createBrowserScheduler } from './AppShellPorts';
import { BrowserLastProjectRepository } from './BrowserLastProjectRepository';
import { ProjectSessionPersistenceAdapter } from './ProjectSessionPersistenceAdapter';

export interface ProductionAppShellRuntimeOptions {
  googleConfig: GoogleDriveConfig;
  hasGoogleCredentials: boolean;
  stores: {
    authStore: AuthStorePort;
    selectionStore: SelectionStorePort;
    toolStore: ToolStorePort;
    viewStore: ViewStorePort;
  };
  callbacks: AppShellCallbacks;
}

export function createProductionAppShellRuntime(options: ProductionAppShellRuntimeOptions) {
  return createAppShellRuntime({
    ports: {
      drive: options.hasGoogleCredentials ? new GoogleDriveService(options.googleConfig) : null,
      persistence: new ProjectSessionPersistenceAdapter(),
      lastProjectRepository: new BrowserLastProjectRepository(window.localStorage),
      scheduler: createBrowserScheduler(),
      keyboardTarget: window,
      authStore: options.stores.authStore,
      selectionStore: options.stores.selectionStore,
      toolStore: options.stores.toolStore,
      viewStore: options.stores.viewStore,
      callbacks: options.callbacks,
    },
  });
}
