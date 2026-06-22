import type { ProjectionLinePresentationDto } from './ThreePresentationModel';
import type { ThreeProjectionLineSourceDto } from './ThreePresentationReadModel';
import { isVisible } from './ThreeStylePolicy';

export class ProjectionLine3DSelector {
  select(lines: ThreeProjectionLineSourceDto[], showProjectionLines: boolean): ProjectionLinePresentationDto[] {
    if (!showProjectionLines) return [];
    return lines
      .filter(isVisible)
      .map(line => ({
        id: `projection-line-${line.id}`,
        kind: 'projection-line' as const,
        sourceEntityId: line.id,
        planeId: line.planeId,
        visible: true,
        style: line.style,
        renderGroup: 'projectionLines' as const,
        start: line.start,
        end: line.end,
      }));
  }
}
