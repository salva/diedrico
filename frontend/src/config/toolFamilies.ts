/**
 * toolFamilies.ts - Tool family definitions
 * 
 * Defines the tool families with dropdown menus, including:
 * - Tool grouping (family structure)
 * - Default tool for each family
 * - Tool configurations (icons, labels, shortcuts, completion behavior)
 * 
 * Reference: specs/001-dihedral-learning-mvp/data-model.md - Phase 67
 */

import type { ToolFamilyConfig } from '@/types/ToolConfig';

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
    icon: '●', // Circle emoji as point
    defaultTool: 'point',
    tools: [
      {
        id: 'point',
        label: 'Free Point',
        icon: '●',
        shortcut: 'P',
        tooltip: 'Create free point - Click to place point (P)',
        completionBehavior: 'stay-active'
      },
      {
        id: 'intersection',
        label: 'Intersection Point',
        icon: '⨯', // Multiplication X as intersection
        shortcut: 'I',
        tooltip: 'Create intersection point - Select two elements (I)',
        completionBehavior: 'return-to-selection'
      }
    ]
  },
  {
    id: 'line-family',
    label: 'Line',
    icon: '─', // Horizontal line
    defaultTool: 'line',
    tools: [
      {
        id: 'line',
        label: 'Line Through Points',
        icon: '─',
        shortcut: 'L',
        tooltip: 'Create line through two points (L)',
        completionBehavior: 'stay-active'
      },
      {
        id: 'parallel-line',
        label: 'Parallel Line',
        icon: '∥', // Parallel symbol
        tooltip: 'Create line parallel to reference through point',
        completionBehavior: 'return-to-selection'
      },
      {
        id: 'perpendicular-line',
        label: 'Perpendicular Line',
        icon: '⟂', // Perpendicular symbol
        tooltip: 'Create line perpendicular to reference through point',
        completionBehavior: 'return-to-selection'
      },
      {
        id: 'tangent-line-to-circle-through-point',
        label: 'Tangent (Point)',
        icon: '⟋', // Tangent-like symbol
        tooltip: 'Create tangent line to circle through external point',
        completionBehavior: 'return-to-selection'
      },
      {
        id: 'tangent-line-to-circle-parallel',
        label: 'Tangent (Parallel)',
        icon: '⟋∥', // Tangent + parallel
        tooltip: 'Create tangent line to circle parallel to reference',
        completionBehavior: 'return-to-selection'
      }
    ]
  },
  {
    id: 'segment-family',
    label: 'Segment',
    icon: '─●', // Line with endpoint
    defaultTool: 'segment',
    tools: [
      {
        id: 'segment',
        label: 'Segment',
        icon: '─●',
        shortcut: 'S',
        tooltip: 'Create segment between two points (S)',
        completionBehavior: 'stay-active'
      }
    ]
  },
  {
    id: 'circle-family',
    label: 'Circle',
    icon: '○', // Circle emoji
    defaultTool: 'circle',
    tools: [
      {
        id: 'circle',
        label: 'Circle',
        icon: '○',
        shortcut: 'C',
        tooltip: 'Create circle - Pick center then circumference point (C)',
        completionBehavior: 'stay-active'
      }
    ]
  },
  {
    id: 'guide-family',
    label: 'Guide',
    icon: '┆', // Dashed vertical line
    defaultTool: 'guide',
    tools: [
      {
        id: 'guide',
        label: 'Guide',
        icon: '┆',
        shortcut: 'G',
        tooltip: 'Create guide perpendicular to hinge line (G)',
        completionBehavior: 'return-to-selection'
      }
    ]
  },
  {
    id: 'transport-family',
    label: 'Transport',
    icon: '↔', // Bidirectional arrow
    defaultTool: 'transport',
    tools: [
      {
        id: 'transport',
        label: 'Transport',
        icon: '↔',
        shortcut: 'T',
        tooltip: 'Transport distance or point (T) - Not yet implemented',
        completionBehavior: 'return-to-selection'
      }
    ]
  }
];
