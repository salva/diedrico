import { Guide2D } from '@/domain/world/Guide';
import { HalfHingeLine2D } from '@/domain/world/HingeLine';
import { Segment2D } from '@/domain/world/Segment';
import type { VisualStyle } from '@/domain/world/VisualStyle';
import type { World } from '@/domain/world/World';
import type { ElementsPanelElementViewModel, ElementsPanelReadModel } from '../RuntimeViewPorts';

type PanelElement = { id?: string; label?: string; visualStyle?: VisualStyle; position?: { x: number; y: number }; radius?: number };

export interface ElementsPanelReadModelContext {
  readonly world: Pick<World,
    | 'getAllProjectionPlanes'
    | 'getAll3DPoints'
    | 'getAll3DLines'
    | 'getAll3DSegments'
    | 'getAllPlanes'
  >;
}

export function buildElementsPanelReadModel(context: ElementsPanelReadModelContext): ElementsPanelReadModel {
  const world = context.world;
  const threeDPoints = world.getAll3DPoints();
  const threeDLines = world.getAll3DLines();
  const threeDSegments = world.getAll3DSegments();
  const planes = world.getAllPlanes();
  return {
    projectionPlanes: world.getAllProjectionPlanes().slice().sort(compareProjectionPlaneNames).map(plane => {
      const points = plane.getAllPoints();
      const allLines = plane.getAllLines();
      const lines = allLines.filter(l => !(l instanceof HalfHingeLine2D) && !(l instanceof Segment2D) && !(l instanceof Guide2D));
      const segments = allLines.filter(l => l instanceof Segment2D);
      const circles = plane.getAllCircles();
      const guides = allLines.filter(l => l instanceof Guide2D);
      return {
        id: plane.id,
        name: plane.name,
        label: plane.name === 'P_H' ? 'Horizontal' : (plane.name === 'P_V' ? 'Vertical' : 'Auxiliary'),
        elements: {
          points: points.map(element => formatElementForPanel(element, 'point')),
          lines: lines.map(element => formatElementForPanel(element, 'line')),
          segments: segments.map(element => formatElementForPanel(element, 'segment')),
          circles: circles.map(element => formatElementForPanel(element, 'circle')),
          guides: guides.map(element => formatElementForPanel(element, 'guide')),
        },
        hasElements: points.length + lines.length + segments.length + circles.length + guides.length > 0,
      };
    }),
    threeDElements: {
      points: threeDPoints.map(element => formatElementForPanel(element, 'point')),
      lines: threeDLines.map(element => formatElementForPanel(element, 'line')),
      segments: threeDSegments.map(element => formatElementForPanel(element, 'segment')),
      planes: planes.map(element => formatElementForPanel(element, 'plane')),
      hasElements: threeDPoints.length + threeDLines.length + threeDSegments.length + planes.length > 0,
    },
  };
}

function compareProjectionPlaneNames(a: { name: string }, b: { name: string }): number {
  if (a.name === 'P_H') return -1;
  if (b.name === 'P_H') return 1;
  if (a.name === 'P_V') return -1;
  if (b.name === 'P_V') return 1;
  return a.name.localeCompare(b.name);
}

function formatElementForPanel(element: PanelElement, fallbackType: string): ElementsPanelElementViewModel {
  const id = element.id ?? '';
  return {
    id,
    label: element.label || id,
    type: fallbackType,
    visible: element.visualStyle?.visible !== false,
    properties: getElementProperties(element),
  };
}

function getElementProperties(element: PanelElement): string {
  if ('position' in element && element.position) {
    const pos = element.position;
    return `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`;
  }
  if ('radius' in element && typeof element.radius === 'number') return `r=${element.radius.toFixed(2)}`;
  return '';
}
