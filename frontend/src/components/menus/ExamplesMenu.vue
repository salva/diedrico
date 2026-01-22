<template>
  <div class="examples-menu">
    <button
      class="examples-button"
      @click="toggleMenu"
      :class="{ active: menuOpen }"
      title="Quick Example Setups (E)"
      aria-label="Examples Menu"
    >
      <span class="button-icon">📋</span>
      <span class="button-label">Examples</span>
    </button>

    <div v-if="menuOpen" class="examples-dropdown">
      <div class="dropdown-header">Quick Example Setups</div>
      <button
        class="example-item"
        @click="addExample('projection-plane-setup')"
        title="Add T1, T2, and T2' lines for testing projection plane creation"
      >
        <span class="item-icon">✈️</span>
        <div class="item-content">
          <div class="item-title">Projection Plane Setup</div>
          <div class="item-description">T1, T2, T2' traces for auxiliary plane</div>
        </div>
      </button>

      <button
        class="example-item"
        @click="addExample('basic-3d-point-setup')"
        title="Add two projections for testing 3D point creation"
      >
        <span class="item-icon">📍</span>
        <div class="item-content">
          <div class="item-title">3D Point Setup</div>
          <div class="item-description">Two projections on P_H and P_V</div>
        </div>
      </button>
    </div>

    <!-- Backdrop to close menu when clicking outside -->
    <div
      v-if="menuOpen"
      class="menu-backdrop"
      @click="closeMenu"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted } from 'vue';
import { Command } from '@/commands/Command';
import { AddExampleSetupOp, type ExampleSetupType } from '@/commands/operations/debug/AddExampleSetupOp';
import type { CommandStack } from '@/commands/CommandStack';
import type { World } from '@/domain/world/World';

const world = inject<World>('world')!;
const commandStack = inject<CommandStack>('commandStack')!;

const menuOpen = ref(false);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}

function addExample(setupType: ExampleSetupType) {
  try {
    const cmd = new Command(`Add ${setupType} example`, world);
    cmd.addAndExecute(new AddExampleSetupOp(setupType));
    cmd.commit();
    commandStack.push(cmd);
    
    closeMenu();
  } catch (error) {
    console.error('Failed to add example setup:', error);
    alert(`Failed to add example: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Keyboard shortcut: E
function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'e' || event.key === 'E') {
    // Don't trigger if user is typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    event.preventDefault();
    toggleMenu();
  } else if (event.key === 'Escape' && menuOpen.value) {
    closeMenu();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyPress);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress);
});
</script>

<style scoped>
.examples-menu {
  position: relative;
  display: inline-block;
}

.examples-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.examples-button:hover {
  background: #e0e0e0;
  border-color: #999;
}

.examples-button.active {
  background: #d0d0d0;
  border-color: #666;
}

.button-icon {
  font-size: 16px;
}

.button-label {
  color: #333;
}

.examples-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 300px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  padding: 12px 16px;
  background: #f8f8f8;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  font-size: 13px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.example-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: white;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.example-item:last-child {
  border-bottom: none;
}

.example-item:hover {
  background: #f8f8f8;
}

.item-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.item-content {
  flex: 1;
}

.item-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.item-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}
</style>
