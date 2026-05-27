import type { VisualStyle } from '@/domain/world/VisualStyle';

type VisibilityElement = { visualStyle?: VisualStyle };

export interface ElementVisibilityIntentContext {
  readonly findElement: (elementId: string) => VisibilityElement | undefined;
  readonly markDirty: () => void;
}

export function toggleElementVisibility(elementId: string, context: ElementVisibilityIntentContext): void {
  const element = context.findElement(elementId);
  if (!element) return;
  if (!element.visualStyle) {
    element.visualStyle = { color: '#000000', lineWidth: 2, lineStyle: 'solid', opacity: 1.0, visible: false, inherited: true };
  } else {
    element.visualStyle.visible = !element.visualStyle.visible;
  }
  context.markDirty();
}
