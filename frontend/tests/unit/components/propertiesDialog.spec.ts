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
import type { PropertiesDialogViewModel } from '@/application/appShell/RuntimeViewPorts';

describe('PropertiesDialog', () => {
  let testPointId: string;
  let pointViewModel: PropertiesDialogViewModel;
  let lineViewModel: PropertiesDialogViewModel;
  
  beforeEach(() => {
    testPointId = 'proj_plane_H/point2d_1';
    pointViewModel = {
      elementId: testPointId,
      elementLabel: testPointId,
      elementType: '2D Point',
      planeId: 'proj_plane_H',
      coordinates: '(0.00, 0.00)',
      dependencies: [],
      createdBy: 'Action in ProcessTree',
      style: { color: '#000000', lineWidth: 1, lineStyle: 'solid', visible: true },
    };
    lineViewModel = {
      ...pointViewModel,
      elementId: 'proj_plane_H/line2d_1',
      elementLabel: 'proj_plane_H/line2d_1',
      elementType: '2D Line',
      dependencies: ['proj_plane_H/point2d_1', 'proj_plane_H/point2d_2'],
    };
  });

  describe('Dialog visibility', () => {
    it('should not render when isOpen is false', () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: false,
          viewModel: null
        }
      });
      
      expect(wrapper.find('.dialog-overlay').exists()).toBe(false);
    });

    it('should render when isOpen is true', () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel
        }
      });
      
      expect(wrapper.find('.dialog-overlay').exists()).toBe(true);
      expect(wrapper.find('.properties-dialog').exists()).toBe(true);
    });

    it('should emit close event when close button clicked', async () => {
      const onClose = vi.fn();
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel,
          onClose
        }
      });
      
      await wrapper.find('.close-button').trigger('click');
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should emit close event when overlay clicked', async () => {
      const onClose = vi.fn();
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel,
          onClose
        }
      });
      
      await wrapper.find('.dialog-overlay').trigger('click');
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should emit close event when cancel button clicked', async () => {
      const onClose = vi.fn();
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel,
          onClose
        }
      });
      
      await wrapper.find('.button-secondary').trigger('click');
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('Element type detection', () => {
    it('should display "2D Point" for point elements', () => {
      // Add a point to world
      const pointId = testPointId;
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel
        }
      });
      
      expect(wrapper.text()).toContain('2D Point');
    });

    it('should display plane ID for 2D elements', () => {
      const pointId = testPointId;
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel
        }
      });
      
      expect(wrapper.text()).toContain('proj_plane_H');
    });
  });

  describe('Style input validation', () => {
    it('should validate hex color format', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel
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
          viewModel: pointViewModel
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
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: lineViewModel
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
      
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: lineViewModel
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
          viewModel: pointViewModel
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
      const pointId = testPointId;
      
      const onSave = vi.fn();
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel,
          onSave
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
      expect(onSave).toHaveBeenCalledOnce();
      const saveEvent = onSave.mock.calls[0][0];
      expect(saveEvent.elementId).toStrictEqual(pointId);
      expect(saveEvent.color).toBe('#FF5733');
    });

    it('should only include overridden properties in save event', async () => {
      const pointId = testPointId;
      
      const onSave = vi.fn();
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel,
          onSave
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
      expect(onSave).toHaveBeenCalledOnce();
      const saveEvent = onSave.mock.calls[0][0];
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
          viewModel: pointViewModel
        }
      });
      
      const hexInput = wrapper.find('.hex-input');
      expect(hexInput.attributes('disabled')).toBeDefined();
    });

    it('should enable inputs when override is checked', async () => {
      const wrapper = mount(PropertiesDialog, {
        props: {
          isOpen: true,
          viewModel: pointViewModel
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
          viewModel: pointViewModel
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
          viewModel: pointViewModel
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
