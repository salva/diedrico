import type { Element2D } from '@/domain/world/Element2D';
import type { Line2D } from '@/domain/world/Line';
import { SelectionMask } from '@/types/SelectionMask';
import type { CollectionContext, ToolArgumentSet, ToolArgumentSpec } from '@/tools/ToolArgumentCollector';
import { validateDistinctProjectionPlanes } from './toolValidators';

function pointArgument(name: string): ToolArgumentSpec {
  return { name, mask: SelectionMask.point() };
}

export function twoPointArgumentSet(
  firstName: string,
  secondName: string,
  duplicateError: string
): ToolArgumentSet {
  return {
    arguments: [
      pointArgument(firstName),
      {
        ...pointArgument(secondName),
        validator: (element: Element2D, context: CollectionContext) => {
          const first = context.collected.get(firstName);
          if (first?.element && element.id === first.element.id) {
            return { valid: false, error: duplicateError };
          }
          return { valid: true };
        }
      }
    ]
  };
}

export function lineThroughPointArgumentSet(
  referenceLineName = 'referenceLine',
  throughPointName = 'throughPoint',
  infeasibleError?: string,
  referenceLineMask: SelectionMask = SelectionMask.line()
): ToolArgumentSet {
  return {
    arguments: [
      { name: referenceLineName, mask: referenceLineMask },
      pointArgument(throughPointName)
    ],
    setValidator: infeasibleError
      ? (args, context: CollectionContext) => {
          const refLine = args.get(referenceLineName)?.element as Line2D | undefined;
          if (refLine) {
            const realization = context.readPort.realizeLine2D(refLine);
            if (realization && !realization.feasible) {
              return { valid: false, error: infeasibleError };
            }
          }
          return { valid: true };
        }
      : undefined
  };
}

export function projectionPairArgumentSet(
  firstName: string,
  secondName: string,
  mask: SelectionMask,
  samePlaneError: string
): ToolArgumentSet {
  return {
    arguments: [
      { name: firstName, mask },
      { name: secondName, mask }
    ],
    setValidator: (args, context) => validateDistinctProjectionPlanes(
      args,
      context,
      firstName,
      secondName,
      samePlaneError,
    )
  };
}
