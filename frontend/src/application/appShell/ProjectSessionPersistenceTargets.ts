import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import type { ChangeNotifier } from '@/application/appShell/RuntimeChangePublisher';

export interface RuntimeSessionPersistenceSnapshotHandle {
  readonly nextElementId: number;
  readonly commandStack: CommandStack;
}

export interface RuntimeSessionPersistenceRestoreHandle {
  readonly world: World;
  readonly commandStack: CommandStack;
  readonly notifier: ChangeNotifier;
}
