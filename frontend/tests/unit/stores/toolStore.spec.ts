/**
 * Tests for toolStore.ts - Tool selection state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useToolStore } from '@/stores/toolStore';

describe('toolStore', () => {
  let toolStore: ReturnType<typeof useToolStore>;

  beforeEach(() => {
    toolStore = useToolStore();
    // Reset to default state
    toolStore.setTool('select');
  });

  describe('Tool Selection', () => {
    it('should default to select tool', () => {
      expect(toolStore.currentTool.value).toBe('select');
      expect(toolStore.isToolActive('select')).toBe(true);
    });

    it('should activate point tool', () => {
      toolStore.setTool('point');
      expect(toolStore.currentTool.value).toBe('point');
      expect(toolStore.isToolActive('point')).toBe(true);
      expect(toolStore.isToolActive('select')).toBe(false);
    });

    it('should activate line tool', () => {
      toolStore.setTool('line');
      expect(toolStore.currentTool.value).toBe('line');
      expect(toolStore.isToolActive('line')).toBe(true);
    });

    it('should activate circle tool', () => {
      toolStore.setTool('circle');
      expect(toolStore.currentTool.value).toBe('circle');
      expect(toolStore.isToolActive('circle')).toBe(true);
    });

    it('should activate segment tool', () => {
      toolStore.setTool('segment');
      expect(toolStore.currentTool.value).toBe('segment');
      expect(toolStore.isToolActive('segment')).toBe(true);
    });

    it('should switch between tools', () => {
      toolStore.setTool('point');
      expect(toolStore.isToolActive('point')).toBe(true);
      
      toolStore.setTool('line');
      expect(toolStore.isToolActive('line')).toBe(true);
      expect(toolStore.isToolActive('point')).toBe(false);
      
      toolStore.setTool('select');
      expect(toolStore.isToolActive('select')).toBe(true);
      expect(toolStore.isToolActive('line')).toBe(false);
    });
  });

  describe('Tool State Queries', () => {
    it('should return false for non-active tools', () => {
      toolStore.setTool('point');
      expect(toolStore.isToolActive('line')).toBe(false);
      expect(toolStore.isToolActive('circle')).toBe(false);
      expect(toolStore.isToolActive('segment')).toBe(false);
      expect(toolStore.isToolActive('select')).toBe(false);
    });

    it('should return true only for active tool', () => {
      toolStore.setTool('circle');
      expect(toolStore.isToolActive('circle')).toBe(true);
      expect(toolStore.isToolActive('point')).toBe(false);
      expect(toolStore.isToolActive('line')).toBe(false);
    });
  });

  describe('Reactive Updates', () => {
    it('should update currentTool computed property when tool changes', () => {
      expect(toolStore.currentTool.value).toBe('select');
      
      toolStore.setTool('point');
      expect(toolStore.currentTool.value).toBe('point');
      
      toolStore.setTool('line');
      expect(toolStore.currentTool.value).toBe('line');
    });
  });

  describe('Tool Types', () => {
    it('should support all defined tool types', () => {
      const tools: Array<'select' | 'point' | 'line' | 'circle' | 'segment'> = [
        'select',
        'point',
        'line',
        'circle',
        'segment'
      ];

      tools.forEach(tool => {
        toolStore.setTool(tool);
        expect(toolStore.currentTool.value).toBe(tool);
        expect(toolStore.isToolActive(tool)).toBe(true);
      });
    });
  });

  describe('Tool Step Message', () => {
    it('should start with empty step message', () => {
      expect(toolStore.currentToolStepMessage.value).toBe('');
    });

    it('should set and get step message', () => {
      toolStore.setToolStepMessage('Creating line: pick point1, point2');
      expect(toolStore.currentToolStepMessage.value).toBe('Creating line: pick point1, point2');
    });

    it('should clear step message when tool changes', () => {
      toolStore.setToolStepMessage('Creating line: pick point1, point2');
      toolStore.setTool('point');
      expect(toolStore.currentToolStepMessage.value).toBe('');
    });

    it('should update step message as arguments are collected', () => {
      toolStore.setToolStepMessage('Creating line: pick point1, point2');
      expect(toolStore.currentToolStepMessage.value).toBe('Creating line: pick point1, point2');
      
      toolStore.setToolStepMessage('Creating line: point1 selected, pick point2');
      expect(toolStore.currentToolStepMessage.value).toBe('Creating line: point1 selected, pick point2');
    });

    it('should allow clearing step message explicitly', () => {
      toolStore.setToolStepMessage('Some message');
      toolStore.setToolStepMessage('');
      expect(toolStore.currentToolStepMessage.value).toBe('');
    });
  });
});
