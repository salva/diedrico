<template>
  <div class="project-name-display">
    <div
      v-if="!isEditing"
      class="project-name"
      :class="{ 'editable': !isRenaming }"
      @dblclick="startEditing"
      :title="isRenaming ? '' : 'Double-click to rename (or press Ctrl+R)'"
    >
      {{ displayName }}
      <span v-if="isRenaming" class="save-indicator">💾</span>
    </div>
    
    <div v-else class="edit-mode">
      <input
        ref="nameInput"
        v-model="editedName"
        type="text"
        class="name-input"
        @keydown.enter="saveEdit"
        @keydown.escape="cancelEdit"
        :maxlength="100"
      />
      <button
        class="save-button"
        @mousedown.prevent="saveEdit"
        :disabled="!isValidName"
        title="Save (Enter)"
      >
        ✓
      </button>
      <button
        class="cancel-button"
        @mousedown.prevent="cancelEdit"
        title="Cancel (Escape)"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';

/**
 * ProjectNameDisplay.vue - Editable project name display component
 * 
 * Displays the current project name in the app header with in-place editing.
 * - Double-click to edit
 * - Enter to save, Escape to cancel
 * - Validates name (non-empty, reasonable length, no special characters)
 * - Shows save indicator while renaming
 * 
 * Reference: specs/001-dihedral-learning-mvp/spec.md - Project Name Display and Editing
 */

interface Props {
  projectName: string | null;
  isRenaming?: boolean;
}

interface Emits {
  (e: 'rename', newName: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  isRenaming: false
});

const emit = defineEmits<Emits>();

const isEditing = ref(false);
const editedName = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

// Display name (default to "Untitled Project" if no name)
const displayName = computed(() => {
  return props.projectName || 'Untitled Project';
});

// Validation: non-empty, no file system reserved characters
const isValidName = computed(() => {
  if (!editedName.value.trim()) {
    return false;
  }
  
  // File system reserved characters: / \ : * ? " < > |
  const invalidChars = /[\/\\:*?"<>|]/;
  return !invalidChars.test(editedName.value);
});

// Start editing mode
function startEditing() {
  if (props.isRenaming) {
    return; // Don't allow editing while a rename is in progress
  }
  
  isEditing.value = true;
  editedName.value = displayName.value;
  
  // Focus and select the input on next tick
  nextTick(() => {
    if (nameInput.value) {
      nameInput.value.focus();
      nameInput.value.select();
    }
  });
}

// Save the edited name
function saveEdit() {
  if (!isValidName.value) {
    return;
  }
  
  const trimmedName = editedName.value.trim();
  
  // Only emit if the name actually changed
  if (trimmedName !== props.projectName) {
    emit('rename', trimmedName);
  }
  
  isEditing.value = false;
}

// Cancel editing and revert to original name
function cancelEdit() {
  isEditing.value = false;
  editedName.value = '';
}

// Watch for external requests to start editing (e.g., from Ctrl+R shortcut)
watch(() => props.isRenaming, (renaming) => {
  if (renaming && isEditing.value) {
    // If rename fails, stay in edit mode
    // If rename succeeds, the parent will update projectName and we'll exit edit mode
  }
});

// Expose method to start editing (for parent component to trigger via Ctrl+R)
defineExpose({
  startEditing
});
</script>

<style scoped>
.project-name-display {
  display: flex;
  align-items: center;
  min-width: 200px;
}

.project-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ecf0f1;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-name.editable {
  cursor: pointer;
  border-bottom: 1px dashed rgba(236, 240, 241, 0.4);
}

.project-name.editable:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.save-indicator {
  font-size: 0.9rem;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.edit-mode {
  display: flex;
  align-items: center;
  gap: 6px;
}

.name-input {
  flex: 1;
  min-width: 200px;
  padding: 6px 10px;
  font-size: 1rem;
  font-weight: 600;
  border: 2px solid #4A90E2;
  border-radius: 4px;
  background-color: white;
  color: #333;
  outline: none;
}

.name-input:focus {
  border-color: #357ABD;
}

.save-button,
.cancel-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button {
  background-color: #4CAF50;
  color: white;
}

.save-button:hover:not(:disabled) {
  background-color: #45a049;
}

.save-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.cancel-button {
  background-color: #f44336;
  color: white;
}

.cancel-button:hover {
  background-color: #da190b;
}
</style>
