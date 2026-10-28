import { CircleTool } from '@/tools/CircleTool';
import { Create3DLineTool } from '@/tools/Create3DLineTool';
import { Create3DPlaneTool } from '@/tools/Create3DPlaneTool';
import { Create3DPointTool } from '@/tools/Create3DPointTool';
import { Create3DSegmentTool } from '@/tools/Create3DSegmentTool';
import { CreateProjectionPlaneTool } from '@/tools/CreateProjectionPlaneTool';
import { GuideTool } from '@/tools/GuideTool';
import { IntersectionTool } from '@/tools/IntersectionTool';
import type { CanvasTool } from '@/tools/ITool';
import type { ToolType } from './ToolTypes';
import { LineTool } from '@/tools/LineTool';
import { LineWithAngleTool } from '@/tools/LineWithAngleTool';
import { ParallelLineTool } from '@/tools/ParallelLineTool';
import { PerpendicularLineTool } from '@/tools/PerpendicularLineTool';
import { PointTool } from '@/tools/PointTool';
import { SegmentTool } from '@/tools/SegmentTool';
import { TangentLineToCircleParallelToLineTool } from '@/tools/TangentLineToCircleParallelToLineTool';
import { TangentLineToCircleThroughPointTool } from '@/tools/TangentLineToCircleThroughPointTool';

export type { CanvasTool } from '@/tools/ITool';

export function createCanvasTool(tool: ToolType): CanvasTool | null {
  switch (tool) {
    case 'point': return new PointTool();
    case 'line': return new LineTool();
    case 'line-with-angle': return new LineWithAngleTool();
    case 'segment': return new SegmentTool();
    case 'circle': return new CircleTool();
    case 'guide': return new GuideTool();
    case 'intersection': return new IntersectionTool();
    case 'parallel-line': return new ParallelLineTool();
    case 'perpendicular-line': return new PerpendicularLineTool();
    case 'tangent-line-to-circle-through-point': return new TangentLineToCircleThroughPointTool();
    case 'tangent-line-to-circle-parallel': return new TangentLineToCircleParallelToLineTool();
    case 'create3dpoint': return new Create3DPointTool();
    case 'create3dline': return new Create3DLineTool();
    case 'create3dsegment': return new Create3DSegmentTool();
    case 'create3dplane': return new Create3DPlaneTool();
    case 'createprojectionplane': return new CreateProjectionPlaneTool();
    default: return null;
  }
}
