import type { Element } from '@/domain/world/Element';
import type { World } from '@/domain/world/World';
import { resolveVisibility } from '@/domain/world/styleService';

type CanvasVisibilityWorld = Pick<World, 'getProcessTree'>;

export function isCanvasElementVisible(element: Element, world: CanvasVisibilityWorld): boolean {
  return resolveVisibility(element, world as World);
}
