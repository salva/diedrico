/**
 * Unit tests for PropertiesDialog component
 * 
 * Tests dialog functionality including:
 * - Dialog open/close behavior
 * - Property display per element type
 * - Style input validation
 * - Save/cancel operations
 * - Override checkbox behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PropertiesDialog from '@/components/dialogs/PropertiesDialog.vue';
import { World } from '@/domain/world/World';
import { Vector3 } from 'three';

describe('PropertiesDialog', () => {
  let world: World;
  let testPointId: string; // Helper for tests that need a valid element ID
  
  beforeEach(() => {
    world = new World();
    
    // Create a test point for tests that need a valid element ID
    const planeH = world.getProjectionPlaneByLabel('P_H');
    const point = planeH.addFreePoint2D(new Vector3(0, 0, 1), world);
    testPointId = point.id;
  });

  describe('Dialog visibility', () => {
    it('should not render when isOpen is false', () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: false,
          elementId: null,
          world: null
        }
      });
      
      expect(wrapper.find('.dialog-overlay').exists()).toBe(false);
    });

    it('should render when isOpen is true', () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      expect(wrapper.find('.dialog-overlay').exists()).toBe(true);
      expect(wrapper.find('.properties-dialog').exists()).toBe(true);
    });

    it('should emit close event when close button clicked', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      await wrapper.find('.close-button').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close event when overlay clicked', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      await wrapper.find('.dialog-overlay').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close event when cancel button clicked', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      await wrapper.find('.button-secondary').trigger('click');
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  describe('Element type detection', () => {
    it('should display "2D Point" for point elements', () => {
      // Add a point to world
      const planeH = world.getProjectionPlaneByLabel('P_H');
      const position = new Vector3(0, 0, 1);
      const point = planeH.addFreePoint2D(position, world);
      const pointId = point.id;
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: pointId,
          world
        }
      });
      
      expect(wrapper.text()).toContain('2D Point');
    });

    it('should display plane ID for 2D elements', () => {
      const planeH = world.getProjectionPlaneByLabel('P_H');
      const position = new Vector3(0, 0, 1);
      const point = planeH.addFreePoint2D(position, world);
      const pointId = point.id;
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: pointId,
          world
        }
      });
      
      expect(wrapper.text()).toContain(planeH.id);
    });
  });

  describe('Style input validation', () => {
    it('should validate hex color format', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      // Enable color override
      const colorOverride = wrapper.find('input[type="checkbox"]');
      await colorOverride.setValue(true);
      
      // Set invalid color
      const hexInput = wrapper.find('.hex-input');
      await hexInput.setValue('invalid');
      await hexInput.trigger('blur');
      
      // Check for error message
      expect(wrapper.text()).toContain('Invalid hex color format');
    });

    it('should accept valid hex colors', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      // Enable color override
      const overrideCheckboxes = wrapper.findAll('input[type="checkbox"]');
      await overrideCheckboxes[0].setValue(true);
      
      // Set valid color
      const hexInput = wrapper.find('.hex-input');
      await hexInput.setValue('#FF5733');
      await hexInput.trigger('blur');
      
      // Should not show error
      expect(wrapper.text()).not.toContain('Invalid hex color format');
    });

    it('should validate line width range', async () => {
      // Add a line element
      const planeH = world.getProjectionPlaneByLabel('P_H');
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(10, 10, 1);
      const point1 = planeH.addFreePoint2D(pos1, world);
      const point2 = planeH.addFreePoint2D(pos2, world);
      const line = planeH.addLine2DBetweenTwoPoints(point1.id, point2.id, world);
      const lineId = line.id;
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: lineId,
          world
        }
      });
      
      // Find and enable line width override (second checkbox after color)
      const overrideCheckboxes = wrapper.findAll('input[type="checkbox"]');
      const lineWidthOverride = overrideCheckboxes[1]; // Second checkbox
      await lineWidthOverride.setValue(true);
      
      // Set invalid width (too large)
      const numberInput = wrapper.find('.number-input');
      await numberInput.setValue(10);
      await numberInput.trigger('blur');
      
      // Check for error message
      expect(wrapper.text()).toContain('Line width must be between 0.5 and 5.0');
    });

    it('should validate line style options', async () => {
      const planeH = world.getProjectionPlaneByLabel('P_H');
      const pos1 = new Vector3(0, 0, 1);
      const pos2 = new Vector3(10, 10, 1);
      const point1 = planeH.addFreePoint2D(pos1, world);
      const point2 = planeH.addFreePoint2D(pos2, world);
      const line = planeH.addLine2DBetweenTwoPoints(point1.id, point2.id, world);
      const lineId = line.id;
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: lineId,
          world
        }
      });
      
      // Line style selector should have valid options
      const styleSelect = wrapper.find('#style-input');
      expect(styleSelect.exists()).toBe(true);
      
      const options = styleSelect.findAll('option');
      expect(options).toHaveLength(3);
      expect(options[0].text()).toBe('Solid');
      expect(options[1].text()).toBe('Dashed');
      expect(options[2].text()).toBe('Dotted');
    });
  });

  describe('Save behavior', () => {
    it('should not save with validation errors', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      // Enable color override
      const overrideCheckboxes = wrapper.findAll('input[type="checkbox"]');
      await overrideCheckboxes[0].setValue(true);
      
      // Set invalid color
      const hexInput = wrapper.find('.hex-input');
      await hexInput.setValue('invalid');
      
      // Try to save
      const saveButton = wrapper.find('.button-primary');
      await saveButton.trigger('click');
      
      // Should not emit save event
      expect(wrapper.emitted('save')).toBeFalsy();
    });

    it('should emit save event with valid changes', async () => {
      const planeH = world.getProjectionPlaneByLabel('P_H');
      const position = new Vector3(0, 0, 1);
      const point = planeH.addFreePoint2D(position, world);
      const pointId = point.id;
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: pointId,
          world
        }
      });
      
      // Enable color override
      const overrideCheckboxes = wrapper.findAll('input[type="checkbox"]');
      await overrideCheckboxes[0].setValue(true);
      
      // Set valid color
      const hexInput = wrapper.find('.hex-input');
      await hexInput.setValue('#FF5733');
      
      // Save
      const saveButton = wrapper.find('.button-primary');
      await saveButton.trigger('click');
      
      // Should emit save event with changes
      expect(wrapper.emitted('save')).toBeTruthy();
      const saveEvent = wrapper.emitted('save')?.[0]?.[0] as any;
      expect(saveEvent.elementId).toStrictEqual(pointId);
      expect(saveEvent.color).toBe('#FF5733');
    });

    it('should only include overridden properties in save event', async () => {
      const planeH = world.getProjectionPlaneByLabel('P_H');
      const position = new Vector3(0, 0, 1);
      const point = planeH.addFreePoint2D(position, world);
      const pointId = point.id;
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: pointId,
          world
        }
      });
      
      // Only enable color override (leave others disabled)
      const overrideCheckboxes = wrapper.findAll('input[type="checkbox"]');
      await overrideCheckboxes[0].setValue(true);
      
      // Set color
      const hexInput = wrapper.find('.hex-input');
      await hexInput.setValue('#FF5733');
      
      // Save
      const saveButton = wrapper.find('.button-primary');
      await saveButton.trigger('click');
      
      // Should only include color in save event
      const saveEvent = wrapper.emitted('save')?.[0]?.[0] as any;
      expect(saveEvent.color).toBe('#FF5733');
      expect(saveEvent.lineWidth).toBeUndefined();
      expect(saveEvent.lineStyle).toBeUndefined();
    });
  });

  describe('Override checkbox behavior', () => {
    it('should disable inputs when override is unchecked', () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      const hexInput = wrapper.find('.hex-input');
      expect(hexInput.attributes('disabled')).toBeDefined();
    });

    it('should enable inputs when override is checked', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      // Enable color override
      const overrideCheckboxes = wrapper.findAll('input[type="checkbox"]');
      await overrideCheckboxes[0].setValue(true);
      
      const hexInput = wrapper.find('.hex-input');
      expect(hexInput.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Reset to default', () => {
    it('should clear all overrides when reset button clicked', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      // Enable color override
      const overrideCheckboxes = wrapper.findAll('input[type="checkbox"]');
      await overrideCheckboxes[0].setValue(true);
      
      // Set color
      const hexInput = wrapper.find('.hex-input');
      await hexInput.setValue('#FF5733');
      
      // Click reset button
      const resetButton = wrapper.find('.reset-button');
      await resetButton.trigger('click');
      
      // Override should be disabled
      expect((overrideCheckboxes[0].element as HTMLInputElement).checked).toBe(false);
      
      // Color should be reset to default
      expect((hexInput.element as HTMLInputElement).value).toBe('#000000');
    });

    it('should clear validation errors when reset', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          elementId: testPointId,
          world
        }
      });
      
      // Enable color override
      const overrideCheckboxes = wrapper.findAll('input[type="checkbox"]');
      await overrideCheckboxes[0].setValue(true);
      
      // Set invalid color
      const hexInput = wrapper.find('.hex-input');
      await hexInput.setValue('invalid');
      await hexInput.trigger('blur');
      
      // Should show error
      expect(wrapper.text()).toContain('Invalid hex color format');
      
      // Click reset
      const resetButton = wrapper.find('.reset-button');
      await resetButton.trigger('click');
      
      // Error should be cleared
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).not.toContain('Invalid hex color format');
    });
  });
});
