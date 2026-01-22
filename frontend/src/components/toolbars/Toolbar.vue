<template>
  <div class="toolbar">
    <!-- File operation buttons -->
    <div class="file-controls">
      <button
        class="file-button"
        @click="handleNew"
        title="New Project (Ctrl+N)"
        aria-label="New Project"
      >
        <NewFileIcon class="button-icon" />
      </button>
      
      <button
        class="file-button"
        @click="handleOpen"
        title="Open Project (Ctrl+O)"
        aria-label="Open Project"
      >
        <OpenFileIcon class="button-icon" />
      </button>
    </div>
    
    <div class="toolbar-separator"></div>
    
    <!-- Undo/Redo buttons -->
    <div class="history-controls">
      <button
        class="history-button"
        :disabled="!canUndo"
        @click="handleUndo"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <UndoIcon class="button-icon" />
      </button>
      
      <button
        class="history-button"
        :disabled="!canRedo"
        @click="handleRedo"
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        <RedoIcon class="button-icon" />
      </button>
    </div>
    
    <div class="toolbar-separator"></div>

    <!-- Active Plane selector -->
    <PlaneSelector />
    
    <div class="toolbar-separator"></div>
    
    <!-- Navigation controls -->
    <div class="navigation-controls">
      <button
        class="nav-button"
        @click="handleToggleGrid"
        :class="{ active: gridVisible }"
        title="Toggle Grid (G)"
        aria-label="Toggle Grid"
      >
        <GridIcon class="button-icon" />
      </button>

      <button
        class="nav-button"
        @click="handleFitToView"
        title="Fit to View (Ctrl+0)"
        aria-label="Fit to View"
      >
        <ZoomFitIcon class="button-icon" />
      </button>
    </div>
    
    <div class="toolbar-separator"></div>
    
    <!-- Tool buttons -->
    <!-- Phase 54.5: Selection Tool (standalone, not in family) -->
    <button
      class="tool-button"
      :class="{ active: toolStore.isToolActive('select') }"
      @click="selectTool('select')"
      title="Selection Tool - Pick, move, and edit objects (Esc)"
      aria-label="Selection Tool"
    >
      <SelectionToolIcon class="button-icon" />
    </button>
    
    <!-- Phase 67: Tool Family Buttons with Dropdowns -->
    <ToolFamilyButton
      v-for="family in TOOL_FAMILIES"
      :key="family.id"
      :family="family"
    />

    <!-- T406: Login Status Widget at far right -->
    <LoginStatusWidget
      @sign-in="handleSignIn"
      @sign-out="handleSignOut"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, computed, onMounted, onUnmounted } from 'vue';
import { useToolStore } from '@/stores/toolStore';
import { useViewStore } from '@/stores/viewStore';
import { CommandStack } from '@/commands/CommandStack';
import { Command } from '@/commands/Command';
import { Vector3 } from 'three';
import type { World } from '@/domain/world/World';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp } from '@/commands/operations/world/AddLineOp';
import LoginStatusWidget from '@/components/LoginStatusWidget.vue';
import PlaneSelector from '@/components/toolbars/PlaneSelector.vue';
import ToolFamilyButton from '@/components/toolbars/ToolFamilyButton.vue';
import { TOOL_FAMILIES } from '@/config/toolFamilies';
import SelectionToolIcon from '@/components/icons/toolbar/SelectionToolIcon.vue';
import NewFileIcon from '@/components/icons/toolbar/NewFileIcon.vue';
import OpenFileIcon from '@/components/icons/toolbar/OpenFileIcon.vue';
import UndoIcon from '@/components/icons/toolbar/UndoIcon.vue';
import RedoIcon from '@/components/icons/toolbar/RedoIcon.vue';
import GridIcon from '@/components/icons/toolbar/GridIcon.vue';
import ZoomFitIcon from '@/components/icons/toolbar/ZoomFitIcon.vue';

/**
 * Toolbar.vue - Tool selection toolbar
 * 
 * Provides buttons for selecting geometric construction tools (Point, Line, etc.),
 * file operations (New, Open), and history controls (Undo/Redo).
 * Manages active tool state via tool store.
 * 
 * Reference: specs/001-dihedral-learning-mvp/ui-spec.md - Toolbar Component
 */

interface Emits {
  (e: 'new-project'): void;
  (e: 'open-project'): void;
  (e: 'fit-to-view'): void;
  (e: 'sign-in'): void;
  (e: 'sign-out'): void;
}

const emit = defineEmits<Emits>();

const toolStore = useToolStore();
const viewStore = useViewStore();

// Inject command stack for undo/redo
const commandStack = inject<CommandStack>('commandStack')!;
if (!commandStack) {
  throw new Error('CommandStack not provided');
}

// Inject world for example setups
const world = inject<World>('world')!;
if (!world) {
  throw new Error('World not provided');
}

// Computed properties for undo/redo availability
const canUndo = computed(() => commandStack.canUndo());
const canRedo = computed(() => commandStack.canRedo());

// Grid visibility
const gridVisible = computed(() => viewStore.gridVisible.value);

/**
 * Select a tool
 */
function selectTool(tool: 'select' | 'point' | 'line' | 'circle' | 'segment' | 'guide' | 'intersection') {
  console.log('Selecting tool:', tool);
  toolStore.setTool(tool);
  console.log('Tool set. Current tool:', toolStore.currentTool);
}

