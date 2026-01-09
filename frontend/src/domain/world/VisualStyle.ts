/**
 * Visual styling properties for geometric elements
 * Supports inheritance from subprocess
 */
export interface VisualStyle {
  color: string;             // Hex color code (e.g., "#000000")
  lineWidth: number;         // Line width in pixels
  lineStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;           // 0.0 to 1.0
  visible: boolean;          // Element visibility
  inherited: boolean;        // Whether style is inherited from subprocess
}

/**
 * Default visual style for new elements
 */
export const defaultVisualStyle: VisualStyle = {
  color: '#000000',
  lineWidth: 2,
  lineStyle: 'solid',
  opacity: 1.0,
  visible: true,
  inherited: true
};

/**
 * Factory function to create visual style with overrides
 */
export function createVisualStyle(overrides?: Partial<VisualStyle>): VisualStyle {
  return {
    ...defaultVisualStyle,
    ...overrides
  };
}

/**
 * Special styles for system-managed elements
 */
export const infeasibleStyle: Partial<VisualStyle> = {
  color: '#ff0000',
  lineStyle: 'dashed',
  opacity: 0.5
};

export const derivedProjectionStyle: Partial<VisualStyle> = {
  opacity: 0.5,
  lineStyle: 'dashed'
};

export const guideStyle: Partial<VisualStyle> = {
  color: '#0000ff',
  lineStyle: 'dotted',
  lineWidth: 1
};

export const hingeLineStyle: Partial<VisualStyle> = {
  color: '#00ff00',
  lineWidth: 3
};
