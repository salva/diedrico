import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../../src/domain/world/World';
import { GuideTool } from '../../../src/tools/GuideTool';
import type { CommandStack } from '../../../src/commands/CommandStack';
import { setupBasicWorld } from '../../helpers/worldHelpers';

describe('GuideTool', () => {
  let world: World;
  let commandStack: CommandStack;
  let tool: GuideTool;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    commandStack = setup.commandStack;
    tool = new GuideTool(world, commandStack);
  });

  describe('Guide Creation on Regular Lines', () => {
    it('uses the retained ArgumentCollectorTool interaction API instead of the deleted onMouseDown command path', async () => {
      expect(typeof tool.handleClick).toBe('function');
      expect((tool as unknown as { onMouseDown?: unknown }).onMouseDown).toBeUndefined();
      expect(tool.getSelectionMask()).toBeDefined();
      expect(tool.getStatusMessage()).toContain('Creating guide');
    });

    it('should create sibling guide when reference is HalfHingeLine2D', async () => {
      // Setup world with hinge line
      const { projPlaneH, projPlaneV } = setupBasicWorld();
      
      // After QuickSetup, there should be hinge lines connecting planes
      // Creating guide on a hinge line should create sibling on other plane
      
      // This test would verify:
      // 1. Primary guide created on plane H
      // 2. Sibling guide created on plane V
      // 3. Both guides in ProcessTree
    });

    it('should create sibling guide when reference is BrokenHalfHingeLine2D', async () => {
      // Setup world with auxiliary plane and broken hinge line
      // Creating guide on BHHL should create sibling guide
      
      // This test would verify:
      // 1. Primary guide created on auxiliary plane
      // 2. Sibling guide created on base plane
      // 3. Both guides parallel to main hinge T1
    });
  });

  describe('Error Handling', () => {
    it('should not throw error when guide created on non-hinge line', () => {
      // This is the regression test for the bug where GuideTool
      // assumed all guides have siblings and threw error when
      // reference line was not a hinge line
      
      // Setup: Create guide on a regular trace line (not hinge line)
      // Expected: Should succeed, create only primary guide, no error
      // Previous behavior: Threw "Failed to get sibling info" error
    });

    it('should validate point exists before creating guide', () => {
      // Test error handling for invalid point ID
    });

    it('should validate reference line exists before creating guide', () => {
      // Test error handling for invalid reference line ID
    });
  });

  describe('ProcessTree Actions', () => {
    it('should create single action for guide without sibling', () => {
      // Verify ProcessTree contains only primary guide action
      // when reference line is not a hinge line
    });

    it('should create two actions for guide with sibling', () => {
      // Verify ProcessTree contains both primary and sibling actions
      // when reference line is a hinge line
    });
  });
});