/**
 * Handle global keyboard shortcuts
 * Phase 54.5: Esc activates Selection Tool
 * Phase 67: Letter shortcuts activate specific sub-tools and update last-used
 * Alt+E: Add projection plane example setup (for testing)
 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    selectTool('select');
    event.preventDefault();
    return;
  }
  
  // Alt+E: Add projection plane example setup
  if (event.altKey && (event.key === 'e' || event.key === 'E')) {
    addProjectionPlaneSetup();
    event.preventDefault();
    return;
  }
  
  // Handle letter shortcuts for tools
  const key = event.key.toUpperCase();
  
  // Find tool with matching shortcut across all families
  for (const family of TOOL_FAMILIES) {
    for (const tool of family.tools) {
      if (tool.shortcut === key) {
        // Activate tool directly and update last-used for its family
        toolStore.selectSubTool(family.id, tool.id);
        event.preventDefault();
        return;
      }
    }
  }
}

/**
 * Add projection plane example setup (Alt+E)
 * Creates T1, T2, and T2' lines for testing auxiliary projection plane creation
 */
function addProjectionPlaneSetup() {
  try {
    const planes = world.getAllProjectionPlanes();
    const P_H = planes.find((p) => p.name === 'P_H');
    const P_V = planes.find((p) => p.name === 'P_V');

    if (!P_H || !P_V) {
      console.error('Standard projection planes P_H and P_V not found');
      return;
    }

    const cmd = new Command('Add projection plane example setup', world);

    // T1 on P_H (horizontal trace)
    const t1_p1 = cmd.addAndExecute(new AddFreePoint2DOp(P_H.id, new Vector3(150, 0, 1)));
    const t1_p2 = cmd.addAndExecute(new AddFreePoint2DOp(P_H.id, new Vector3(450, 0, 1)));
    const t1 = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
      P_H.id, 
      t1_p1.outputs.pointId as string, 
      t1_p2.outputs.pointId as string
    ));
    const t1Line = world.getLine2D(t1.outputs.lineId as string);
    if (t1Line) t1Line.label = 'T1_H';

    // T2 on P_V (diagonal trace)
    const t2_p1 = cmd.addAndExecute(new AddFreePoint2DOp(P_V.id, new Vector3(200, 0, 1)));
    const t2_p2 = cmd.addAndExecute(new AddFreePoint2DOp(P_V.id, new Vector3(400, 150, 1)));
    const t2 = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
      P_V.id,
      t2_p1.outputs.pointId as string,
      t2_p2.outputs.pointId as string
    ));
    const t2Line = world.getLine2D(t2.outputs.lineId as string);
    if (t2Line) t2Line.label = 'T2_V';

    // T2' on P_H (position line)
    const t2p_p1 = cmd.addAndExecute(new AddFreePoint2DOp(P_H.id, new Vector3(200, 80, 1)));
    const t2p_p2 = cmd.addAndExecute(new AddFreePoint2DOp(P_H.id, new Vector3(400, 120, 1)));
    const t2p = cmd.addAndExecute(new AddLine2DByTwoPointsOp(
      P_H.id,
      t2p_p1.outputs.pointId as string,
      t2p_p2.outputs.pointId as string
    ));
    const t2pLine = world.getLine2D(t2p.outputs.lineId as string);
    if (t2pLine) t2pLine.label = 'T2\'_H';

    cmd.commit();
    commandStack.push(cmd);
    
    console.log('Added projection plane example setup (T1_H, T2_V, T2\'_H)');
  } catch (error) {
    console.error('Failed to add projection plane setup:', error);
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

/**
 * Handle undo action
 */
function handleUndo() {
  if (commandStack.canUndo()) {
    commandStack.undo();
  }
}

/**
 * Handle redo action
 */
function handleRedo() {
  if (commandStack.canRedo()) {
    commandStack.redo();
  }
}

/**
 * Handle new project button
 */
function handleNew() {
  emit('new-project');
}

/**
 * Handle open project button
 */
function handleOpen() {
  emit('open-project');
}

/**
 * Toggle grid visibility (T276)
 */
function handleToggleGrid() {
  viewStore.toggleGrid();
}

/**
 * Fit viewport to show all elements (T274)
 */
function handleFitToView() {
  emit('fit-to-view');
}

/**
 * T406: Handle sign in request
 */
function handleSignIn() {
  emit('sign-in');
}

/**
 * T407: Handle sign out request
 */
function handleSignOut() {
  emit('sign-out');
}
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  align-items: center;
}

.file-controls {
  display: flex;
  gap: 4px;
}

.file-button {
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.file-button .button-icon {
  width: 24px;
  height: 24px;
}

.history-controls {
  display: flex;
  gap: 4px;
}

.toolbar-separator {
  width: 1px;
  height: 32px;
  background-color: #ccc;
  margin: 0 4px;
}

.history-button {
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-button:hover:not(:disabled) {
  background-color: #e8e8e8;
  border-color: #999;
}

.history-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.history-button .button-icon {
  width: 24px;
  height: 24px;
}

.navigation-controls {
  display: flex;
  gap: 4px;
}

.nav-button {
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.nav-button.active {
  background-color: #4A90E2;
  color: #fff;
  border-color: #4A90E2;
}

.nav-button .button-icon {
  width: 24px;
  height: 24px;
}

.tool-button {
  padding: 0;
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.tool-button.active {
  background-color: #4A90E2;
  color: #fff;
  border-color: #4A90E2;
}

.tool-button .button-icon {
  width: 24px;
  height: 24px;
}
</style>
