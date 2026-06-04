import type { World } from '@/domain/world/World';

export interface OperationContext {
  readonly world: World;
}
