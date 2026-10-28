/**
 * toolFamilies.ts - Tool family definitions
 * 
 * Defines the tool families with dropdown menus, including:
 * - Tool grouping (family structure)
 * - Default tool for each family
 * - Tool configurations (icons, labels, shortcuts)
 * 
 */

import type { ToolFamilyConfig } from '@/types/ToolConfig';
import FreePointIcon from '@/components/icons/toolbar/FreePointIcon.vue';
import IntersectionPointIcon from '@/components/icons/toolbar/IntersectionPointIcon.vue';
import LineByTwoPointsIcon from '@/components/icons/toolbar/LineByTwoPointsIcon.vue';
import LineWithAngleIcon from '@/components/icons/toolbar/LineWithAngleIcon.vue';
import ParallelLineIcon from '@/components/icons/toolbar/ParallelLineIcon.vue';
import PerpendicularLineIcon from '@/components/icons/toolbar/PerpendicularLineIcon.vue';
import TangentThroughPointIcon from '@/components/icons/toolbar/TangentThroughPointIcon.vue';
import TangentParallelIcon from '@/components/icons/toolbar/TangentParallelIcon.vue';
import SegmentIcon from '@/components/icons/toolbar/SegmentIcon.vue';
import CircleIcon from '@/components/icons/toolbar/CircleIcon.vue';
import GuideLineIcon from '@/components/icons/toolbar/GuideLineIcon.vue';
import TransportPointIcon from '@/components/icons/toolbar/TransportPointIcon.vue';
import Create3DPointIcon from '@/components/icons/toolbar/Create3DPointIcon.vue';
import Create3DLineIcon from '@/components/icons/toolbar/Create3DLineIcon.vue';
import Create3DSegmentIcon from '@/components/icons/toolbar/Create3DSegmentIcon.vue';
import Create3DPlaneIcon from '@/components/icons/toolbar/Create3DPlaneIcon.vue';
import ExampleIcon from '@/components/icons/toolbar/FreePointIcon.vue';  // TODO: Create dedicated icon for examples

/**
 * Tool families configuration
 * 
 * Eight tool families + Selection Tool (separate button):
 * 1. Point Family: free-point, intersection
 * 2. Line Family: line-by-two-points, parallel-line, perpendicular-line, tangent-*
 * 3. Segment Family: segment
 * 4. Circle Family: circle
 * 5. Guide Family: guide
 * 6. Transport Family: transport (placeholder - not yet implemented)
 * 7. 3D Elements Family: create3dpoint, create3dline, create3dsegment, create3dplane (Phase 78)
 * 8. Constructions Family: construction macros and setup helpers
 */
