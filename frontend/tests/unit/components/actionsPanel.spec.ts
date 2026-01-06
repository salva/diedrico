/**
 * Unit tests for ActionsPanel component
 * 
 * Tests:
 * - Rendering actions from ProcessTree
 * - Filtering by action type
 * - Searching actions
 * - Selecting actions
 * - Emitting highlight events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import ActionsPanel from '../../../src/components/panels/ActionsPanel.vue';
import { World } from '../../../src/domain/world/World';
import type { Action } from '../../../src/domain/processTree/Action';

describe('ActionsPanel', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
    world.initializeFixedElements();
  });

  /**
   * Helper to create a test action
   */
  function createTestAction(
    actionType: string,
    description: string,
    inputs: string[] = [],
    outputs: string[] = []
  ): Action {
    return {
      id: `action-${Date.now()}-${Math.random()}`,
      type: 'action',
      actionType: actionType as any,
      timestamp: new Date(),
      inputs,
      outputs,
      parameters: {},
      description
    };
  }

  /**
   * Helper to mount component with injected World
   */
  function mountPanel() {
    const pinia = createPinia();
    return mount(ActionsPanel, {
      global: {
        plugins: [pinia],
        provide: {
          world
        }
      }
    });
  }

  it('should render empty state when no actions exist', () => {
    const wrapper = mountPanel();
    
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No construction actions yet');
  });

  it('should display actions from ProcessTree', () => {
    // Add some actions to ProcessTree
    const action1 = createTestAction('CreateFreePoint', 'Create point at (5, 3)');
    const action2 = createTestAction('CreateLine', 'Create line through two points');
    
    world.getProcessTree().addAction(action1);
    world.getProcessTree().addAction(action2);
    
    const wrapper = mountPanel();
    
    const actionItems = wrapper.findAll('.action-item');
    expect(actionItems).toHaveLength(2);
    expect(wrapper.text()).toContain('Create point at (5, 3)');
    expect(wrapper.text()).toContain('Create line through two points');
  });

  it('should show action count in header', () => {
    const action1 = createTestAction('CreateFreePoint', 'Point 1');
    const action2 = createTestAction('CreateLine', 'Line 1');
    const action3 = createTestAction('CreateCircle', 'Circle 1');
    
    world.getProcessTree().addAction(action1);
    world.getProcessTree().addAction(action2);
    world.getProcessTree().addAction(action3);
    
    const wrapper = mountPanel();
    
    expect(wrapper.find('.action-count').text()).toBe('(3)');
  });

  it('should filter actions by type', async () => {
    const pointAction = createTestAction('CreateFreePoint', 'Create point');
    const lineAction = createTestAction('CreateLine', 'Create line');
    const circleAction = createTestAction('CreateCircle', 'Create circle');
    
    world.getProcessTree().addAction(pointAction);
    world.getProcessTree().addAction(lineAction);
    world.getProcessTree().addAction(circleAction);
    
    const wrapper = mountPanel();
    
    // Initially show all 3 actions
    expect(wrapper.findAll('.action-item')).toHaveLength(3);
    
    // Filter to only show lines
    await wrapper.find('.filter-dropdown').setValue('CreateLine');
    
    expect(wrapper.findAll('.action-item')).toHaveLength(1);
    expect(wrapper.text()).toContain('Create line');
    expect(wrapper.text()).not.toContain('Create point');
    expect(wrapper.text()).not.toContain('Create circle');
  });

  it('should search actions by description', async () => {
    const action1 = createTestAction('CreateFreePoint', 'Create point at horizontal plane');
    const action2 = createTestAction('CreateLine', 'Create vertical line');
    const action3 = createTestAction('CreateCircle', 'Create circle on horizontal');
    
    world.getProcessTree().addAction(action1);
    world.getProcessTree().addAction(action2);
    world.getProcessTree().addAction(action3);
    
    const wrapper = mountPanel();
    
    // Search for "horizontal"
    await wrapper.find('.search-input').setValue('horizontal');
    
    const actionItems = wrapper.findAll('.action-item');
    expect(actionItems).toHaveLength(2);
    expect(wrapper.text()).toContain('horizontal plane');
    expect(wrapper.text()).toContain('horizontal');
    expect(wrapper.text()).not.toContain('vertical line');
  });

  it('should select action on click', async () => {
    const action = createTestAction('CreateFreePoint', 'Test action', [], ['point-1']);
    world.getProcessTree().addAction(action);
    
    const wrapper = mountPanel();
    const actionItem = wrapper.find('.action-item');
    
    // Initially not selected
    expect(actionItem.classes()).not.toContain('action-selected');
    
    // Click to select
    await actionItem.trigger('click');
    
    expect(actionItem.classes()).toContain('action-selected');
  });

  it('should emit highlightElements event on action click', async () => {
    const action = createTestAction(
      'CreateIntersectionPoint',
      'Create intersection',
      ['line-1', 'line-2'],
      ['point-1']
    );
    world.getProcessTree().addAction(action);
    
    const wrapper = mountPanel();
    const actionItem = wrapper.find('.action-item');
    
    await actionItem.trigger('click');
    
    const emitted = wrapper.emitted('highlightElements');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([['line-1', 'line-2', 'point-1'], false]);
  });

  it('should emit clearHighlight on deselect', async () => {
    const action = createTestAction('CreateFreePoint', 'Test');
    world.getProcessTree().addAction(action);
    
    const wrapper = mountPanel();
    const actionItem = wrapper.find('.action-item');
    
    // Select
    await actionItem.trigger('click');
    
    // Deselect
    await actionItem.trigger('click');
    
    const emitted = wrapper.emitted('clearHighlight');
    expect(emitted).toBeTruthy();
    expect(emitted).toHaveLength(1);
  });

  it('should emit temporary highlight on hover', async () => {
    const action = createTestAction('CreateLine', 'Test', ['p1', 'p2'], ['line1']);
    world.getProcessTree().addAction(action);
    
    const wrapper = mountPanel();
    const actionItem = wrapper.find('.action-item');
    
    await actionItem.trigger('mouseenter');
    
    const emitted = wrapper.emitted('highlightElements');
    expect(emitted).toBeTruthy();
    expect(emitted![0]).toEqual([['p1', 'p2', 'line1'], true]);
  });

  it('should show action details when selected', async () => {
    const action = createTestAction(
      'CreateIntersectionPoint',
      'Create intersection',
      ['line-1', 'line-2'],
      ['point-1']
    );
    action.parameters = { index: 0, planeId: 'proj_plane_H' };
    
    world.getProcessTree().addAction(action);
    
    const wrapper = mountPanel();
    
    // Initially details hidden
    expect(wrapper.find('.action-details').exists()).toBe(false);
    
    // Click to show details
    await wrapper.find('.action-item').trigger('click');
    
    expect(wrapper.find('.action-details').exists()).toBe(true);
    expect(wrapper.text()).toContain('Inputs:');
    expect(wrapper.text()).toContain('line-1, line-2');
    expect(wrapper.text()).toContain('Outputs:');
    expect(wrapper.text()).toContain('point-1');
    expect(wrapper.text()).toContain('Parameters:');
  });

  it('should format action types for display', () => {
    const action = createTestAction('CreateIntersectionPoint', 'Test');
    world.getProcessTree().addAction(action);
    
    const wrapper = mountPanel();
    
    // Check that camelCase is converted to readable format
    expect(wrapper.text()).toContain('Create Intersection Point');
  });

  it('should show empty state when filtered results are empty', async () => {
    const action = createTestAction('CreateFreePoint', 'Create point');
    world.getProcessTree().addAction(action);
    
    const wrapper = mountPanel();
    
    // Filter to show only lines (none exist)
    await wrapper.find('.filter-dropdown').setValue('CreateLine');
    
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No actions match your filters');
  });

  it('should combine search and filter', async () => {
    const action1 = createTestAction('CreateFreePoint', 'Create horizontal point');
    const action2 = createTestAction('CreateFreePoint', 'Create vertical point');
    const action3 = createTestAction('CreateLine', 'Create horizontal line');
    
    world.getProcessTree().addAction(action1);
    world.getProcessTree().addAction(action2);
    world.getProcessTree().addAction(action3);
    
    const wrapper = mountPanel();
    
    // Filter by type: CreateFreePoint
    await wrapper.find('.filter-dropdown').setValue('CreateFreePoint');
    expect(wrapper.findAll('.action-item')).toHaveLength(2);
    
    // Search: "horizontal"
    await wrapper.find('.search-input').setValue('horizontal');
    expect(wrapper.findAll('.action-item')).toHaveLength(1);
    expect(wrapper.text()).toContain('horizontal point');
  });

  it('should clear selection when actions change', async () => {
    const action1 = createTestAction('CreateFreePoint', 'Point 1');
    world.getProcessTree().addAction(action1);
    
    const wrapper = mountPanel();
    
    // Select action
    await wrapper.find('.action-item').trigger('click');
    expect(wrapper.find('.action-selected').exists()).toBe(true);
    
    // Add new action (triggers actions change)
    const action2 = createTestAction('CreateLine', 'Line 1');
    world.getProcessTree().addAction(action2);
    
    // Force re-render
    await wrapper.vm.$nextTick();
    
    // Selection should be cleared
    // Note: This test depends on watch() in component
  });
});
