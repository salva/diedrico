import { describe, it, expect, beforeEach } from 'vitest';
import { useHoverHighlight, useGlobalHoverHighlight } from '@/composables/useHoverHighlight';

describe('useHoverHighlight', () => {
  describe('Local Instance', () => {
    let hoverHighlight: ReturnType<typeof useHoverHighlight>;

    beforeEach(() => {
      hoverHighlight = useHoverHighlight();
    });

    it('should initialize with no hover state', () => {
      expect(hoverHighlight.hoveredElementId.value).toBeNull();
      expect(hoverHighlight.hoveredElementType.value).toBeNull();
      expect(hoverHighlight.hoveredElementLabel.value).toBeNull();
      expect(hoverHighlight.isHovering.value).toBe(false);
    });

    it('should set hover state when element is hovered', () => {
      hoverHighlight.setHoveredElement('point_1', 'point', 'Point A', false);

      expect(hoverHighlight.hoveredElementId.value).toBe('point_1');
      expect(hoverHighlight.hoveredElementType.value).toBe('point');
      expect(hoverHighlight.hoveredElementLabel.value).toBe('Point A');
      expect(hoverHighlight.isHovering.value).toBe(true);
    });

    it('should clear hover state', () => {
      hoverHighlight.setHoveredElement('point_1', 'point', 'Point A', false);
      hoverHighlight.clearHover();

      expect(hoverHighlight.hoveredElementId.value).toBeNull();
      expect(hoverHighlight.hoveredElementType.value).toBeNull();
      expect(hoverHighlight.hoveredElementLabel.value).toBeNull();
      expect(hoverHighlight.isHovering.value).toBe(false);
    });

    it('should detect if specific element is hovered', () => {
      hoverHighlight.setHoveredElement('point_1', 'point', 'Point A', false);

      expect(hoverHighlight.isElementHovered('point_1')).toBe(true);
      expect(hoverHighlight.isElementHovered('point_2')).toBe(false);
    });

    it('should handle temporary hover state', () => {
      hoverHighlight.setHoveredElement('point_1', 'point', 'Point A', true);

      expect(hoverHighlight.hoveredElementId.value).toBe('point_1');
      expect(hoverHighlight.hoverState.value.temporary).toBe(true);
    });

    it('should update hover when element changes', () => {
      hoverHighlight.setHoveredElement('point_1', 'point', 'Point A', false);
      hoverHighlight.setHoveredElement('line_2', 'line', 'Line B', false);

      expect(hoverHighlight.hoveredElementId.value).toBe('line_2');
      expect(hoverHighlight.hoveredElementType.value).toBe('line');
      expect(hoverHighlight.hoveredElementLabel.value).toBe('Line B');
    });
  });

  describe('Global Singleton', () => {
    beforeEach(() => {
      // Clear global state before each test
      const global = useGlobalHoverHighlight();
      global.clearHover();
    });

    it('should share state across multiple instances', () => {
      const instance1 = useGlobalHoverHighlight();
      const instance2 = useGlobalHoverHighlight();

      instance1.setHoveredElement('point_1', 'point', 'Point A', false);

      // Both instances should see the same hover state
      expect(instance1.hoveredElementId.value).toBe('point_1');
      expect(instance2.hoveredElementId.value).toBe('point_1');
      expect(instance1.isHovering.value).toBe(true);
      expect(instance2.isHovering.value).toBe(true);
    });

    it('should propagate clear hover across instances', () => {
      const instance1 = useGlobalHoverHighlight();
      const instance2 = useGlobalHoverHighlight();

      instance1.setHoveredElement('point_1', 'point', 'Point A', false);
      instance2.clearHover();

      expect(instance1.isHovering.value).toBe(false);
      expect(instance2.isHovering.value).toBe(false);
    });

    it('should update hover from any instance', () => {
      const instance1 = useGlobalHoverHighlight();
      const instance2 = useGlobalHoverHighlight();

      instance1.setHoveredElement('point_1', 'point', 'Point A', false);
      instance2.setHoveredElement('line_2', 'line', 'Line B', false);

      expect(instance1.hoveredElementId.value).toBe('line_2');
      expect(instance2.hoveredElementId.value).toBe('line_2');
    });
  });

  describe('Computed Properties', () => {
    let hoverHighlight: ReturnType<typeof useHoverHighlight>;

    beforeEach(() => {
      hoverHighlight = useHoverHighlight();
    });

    it('should compute isHovering correctly', () => {
      expect(hoverHighlight.isHovering.value).toBe(false);

      hoverHighlight.setHoveredElement('point_1', 'point', 'Point A', false);
      expect(hoverHighlight.isHovering.value).toBe(true);

      hoverHighlight.clearHover();
      expect(hoverHighlight.isHovering.value).toBe(false);
    });

    it('should return null for computed properties when not hovering', () => {
      expect(hoverHighlight.hoveredElementId.value).toBeNull();
      expect(hoverHighlight.hoveredElementType.value).toBeNull();
      expect(hoverHighlight.hoveredElementLabel.value).toBeNull();
    });
  });
});
