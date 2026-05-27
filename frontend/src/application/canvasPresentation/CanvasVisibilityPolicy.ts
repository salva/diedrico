import type { Element } from '@/domain/world/Element';

export interface CanvasElementVisibilityPort {
  isElementVisible(element: Element): boolean;
}

export function isCanvasElementVisible(element: Element, visibility: CanvasElementVisibilityPort): boolean {
  return visibility.isElementVisible(element);
}
