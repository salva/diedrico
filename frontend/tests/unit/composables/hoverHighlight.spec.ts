import { describe, it, expect } from 'vitest';
import { useHoverHighlight } from '@/composables/useHoverHighlight';

describe('useHoverHighlight', () => {
  it('initializes with no hover state', () => {
    const hover = useHoverHighlight();
    expect(hover.hoveredElementId.value).toBeNull();
    expect(hover.hoveredElementType.value).toBeNull();
    expect(hover.hoveredElementLabel.value).toBeNull();
    expect(hover.isHovering.value).toBe(false);
  });

  it('sets, updates, and clears local hover state', () => {
    const first = useHoverHighlight();
    const second = useHoverHighlight();

    first.setHoveredElement('point_1', 'point', 'Point A', true);
    expect(first.hoveredElementId.value).toBe('point_1');
    expect(first.hoverState.value.temporary).toBe(true);
    expect(first.isElementHovered('point_1')).toBe(true);
    expect(second.hoveredElementId.value).toBeNull();

    first.setHoveredElement('line_2', 'line', 'Line B');
    expect(first.hoveredElementId.value).toBe('line_2');
    expect(first.hoveredElementLabel.value).toBe('Line B');

    first.clearHover();
    expect(first.isHovering.value).toBe(false);
  });
});
