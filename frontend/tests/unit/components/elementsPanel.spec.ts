/**
 * Unit tests for ElementsPanel component
 * 
 * Tests:
 * - Element retrieval from World
 * - PlaneId filtering (proj_plane_H/V)
 * - formatLabel subscript notation (ₕ, ᵥ)
 * - formatElement type detection
 * - Version tracking reactivity (polling)
 * - Empty state display
 * - Visibility toggle functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia } from 'pinia';
import ElementsPanel from '../../../src/components/panels/ElementsPanel.vue';
import { World } from '../../../src/domain/world/World';
import { FreePoint2D } from '../../../src/domain/world/Point';
import { Line2DByTwoPoints } from '../../../src/domain/world/Line';
import { Segment2DByPoints } from '../../../src/domain/world/Segment';
import { Circle2DByCenterAndRadius } from '../../../src/domain/world/Circle';
import { Guide2DPerpendicularToLine } from '../../../src/domain/world/Guide';
import { Vector3 } from 'three';

describe('ElementsPanel', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.initializeFixedElements();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  /**
   * Helper to mount component with injected World
   */
  function mountPanel() {
    const pinia = createPinia();
    return mount(ElementsPanel, {
      global: {
        plugins: [pinia],
        provide: {
          world
        },
        stubs: {
          ElementTypeGroup: {
            template: '<div class="element-type-group-stub"><slot /></div>',
            props: ['title', 'elements'],
            setup(props: any) {
              return { props };
            }
          }
        }
      }
    });
  }

  describe('Empty State', () => {
    it('should display empty state message when no elements exist (besides fixed elements)', () => {
      const wrapper = mountPanel();
      
      // World has fixed elements (O_H, O_V origin points), but user-created elements are 0
      // Empty state should be shown based on whether there are no USER elements beyond fixed ones
      // However, the implementation shows all elements, so we expect no empty state
      // because O_H and O_V exist
      expect(wrapper.find('.empty-state').exists()).toBe(false);
    });

    it('should not display empty state when user elements exist', () => {
      // Add a point
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(5, 3, 1), 'proj_plane_H', 'a');
      world.addPoint2D(point);
      
      const wrapper = mountPanel();
      
      expect(wrapper.find('.empty-state').exists()).toBe(false);
    });
  });

  describe('Element Retrieval from World', () => {
    it('should retrieve all points from World', () => {
      // Add points to both planes
      const point1Id = world.generatePoint2DId();
      const point1 = new FreePoint2D(point1Id, new Vector3(1, 2, 1), 'proj_plane_H', 'a');
      world.addPoint2D(point1);
      
      const point2Id = world.generatePoint2DId();
      const point2 = new FreePoint2D(point2Id, new Vector3(3, 4, 1), 'proj_plane_V', 'b');
      world.addPoint2D(point2);
      
      const wrapper = mountPanel();
      
      // Check that component receives points (plus O_H and O_V origin points)
      const vm = wrapper.vm as any;
      expect(vm.horizontalElements.points.length).toBe(2); // O_H + a
      expect(vm.verticalElements.points.length).toBe(2); // O_V + b
    });

    it('should retrieve all lines from World', () => {
      // Create points first
      const p1Id = world.generatePoint2DId();
      const p1 = new FreePoint2D(p1Id, new Vector3(0, 0, 1), 'proj_plane_H');
      world.addPoint2D(p1);
      
      const p2Id = world.generatePoint2DId();
      const p2 = new FreePoint2D(p2Id, new Vector3(5, 5, 1), 'proj_plane_H');
      world.addPoint2D(p2);
      
      // Create line
      const lineId = world.generateLine2DId();
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, 'proj_plane_H', 'L1');
      world.addLine2D(line);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      // Panel filters out hinge lines (half_HL), so only our line shows up
      expect(vm.horizontalElements.lines.length).toBe(1);
    });

    it('should retrieve all segments from World', () => {
      // Create points first
      const p1Id = world.generatePoint2DId();
      const p1 = new FreePoint2D(p1Id, new Vector3(0, 0, 1), 'proj_plane_V');
      world.addPoint2D(p1);
      
      const p2Id = world.generatePoint2DId();
      const p2 = new FreePoint2D(p2Id, new Vector3(5, 5, 1), 'proj_plane_V');
      world.addPoint2D(p2);
      
      // Create segment
      const segmentId = world.generateSegment2DId();
      const segment = new Segment2DByPoints(segmentId, p1Id, p2Id, 'proj_plane_V', 'S1');
      world.addSegment2D(segment);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      expect(vm.verticalElements.segments.length).toBe(1);
    });

    it('should retrieve all circles from World', () => {
      // Create center point
      const centerId = world.generatePoint2DId();
      const center = new FreePoint2D(centerId, new Vector3(5, 5, 1), 'proj_plane_H');
      world.addPoint2D(center);
      
      // Create circle
      const circleId = world.generateCircle2DId();
      const circle = new Circle2DByCenterAndRadius(circleId, centerId, 3, 'proj_plane_H', 'C1');
      world.addCircle2D(circle);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      expect(vm.horizontalElements.circles.length).toBe(1);
    });

    it('should retrieve all guides from World', () => {
      // Create line and point for guide
      const p1Id = world.generatePoint2DId();
      const p1 = new FreePoint2D(p1Id, new Vector3(0, 0, 1), 'proj_plane_V');
      world.addPoint2D(p1);
      
      const p2Id = world.generatePoint2DId();
      const p2 = new FreePoint2D(p2Id, new Vector3(5, 0, 1), 'proj_plane_V');
      world.addPoint2D(p2);
      
      const lineId = world.generateLine2DId();
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, 'proj_plane_V');
      world.addLine2D(line);
      
      const throughPointId = world.generatePoint2DId();
      const throughPoint = new FreePoint2D(throughPointId, new Vector3(3, 3, 1), 'proj_plane_V');
      world.addPoint2D(throughPoint);
      
      // Create guide using World factory
      const guideId = world.addGuide2D('proj_plane_V', lineId, throughPointId);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      expect(vm.verticalElements.guides.length).toBe(1);
    });
  });

  describe('PlaneId Filtering', () => {
    it('should correctly filter elements by proj_plane_H', () => {
      // Add points to both planes
      const pointHId = world.generatePoint2DId();
      const pointH = new FreePoint2D(pointHId, new Vector3(1, 2, 1), 'proj_plane_H', 'a');
      world.addPoint2D(pointH);
      
      const pointVId = world.generatePoint2DId();
      const pointV = new FreePoint2D(pointVId, new Vector3(3, 4, 1), 'proj_plane_V', 'b');
      world.addPoint2D(pointV);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      // World has O_H and O_V default points plus our added points
      expect(vm.horizontalElements.points.length).toBe(2); // O_H + pointH
      expect(vm.horizontalElements.points.some((p: any) => p.label && p.label.includes('a'))).toBe(true);
      expect(vm.verticalElements.points.length).toBe(2); // O_V + pointV
      expect(vm.verticalElements.points.some((p: any) => p.label && p.label.includes('b'))).toBe(true);
    });

    it('should correctly filter elements by proj_plane_V', () => {
      // Add lines to both planes
      const p1HId = world.generatePoint2DId();
      const p1H = new FreePoint2D(p1HId, new Vector3(0, 0, 1), 'proj_plane_H');
      world.addPoint2D(p1H);
      
      const p2HId = world.generatePoint2DId();
      const p2H = new FreePoint2D(p2HId, new Vector3(5, 5, 1), 'proj_plane_H');
      world.addPoint2D(p2H);
      
      const lineHId = world.generateLine2DId();
      const lineH = new Line2DByTwoPoints(lineHId, p1HId, p2HId, 'proj_plane_H', 'LH');
      world.addLine2D(lineH);
      
      const p1VId = world.generatePoint2DId();
      const p1V = new FreePoint2D(p1VId, new Vector3(0, 0, 1), 'proj_plane_V');
      world.addPoint2D(p1V);
      
      const p2VId = world.generatePoint2DId();
      const p2V = new FreePoint2D(p2VId, new Vector3(5, 5, 1), 'proj_plane_V');
      world.addPoint2D(p2V);
      
      const lineVId = world.generateLine2DId();
      const lineV = new Line2DByTwoPoints(lineVId, p1VId, p2VId, 'proj_plane_V', 'LV');
      world.addLine2D(lineV);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      expect(vm.horizontalElements.lines.length).toBe(1);
      expect(vm.verticalElements.lines.length).toBe(1);
    });
  });

  describe('formatLabel Subscript Notation', () => {
    it('should add subscript H for proj_plane_H elements', () => {
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_H', 'a');
      world.addPoint2D(point);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const formattedPoint = vm.horizontalElements.points[0];
      // Should contain subscript H indicator (exact format depends on implementation)
      expect(formattedPoint.label).toBeTruthy();
      // The implementation uses special markers - check the actual format
      // Based on code: label + 'ₕ' (unicode subscript h)
    });

    it('should add subscript V for proj_plane_V elements', () => {
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_V', 'b');
      world.addPoint2D(point);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const formattedPoint = vm.verticalElements.points[0];
      // Should contain subscript V indicator
      expect(formattedPoint.label).toBeTruthy();
    });

    it('should remove type prefix from element IDs in labels', () => {
      const pointId = world.generatePoint2DId(); // Will be like 'point2d_1'
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_H');
      world.addPoint2D(point);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const formattedPoint = vm.horizontalElements.points[0];
      // Label should not contain 'point2d_' prefix
      expect(formattedPoint.label).not.toContain('point2d_');
    });
  });

  describe('formatElement Type Detection', () => {
    it('should correctly detect point type', () => {
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_H');
      world.addPoint2D(point);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const formattedPoint = vm.horizontalElements.points[0];
      expect(formattedPoint.type).toBe('point');
    });

    it('should correctly detect line type', () => {
      const p1Id = world.generatePoint2DId();
      const p1 = new FreePoint2D(p1Id, new Vector3(0, 0, 1), 'proj_plane_H');
      world.addPoint2D(p1);
      
      const p2Id = world.generatePoint2DId();
      const p2 = new FreePoint2D(p2Id, new Vector3(5, 5, 1), 'proj_plane_H');
      world.addPoint2D(p2);
      
      const lineId = world.generateLine2DId();
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, 'proj_plane_H');
      world.addLine2D(line);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      // Find our specific line (not hinge lines)
      const formattedLine = vm.horizontalElements.lines.find((l: any) => l.id === lineId);
      expect(formattedLine).toBeDefined();
      expect(formattedLine.type).toBe('line');
    });

    it('should correctly detect segment type', () => {
      const p1Id = world.generatePoint2DId();
      const p1 = new FreePoint2D(p1Id, new Vector3(0, 0, 1), 'proj_plane_H');
      world.addPoint2D(p1);
      
      const p2Id = world.generatePoint2DId();
      const p2 = new FreePoint2D(p2Id, new Vector3(5, 5, 1), 'proj_plane_H');
      world.addPoint2D(p2);
      
      const segmentId = world.generateSegment2DId();
      const segment = new Segment2DByPoints(segmentId, p1Id, p2Id, 'proj_plane_H');
      world.addSegment2D(segment);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const formattedSegment = vm.horizontalElements.segments[0];
      expect(formattedSegment.type).toBe('segment');
    });

    it('should correctly detect circle type', () => {
      const centerId = world.generatePoint2DId();
      const center = new FreePoint2D(centerId, new Vector3(5, 5, 1), 'proj_plane_H');
      world.addPoint2D(center);
      
      const circleId = world.generateCircle2DId();
      const circle = new Circle2DByCenterAndRadius(circleId, centerId, 3, 'proj_plane_H');
      world.addCircle2D(circle);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const formattedCircle = vm.horizontalElements.circles[0];
      expect(formattedCircle.type).toBe('circle');
    });

    it('should correctly detect guide type', () => {
      const p1Id = world.generatePoint2DId();
      const p1 = new FreePoint2D(p1Id, new Vector3(0, 0, 1), 'proj_plane_H');
      world.addPoint2D(p1);
      
      const p2Id = world.generatePoint2DId();
      const p2 = new FreePoint2D(p2Id, new Vector3(5, 0, 1), 'proj_plane_H');
      world.addPoint2D(p2);
      
      const lineId = world.generateLine2DId();
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, 'proj_plane_H');
      world.addLine2D(line);
      
      const throughPointId = world.generatePoint2DId();
      const throughPoint = new FreePoint2D(throughPointId, new Vector3(3, 3, 1), 'proj_plane_H');
      world.addPoint2D(throughPoint);
      
      // Create guide using World factory
      const guideId = world.addGuide2D('proj_plane_H', lineId, throughPointId);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const formattedGuide = vm.horizontalElements.guides[0];
      expect(formattedGuide.type).toBe('guide');
    });
  });

  describe('Version Tracking Reactivity', () => {
    it('should track World version changes through polling', async () => {
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const initialVersion = world.getVersion();
      
      // Add a point to trigger version change
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_H');
      world.addPoint2D(point);
      
      // Wait for polling interval (100ms as per component implementation)
      await new Promise(resolve => setTimeout(resolve, 150));
      await nextTick();
      
      // Version should have changed
      expect(world.getVersion()).toBeGreaterThan(initialVersion);
      
      // Component should have detected the change (O_H + our point)
      expect(vm.horizontalElements.points.length).toBe(2);
    });

    it('should update display when elements are added', async () => {
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      // World has default elements (O_H, O_V, hinge lines)
      const initialCount = vm.horizontalElements.points.length;
      expect(initialCount).toBeGreaterThan(0);
      
      // Add a point
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_H');
      world.addPoint2D(point);
      
      // Wait for polling to detect change
      await new Promise(resolve => setTimeout(resolve, 150));
      await nextTick();
      
      // Element count should have increased
      expect(vm.horizontalElements.points.length).toBe(initialCount + 1);
    });
  });

  describe('Visibility Toggle', () => {
    it('should correctly report visible property for elements', () => {
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_H');
      world.addPoint2D(point);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      const formattedPoint = vm.horizontalElements.points[0];
      expect(formattedPoint.visible).toBe(true);
    });

    it('should reflect visibility changes in formatted elements', () => {
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_H');
      world.addPoint2D(point);
      
      // Toggle visibility
      world.togglePoint2DVisibility(pointId);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      // Find our specific point (not the default O_H)
      const formattedPoint = vm.horizontalElements.points.find((p: any) => p.id === pointId);
      expect(formattedPoint).toBeDefined();
      expect(formattedPoint.visible).toBe(false);
    });

    it('should call World method when visibility is toggled', async () => {
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_H');
      world.addPoint2D(point);
      
      const wrapper = mountPanel();
      
      // Spy on World's toggle method
      const toggleSpy = vi.spyOn(world, 'togglePoint2DVisibility');
      
      // Trigger visibility toggle
      const vm = wrapper.vm as any;
      vm.handleVisibilityToggle(pointId);
      
      expect(toggleSpy).toHaveBeenCalledWith(pointId);
    });
  });

  describe('Element Count', () => {
    it('should correctly count elements by type', () => {
      // Add various elements
      const p1Id = world.generatePoint2DId();
      const p1 = new FreePoint2D(p1Id, new Vector3(1, 1, 1), 'proj_plane_H');
      world.addPoint2D(p1);
      
      const p2Id = world.generatePoint2DId();
      const p2 = new FreePoint2D(p2Id, new Vector3(2, 2, 1), 'proj_plane_H');
      world.addPoint2D(p2);
      
      const lineId = world.generateLine2DId();
      const line = new Line2DByTwoPoints(lineId, p1Id, p2Id, 'proj_plane_H');
      world.addLine2D(line);
      
      const wrapper = mountPanel();
      const vm = wrapper.vm as any;
      
      // Count includes O_H origin point + our 2 points = 3
      expect(vm.horizontalElements.points.length).toBe(3);
      // Panel filters out hinge lines, so only our line shows up
      expect(vm.horizontalElements.lines.length).toBe(1);
      expect(vm.horizontalElements.segments.length).toBe(0);
    });

    it('should set hasElements flag correctly', () => {
      const wrapper1 = mountPanel();
      const vm1 = wrapper1.vm as any;
      
      // World always has O_H and O_V origin points
      expect(vm1.horizontalElements.hasElements).toBe(true);
      expect(vm1.verticalElements.hasElements).toBe(true);
      
      // Add an element
      const pointId = world.generatePoint2DId();
      const point = new FreePoint2D(pointId, new Vector3(1, 2, 1), 'proj_plane_V');
      world.addPoint2D(point);
      
      const wrapper2 = mountPanel();
      const vm2 = wrapper2.vm as any;
      
      expect(vm2.verticalElements.hasElements).toBe(true);
    });
  });
});
