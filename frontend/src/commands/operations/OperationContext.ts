import type { World } from '@/domain/world/World';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';

export interface OperationContext {
  readonly world: World;
  readonly visibilityModel: VisibilityModel;
}
