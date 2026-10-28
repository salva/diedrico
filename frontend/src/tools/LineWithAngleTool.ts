import { ArgumentCollectorTool } from './ArgumentCollectorTool';
import type { ArgumentValue, ToolArgumentSet } from '@/tools/ToolArgumentCollector';
import type { ToolContext } from './ITool';
import type { ToolConstructionIntent } from './ToolCommandIntents';
import { SelectionMask } from '@/types/SelectionMask';

export class LineWithAngleTool extends ArgumentCollectorTool {
  readonly name = 'line-with-angle';

  protected getArgumentSets(): ToolArgumentSet[] {
    return [
      {
        label: 'line with angle',
        arguments: [
          {
            name: 'referenceLine',
            mask: SelectionMask.line(),
          },
          {
            name: 'throughPoint',
            mask: SelectionMask.point(),
          },
          {
            kind: 'scalar',
            name: 'angle',
            valueKind: 'angle',
            unit: 'degrees',
            numericInput: true,
            mouseInput: true,
            mouseResolver: {
              kind: 'angle-from-line',
              referenceLineArgument: 'referenceLine',
              vertexArgument: 'throughPoint',
            },
          },
        ],
      },
    ];
  }

  protected buildConstructionIntent(args: Map<string, ArgumentValue>, context: ToolContext): ToolConstructionIntent {
    return {
      type: 'line-with-angle',
      planeId: context.planeId,
      referenceLineId: this.requireElementId(args, 'referenceLine'),
      throughPointId: this.requireElementId(args, 'throughPoint'),
      angleRadians: this.requireScalarAngle(args, 'angle'),
      description: this.getCommandDescription(),
    };
  }

  protected getCommandDescription(): string {
    return 'Create line with angle';
  }
}
