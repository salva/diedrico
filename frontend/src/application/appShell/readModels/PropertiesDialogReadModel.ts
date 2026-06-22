import { Circle2DByCenterAndPoint, Circle2DByThreePoints } from '@/domain/world/Circle';
import { Guide2D } from '@/domain/world/Guide';
import { Line2DByTwoPoints } from '@/domain/world/Line';
import { FreePoint2D, Point2DCircleCircleIntersection, Point2DLineCircleIntersection, Point2DLineLineIntersection } from '@/domain/world/Point';
import { Segment2D } from '@/domain/world/Segment';
import type { VisualStyle } from '@/domain/world/VisualStyle';
import type { World } from '@/domain/world/World';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';
import type { PropertiesDialogViewModel } from '../RuntimeViewPorts';
import type { CachedProjectionElementRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';

type PropertiesElement = { id: string; label?: string; planeId?: string; visualStyle?: VisualStyle };

export interface PropertiesDialogReadModelContext {
  readonly findElement: (elementId: string) => PropertiesElement | undefined;
  readonly world: World;
  readonly realizationContext: CachedProjectionElementRealizationContext;
}

export function buildPropertiesDialogViewModel(
  elementId: string | null,
  context: PropertiesDialogReadModelContext,
): PropertiesDialogViewModel | null {
  if (!elementId) return null;
  const element = context.findElement(elementId);
  if (!element) return null;
  return {
    elementId,
    elementLabel: element.label || elementId,
    elementType: describeElementType(elementId, context.world),
    planeId: typeof element.planeId === 'string' ? element.planeId : null,
    coordinates: describeCoordinates(elementId, context.world, context.realizationContext),
    position: describeEditablePosition(elementId, context.world),
    dependencies: describeDependencies(elementId, context.world),
    createdBy: 'Action in ProcessTree',
    style: styleView(element.visualStyle),
  };
}

function describeElementType(elementId: string, world: PropertiesDialogReadModelContext['world']): string {
  const lookup = new GeometryElementLookup(world);
  if (!elementId.includes('/')) {
    if (lookup.getElement3DById(elementId)) return '3D Element';
    if (world.getProjectionPlaneById(elementId)) return 'Projection Plane';
    throw new Error(`Selected non-2D element not found: ${elementId}`);
  }

  if (lookup.getPoint2D(elementId)) return '2D Point';
  if (lookup.getLine2D(elementId) instanceof Segment2D) return '2D Segment';
  if (lookup.getLine2D(elementId) instanceof Guide2D) return '2D Guide';
  if (lookup.getLine2D(elementId)) return '2D Line';
  if (lookup.getCircle2D(elementId)) return '2D Circle';
  throw new Error(`Selected 2D element not found: ${elementId}`);
}

function describeEditablePosition(elementId: string, world: PropertiesDialogReadModelContext['world']): PropertiesDialogViewModel['position'] {
  if (!elementId.includes('/')) return null;
  const point = new GeometryElementLookup(world).getPoint2D(elementId);
  if (!(point instanceof FreePoint2D) || point.locked) return null;
  return {
    u: point.position.x,
    v: point.position.y,
    editable: true,
  };
}

function describeCoordinates(elementId: string, world: PropertiesDialogReadModelContext['world'], realizationContext: CachedProjectionElementRealizationContext): string | null {
  if (!elementId.includes('/')) return null;
  const lookup = new GeometryElementLookup(world);

  const point = lookup.getPoint2D(elementId);
  if (point) {
    const realization = world.getProjectionPlaneById(point.planeId)?.getPoint(elementId)?.realize2D(realizationContext);
    if (realization) {
      const pos = realization.getPosition();
      return `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
    }
  }
  const circle = lookup.getCircle2D(elementId);
  if (circle) {
    const realization = world.getProjectionPlaneById(circle.planeId)?.getCircle(elementId)?.realize2D(realizationContext);
    if (realization) return `Center: (${realization.center.x.toFixed(2)}, ${realization.center.y.toFixed(2)}), Radius: ${realization.getRadius().toFixed(2)}`;
  }
  return null;
}

function describeDependencies(elementId: string, world: PropertiesDialogReadModelContext['world']): readonly string[] {
  if (!elementId.includes('/')) return [];
  const lookup = new GeometryElementLookup(world);

  const point = lookup.getPoint2D(elementId);
  if (point instanceof Point2DLineLineIntersection) return [point.line1Id, point.line2Id].filter(Boolean);
  if (point instanceof Point2DLineCircleIntersection) return [point.lineId, point.circleId].filter(Boolean);
  if (point instanceof Point2DCircleCircleIntersection) return [point.circle1Id, point.circle2Id].filter(Boolean);
  const line = lookup.getLine2D(elementId);
  if (line instanceof Line2DByTwoPoints) return [line.point1Id, line.point2Id];
  const segment = line instanceof Segment2D ? line : undefined;
  if (segment instanceof Segment2D) return [segment.point1Id, segment.point2Id];
  const circle = lookup.getCircle2D(elementId);
  if (circle instanceof Circle2DByCenterAndPoint) return [circle.centerPointId, circle.circumferencePointId];
  if (circle instanceof Circle2DByThreePoints) return [circle.point1Id, circle.point2Id, circle.point3Id];
  const guide = lookup.getLine2D(elementId);
  if (guide instanceof Guide2D) return [guide.referenceLineId, guide.throughPointId];
  return [];
}

function styleView(style?: VisualStyle): PropertiesDialogViewModel['style'] {
  return {
    color: style?.color ?? '#000000',
    lineWidth: style?.lineWidth ?? 1.0,
    lineStyle: style?.lineStyle ?? 'solid',
    visible: style?.visible !== false,
  };
}
