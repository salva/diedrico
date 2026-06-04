import type { Primitive } from '@/domain/presentation/Paper';
import type { CanvasElementKind, CanvasRenderItem } from './CanvasPresentationModel';

export function canvasRenderItem<TPrimitive extends Primitive>(primitive: TPrimitive, kind: CanvasElementKind): CanvasRenderItem {
  return { id: primitive.id, kind, sourceEntityId: primitive.sourceEntityId, planeId: primitive.planeId, primitive, visible: primitive.visible, style: primitive.style };
}
