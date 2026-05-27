import { describe, expect, it, vi } from 'vitest';
import { buildElementsPanelReadModel } from '@/application/appShell/readModels/ElementsPanelReadModel';
import { toggleElementVisibility } from '@/application/appShell/readModels/ElementVisibilityIntent';
import { countProcessNodeViewModels } from '@/application/appShell/readModels/ProcessTreeReadModel';
import type { ProcessNodeViewModel } from '@/application/appShell/RuntimeViewPorts';

describe('Cycle 027 runtime read-model extractors', () => {
  it('builds elements panel DTOs without exposing visibility mutation as read-model state', () => {
    const point = { id: 'P_H/point1', label: 'A_1', position: { x: 1, y: 2 }, visualStyle: { visible: false } };
    const plane = {
      id: 'P_H',
      name: 'P_H',
      getAllPoints: () => [point],
      getAllLines: () => [],
      getAllCircles: () => [],
    };
    const model = buildElementsPanelReadModel({
      world: {
        getAllProjectionPlanes: () => [plane],
        getAll3DPoints: () => [],
        getAll3DLines: () => [],
        getAll3DSegments: () => [],
        getAllPlanes: () => [],
      },
    });

    expect(model.projectionPlanes[0].label).toBe('Horizontal');
    expect(model.projectionPlanes[0].elements.points[0]).toMatchObject({
      id: 'P_H/point1',
      label: 'A_1',
      type: 'point',
      visible: false,
      properties: '(1.00, 2.00)',
    });
    expect(model).not.toHaveProperty('toggleVisibility');
  });

  it('keeps element visibility as an adjacent intent that preserves dirty semantics', () => {
    const markDirty = vi.fn();
    const element: { visualStyle?: { visible?: boolean; color?: string; lineWidth?: number; lineStyle?: string; opacity?: number; inherited?: boolean } } = {};

    toggleElementVisibility('P_H/point1', {
      findElement: id => id === 'P_H/point1' ? element : undefined,
      markDirty,
    });

    expect(element.visualStyle?.visible).toBe(false);
    expect(markDirty).toHaveBeenCalledTimes(1);

    toggleElementVisibility('P_H/point1', {
      findElement: () => element,
      markDirty,
    });

    expect(element.visualStyle?.visible).toBe(true);
    expect(markDirty).toHaveBeenCalledTimes(2);
  });

  it('counts recursive process-node DTOs outside RuntimeSession', () => {
    const tree: ProcessNodeViewModel = {
      id: 'root',
      type: 'subprocess',
      isOutput: true,
      children: [
        {
          id: 'group',
          type: 'actionGroup',
          isOutput: false,
          children: [
            { id: 'action', type: 'action', isOutput: true, elementId: 'P_H/point1', descriptionParts: [{ type: 'text', content: 'Point' }], isInfeasible: false, hideBecauseElementMissing: false },
          ],
          descriptionParts: [],
          isInfeasible: false,
          hideBecauseElementMissing: false,
        },
      ],
      descriptionParts: [],
      isInfeasible: false,
      hideBecauseElementMissing: false,
    };

    expect(countProcessNodeViewModels(tree)).toBe(3);
  });
});
