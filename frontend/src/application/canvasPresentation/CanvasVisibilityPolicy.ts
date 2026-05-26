import type { World } from '@/domain/world/World';
import { resolveVisibility } from '@/domain/world/styleService';

export function isCanvasElementVisible(element: object, world: World): boolean {
  return resolveVisibility(element as never, world);
}
