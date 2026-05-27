import type { LastProjectRecord, LastProjectRepositoryPort } from './AppShellPorts';

const LAST_PROJECT_ID_KEY = 'diedrico_last_file_id';
const LAST_PROJECT_NAME_KEY = 'diedrico_last_file_name';

interface BrowserStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class BrowserLastProjectRepository implements LastProjectRepositoryPort {
  constructor(private readonly storage: BrowserStorageLike) {}

  getLastProject(): LastProjectRecord | null {
    const id = this.storage.getItem(LAST_PROJECT_ID_KEY);
    const name = this.storage.getItem(LAST_PROJECT_NAME_KEY);
    return id && name ? { id, name } : null;
  }

  setLastProject(project: LastProjectRecord): void {
    this.storage.setItem(LAST_PROJECT_ID_KEY, project.id);
    this.storage.setItem(LAST_PROJECT_NAME_KEY, project.name);
  }

  clearLastProject(): void {
    this.storage.removeItem(LAST_PROJECT_ID_KEY);
    this.storage.removeItem(LAST_PROJECT_NAME_KEY);
  }
}