export const TOOL_FAMILIES: ToolFamilyConfig[] = [
  {
    id: 'point-family',
    label: 'Point',
    icon: FreePointIcon,
    defaultTool: 'point',
    tools: [
      {
        id: 'point',
        label: 'Free Point',
        icon: FreePointIcon,
        shortcut: 'P',
        tooltip: 'Create free point - Click to place point (P)'
      },
      {
        id: 'intersection',
        label: 'Intersection Point',
        icon: IntersectionPointIcon,
        shortcut: 'I',
        tooltip: 'Create intersection point - Select two elements (I)'
      }
    ]
  },
  {
    id: 'line-family',
    label: 'Line',
    icon: LineByTwoPointsIcon,
    defaultTool: 'line',
    tools: [
      {
        id: 'line',
        label: 'Line Through Points',
        icon: LineByTwoPointsIcon,
        shortcut: 'L',
        tooltip: 'Create line through two points (L)'
      },
      {
        id: 'line-with-angle',
        label: 'Line With Angle',
        icon: LineWithAngleIcon,
        tooltip: 'Create line through point at an angle to reference line'
      },
      {
        id: 'parallel-line',
        label: 'Parallel Line',
        icon: ParallelLineIcon,
        tooltip: 'Create line parallel to reference through point'
      },
      {
        id: 'perpendicular-line',
        label: 'Perpendicular Line',
        icon: PerpendicularLineIcon,
        tooltip: 'Create line perpendicular to reference through point'
      },
      {
        id: 'tangent-line-to-circle-through-point',
        label: 'Tangent (Point)',
        icon: TangentThroughPointIcon,
        tooltip: 'Create tangent line to circle through external point'
      },
      {
        id: 'tangent-line-to-circle-parallel',
        label: 'Tangent (Parallel)',
        icon: TangentParallelIcon,
        tooltip: 'Create tangent line to circle parallel to reference'
      }
    ]
  },
  {
    id: 'segment-family',
    label: 'Segment',
    icon: SegmentIcon,
    defaultTool: 'segment',
    tools: [
      {
        id: 'segment',
        label: 'Segment',
        icon: SegmentIcon,
        shortcut: 'S',
        tooltip: 'Create segment between two points (S)'
      }
    ]
  },
  {
    id: 'circle-family',
    label: 'Circle',
    icon: CircleIcon,
    defaultTool: 'circle',
    tools: [
      {
        id: 'circle',
        label: 'Circle',
        icon: CircleIcon,
        shortcut: 'C',
        tooltip: 'Create circle - Pick center then circumference point (C)'
      }
    ]
  },
  {
    id: 'guide-family',
    label: 'Guide',
    icon: GuideLineIcon,
    defaultTool: 'guide',
    tools: [
      {
        id: 'guide',
        label: 'Guide',
        icon: GuideLineIcon,
        shortcut: 'G',
        tooltip: 'Create guide perpendicular to hinge line (G)'
      }
    ]
  },
  {
    id: 'transport-family',
    label: 'Transport',
    icon: TransportPointIcon,
    defaultTool: 'transport',
    tools: [
      {
        id: 'transport',
        label: 'Transport',
        icon: TransportPointIcon,
        shortcut: 'T',
        tooltip: 'Transport distance or point (T) - Not yet implemented'
      }
    ]
  },
  {
    id: '3d-elements-family',
    label: '3D Elements',
    icon: Create3DPointIcon,
    defaultTool: 'create3dpoint',
    tools: [
      {
        id: 'create3dpoint',
        label: '3D Point',
        icon: Create3DPointIcon,
        tooltip: 'Create 3D point from two 2D projections on different planes'
      },
      {
        id: 'create3dline',
        label: '3D Line',
        icon: Create3DLineIcon,
        tooltip: 'Create 3D line from two 2D line projections on different planes'
      },
      {
        id: 'create3dsegment',
        label: '3D Segment',
        icon: Create3DSegmentIcon,
        tooltip: 'Create 3D segment from two 2D segment projections on different planes'
      },
      {
        id: 'create3dplane',
        label: '3D Plane',
        icon: Create3DPlaneIcon,
        tooltip: 'Create 3D plane from two trace lines on different planes'
      },
      {
        id: 'createprojectionplane',
        label: 'Projection Plane',
        icon: Create3DPlaneIcon,  // TODO: Create dedicated icon for auxiliary projection planes
        tooltip: 'Create auxiliary projection plane - Select T1 hinge, T2 other trace, T2\' position'
      }
    ]
  },
  {
    id: 'examples-family',
    label: 'Constructions',
    icon: ExampleIcon,
    defaultTool: 'quickprojectionsetup',
    tools: [
      {
        id: 'create3dpoint-by-coordinates',
        label: '3D Point XYZ',
        icon: Create3DPointIcon,
        tooltip: 'Create 3D point by entering X, Y, Z coordinates'
      },
      {
        id: 'quick-yz-projection-plane',
        label: 'Add YZ Plane',
        icon: Create3DPlaneIcon,
        tooltip: 'Add the YZ profile projection plane'
      },
      {
        id: 'quickprojectionsetup',
        label: 'Folding Plane Setup',
        icon: ExampleIcon,
        tooltip: 'Creates traces T1, T2, T2\' for auxiliary projection plane testing'
      },
      {
        id: 'quick3dline',
        label: 'Quick 3D Line',
        icon: ExampleIcon,
        tooltip: 'Creates example 3D line from two projections'
      },
      {
        id: 'quick3dsegment',
        label: 'Quick 3D Segment',
        icon: ExampleIcon,
        tooltip: 'Creates example 3D segment from two projections'
      }
    ]
  }
];
