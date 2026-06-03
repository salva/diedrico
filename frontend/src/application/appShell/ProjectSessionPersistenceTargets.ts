import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';
import type { RuntimeSessionRestoreHandle, RuntimeSessionSnapshotHandle } from './AppShellPorts';

export interface RuntimeSessionPersistenceSnapshotHandle extends RuntimeSessionSnapshotHandle {
  readonly commandStack: CommandStack;
}

export interface RuntimeSessionPersistenceRestoreHandle extends RuntimeSessionRestoreHandle {
  readonly world: World;
  readonly commandStack: CommandStack;
  readonly notifier: ChangeNotifier;
}
