/**
 * toolFamilies.ts - Tool family definitions
 * 
 * Defines the tool families with dropdown menus, including:
 * - Tool grouping (family structure)
 * - Default tool for each family
 * - Tool configurations (icons, labels, shortcuts, completion behavior)
 * 
 * Reference: 
 * - specs/001-dihedral-learning-mvp/data-model.md - Phase 67
 * - specs/001-dihedral-learning-mvp/data-model.md - Phase 68 (SVG icon components)
 */

import type { ToolFamilyConfig } from '@/types/ToolConfig';
import { markRaw } from 'vue';
import FreePointIcon from '@/components/icons/toolbar/FreePointIcon.vue';
import IntersectionPointIcon from '@/components/icons/toolbar/IntersectionPointIcon.vue';
import LineByTwoPointsIcon from '@/components/icons/toolbar/LineByTwoPointsIcon.vue';
import ParallelLineIcon from '@/components/icons/toolbar/ParallelLineIcon.vue';
import PerpendicularLineIcon from '@/components/icons/toolbar/PerpendicularLineIcon.vue';
import TangentThroughPointIcon from '@/components/icons/toolbar/TangentThroughPointIcon.vue';
import TangentParallelIcon from '@/components/icons/toolbar/TangentParallelIcon.vue';
import SegmentIcon from '@/components/icons/toolbar/SegmentIcon.vue';
import CircleIcon from '@/components/icons/toolbar/CircleIcon.vue';
import GuideLineIcon from '@/components/icons/toolbar/GuideLineIcon.vue';
import TransportPointIcon from '@/components/icons/toolbar/TransportPointIcon.vue';

/**
 * Tool families configuration
 * 
 * Six tool families + Selection Tool (separate button):
 * 1. Point Family: free-point, intersection
 * 2. Line Family: line-by-two-points, parallel-line, perpendicular-line, tangent-*
 * 3. Segment Family: segment
 * 4. Circle Family: circle
 * 5. Guide Family: guide
 * 6. Transport Family: transport (placeholder - not yet implemented)
 */
export const TOOL_FAMILIES: ToolFamilyConfig[] = [
  {
    id: 'point-family',
    label: 'Point',
    icon: markRaw(FreePointIcon),
    defaultTool: 'point',
    tools: [
      {
        id: 'point',
        label: 'Free Point',
        icon: markRaw(FreePointIcon),
        shortcut: 'P',
        tooltip: 'Create free point - Click to place point (P)',
        completionBehavior: 'stay-active'
      },
      {
        id: 'intersection',
        label: 'Intersection Point',
        icon: markRaw(IntersectionPointIcon),
        shortcut: 'I',
        tooltip: 'Create intersection point - Select two elements (I)',
        completionBehavior: 'stay-active'
      }
    ]
  },
  {
    id: 'line-family',
    label: 'Line',
    icon: markRaw(LineByTwoPointsIcon),
    defaultTool: 'line',
    tools: [
      {
        id: 'line',
        label: 'Line Through Points',
        icon: markRaw(LineByTwoPointsIcon),
        shortcut: 'L',
        tooltip: 'Create line through two points (L)',
        completionBehavior: 'stay-active'
      },
      {
        id: 'parallel-line',
        label: 'Parallel Line',
        icon: markRaw(ParallelLineIcon),
        tooltip: 'Create line parallel to reference through point',
        completionBehavior: 'stay-active'
      },
      {
        id: 'perpendicular-line',
        label: 'Perpendicular Line',
        icon: markRaw(PerpendicularLineIcon),
        tooltip: 'Create line perpendicular to reference through point',
        completionBehavior: 'stay-active'
      },
      {
        id: 'tangent-line-to-circle-through-point',
        label: 'Tangent (Point)',
        icon: markRaw(TangentThroughPointIcon),
        tooltip: 'Create tangent line to circle through external point',
        completionBehavior: 'stay-active'
      },
      {
        id: 'tangent-line-to-circle-parallel',
        label: 'Tangent (Parallel)',
        icon: markRaw(TangentParallelIcon),
        tooltip: 'Create tangent line to circle parallel to reference',
        completionBehavior: 'stay-active'
      }
    ]
  },
  {
    id: 'segment-family',
    label: 'Segment',
    icon: markRaw(SegmentIcon),
    defaultTool: 'segment',
    tools: [
      {
        id: 'segment',
        label: 'Segment',
        icon: markRaw(SegmentIcon),
        shortcut: 'S',
        tooltip: 'Create segment between two points (S)',
        completionBehavior: 'stay-active'
      }
    ]
  },
  {
    id: 'circle-family',
    label: 'Circle',
    icon: markRaw(CircleIcon),
    defaultTool: 'circle',
    tools: [
      {
        id: 'circle',
        label: 'Circle',
        icon: markRaw(CircleIcon),
        shortcut: 'C',
        tooltip: 'Create circle - Pick center then circumference point (C)',
        completionBehavior: 'stay-active'
      }
    ]
  },
  {
    id: 'guide-family',
    label: 'Guide',
    icon: markRaw(GuideLineIcon),
    defaultTool: 'guide',
    tools: [
      {
        id: 'guide',
        label: 'Guide',
        icon: markRaw(GuideLineIcon),
        shortcut: 'G',
        tooltip: 'Create guide perpendicular to hinge line (G)',
        completionBehavior: 'stay-active'
      }
    ]
  },
  {
    id: 'transport-family',
    label: 'Transport',
    icon: markRaw(TransportPointIcon),
    defaultTool: 'transport',
    tools: [
      {
        id: 'transport',
        label: 'Transport',
        icon: markRaw(TransportPointIcon),
        shortcut: 'T',
        tooltip: 'Transport distance or point (T) - Not yet implemented',
        completionBehavior: 'stay-active'
      }
    ]
  }
];
