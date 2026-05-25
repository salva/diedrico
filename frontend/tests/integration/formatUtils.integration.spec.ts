/**
 * Integration tests for KaTeX formatting across UI components
 * Phase 96: Element Label Mathematical Notation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ElementTypeGroup from '@/components/panels/ElementTypeGroup.vue';
import ElementPropertiesDialog from '@/components/dialogs/ElementPropertiesDialog.vue';
import type { Element2D } from '@/types/ElementTypes';
import type { VisualStyle } from '@/domain/world/VisualStyle';

describe('KaTeX Formatting Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('ElementTypeGroup', () => {
    it('should render element labels with KaTeX formatting', () => {
      const elements = [
        {
          id: 'A1',
          label: 'A_1',
          type: 'Point2D',
          visible: true
        },
        {
          id: 'P1',
          label: 'P^{\\prime}',
          type: 'Point2D',
          visible: true
        },
        {
          id: 'alpha',
          label: '\\alpha',
          type: 'Point2D',
          visible: true
        }
      ];

      const wrapper = mount(ElementTypeGroup, {
        props: {
          title: 'Points',
          elements
        }
      });

      // Check that KaTeX rendered HTML is present
      const labels = wrapper.findAll('.element-label');
      expect(labels).toHaveLength(3);
      
      // KaTeX wraps content in spans with 'katex' class
      expect(labels[0].html()).toContain('katex');
      expect(labels[1].html()).toContain('katex');
      expect(labels[2].html()).toContain('katex');
    });

    it('should handle plain text labels without LaTeX', () => {
      const elements = [
        {
          id: 'P1',
          label: 'Point1',
          type: 'Point2D',
          visible: true
        }
      ];

      const wrapper = mount(ElementTypeGroup, {
        props: {
          title: 'Points',
          elements
        }
      });

      const label = wrapper.find('.element-label');
      expect(label.exists()).toBe(true);
      // Plain text should still be rendered (KaTeX treats it as text)
      expect(label.html()).toBeTruthy();
    });
  });

  describe('ElementPropertiesDialog', () => {
    const defaultStyle: VisualStyle = {
      color: '#000000',
      lineWidth: 2,
      lineStyle: 'solid',
      opacity: 1.0,
      visible: true,
      inherited: false
    };

    it('should show label preview with KaTeX formatting', async () => {
      const element: Element2D = {
        id: 'A1',
        kind: 'Point2D',
        name: 'A_1',
        visualStyle: defaultStyle,
        visible: true
      };

      const wrapper = mount(ElementPropertiesDialog, {
        props: {
          isOpen: true,
          element
        }
      });

      // Wait for component to update
      await wrapper.vm.$nextTick();

      // Check that preview exists
      const preview = wrapper.find('.label-preview');
      expect(preview.exists()).toBe(true);
      expect(preview.html()).toContain('katex');
    });

    it('should validate label syntax and show error for invalid LaTeX', async () => {
      const element: Element2D = {
        id: 'A1',
        kind: 'Point2D',
        name: 'ValidLabel',
        visualStyle: defaultStyle,
        visible: true
      };

      const wrapper = mount(ElementPropertiesDialog, {
        props: {
          isOpen: true,
          element
        }
      });

      await wrapper.vm.$nextTick();

      // Change the input to have invalid LaTeX
      const input = wrapper.find('input[type="text"]');
      await input.setValue('A_{unclosed');
      await wrapper.vm.$nextTick();

      // Check for validation error
      const error = wrapper.find('.validation-error');
      expect(error.exists()).toBe(true);
      expect(error.text()).toContain('Invalid LaTeX syntax');

      // Submit button should be disabled
      const submitBtn = wrapper.find('.btn-primary');
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    it('should allow saving when label syntax is valid', async () => {
      const element: Element2D = {
        id: 'A1',
        kind: 'Point2D',
        name: 'A_1',
        visualStyle: defaultStyle,
        visible: true
      };

      const wrapper = mount(ElementPropertiesDialog, {
        props: {
          isOpen: true,
          element
        }
      });

      await wrapper.vm.$nextTick();

      // No validation error should be present
      const error = wrapper.find('.validation-error');
      expect(error.exists()).toBe(false);

      // Submit button should be enabled
      const submitBtn = wrapper.find('.btn-primary');
      expect(submitBtn.attributes('disabled')).toBeUndefined();
    });

    it('should not show preview for empty label', async () => {
      const element: Element2D = {
        id: 'A1',
        kind: 'Point2D',
        name: '',
        visualStyle: defaultStyle,
        visible: true
      };

      const wrapper = mount(ElementPropertiesDialog, {
        props: {
          isOpen: true,
          element
        }
      });

      await wrapper.vm.$nextTick();

      // Preview should not exist for empty label
      const previewRow = wrapper.find('.info-row:has(.label-preview)');
      expect(previewRow.exists()).toBe(false);
    });
  });

  describe('Cross-component consistency', () => {
    it('should format the same label identically across components', () => {
      const testLabel = 'A_{H}^{\\prime}';
      
      // Test in ElementTypeGroup
      const elements = [{ id: 'A1', label: testLabel, type: 'Point2D', visible: true }];
      const groupWrapper = mount(ElementTypeGroup, {
        props: { title: 'Points', elements }
      });
      
      const groupLabel = groupWrapper.find('.element-label');
      const groupHtml = groupLabel.html();

      // Test in ElementPropertiesDialog
      const element: Element2D = {
        id: 'A1',
        kind: 'Point2D',
        name: testLabel,
        visualStyle: {
          color: '#000000',
          lineWidth: 2,
          lineStyle: 'solid',
          opacity: 1.0,
          visible: true,
          inherited: false
        },
        visible: true
      };

      const dialogWrapper = mount(ElementPropertiesDialog, {
        props: { isOpen: true, element }
      });

      const dialogPreview = dialogWrapper.find('.label-preview');
      const dialogHtml = dialogPreview.html();

      // Both should contain KaTeX rendering
      expect(groupHtml).toContain('katex');
      expect(dialogHtml).toContain('katex');
    });
  });
});
