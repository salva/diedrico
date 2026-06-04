import { describe, it, expect, beforeEach } from 'vitest';
import { useGlobalHoverHighlight } from '@/composables/useHoverHighlight';

describe('useGlobalHoverHighlight', () => {
  beforeEach(() => {
    useGlobalHoverHighlight().clearHover();
  });

  it('initializes with no hover state', () => {
    const hover = useGlobalHoverHighlight();
    expect(hover.hoveredElementId.value).toBeNull();
    expect(hover.hoveredElementType.value).toBeNull();
    expect(hover.hoveredElementLabel.value).toBeNull();
    expect(hover.isHovering.value).toBe(false);
  });

  it('sets, updates, and clears shared hover state', () => {
    const first = useGlobalHoverHighlight();
    const second = useGlobalHoverHighlight();

    first.setHoveredElement('point_1', 'point', 'Point A', true);
    expect(second.hoveredElementId.value).toBe('point_1');
    expect(second.hoverState.value.temporary).toBe(true);
    expect(second.isElementHovered('point_1')).toBe(true);

    second.setHoveredElement('line_2', 'line', 'Line B');
    expect(first.hoveredElementId.value).toBe('line_2');
    expect(first.hoveredElementLabel.value).toBe('Line B');

    first.clearHover();
    expect(second.isHovering.value).toBe(false);
  });
});
