import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';
import { ProjectService, type ProjectData } from '@/services/ProjectService';
import type { ProjectSessionPersistencePort } from './AppShellPorts';

export class ProjectSessionPersistenceAdapter implements ProjectSessionPersistencePort {
  snapshotCurrentSession(deps: { commandStack: CommandStack; world: World; projectName: string }): ProjectData {
    return ProjectService.serializeCommands(deps.commandStack, deps.world.peekNextId(), deps.projectName);
  }

  assertProjectData(data: unknown): asserts data is ProjectData {
    ProjectService.validateProjectData(data);
  }

  restoreSession(data: ProjectData, deps: { world: World; commandStack: CommandStack }): void {
    ProjectService.deserializeCommands(data, deps.world, deps.commandStack);
  }
}
