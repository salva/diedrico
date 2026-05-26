<template>
  <div v-if="isOpen" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-content" @click.stop>
      <h2 class="dialog-title">New Project</h2>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="project-name">Project Name</label>
          <input
            id="project-name"
            v-model="projectName"
            type="text"
            placeholder="Enter project name..."
            class="form-input"
            autofocus
            required
          />
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" @click="handleCancel">
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="!projectName.trim() || isCreating"
          >
            {{ isCreating ? 'Creating...' : 'Create Project' }}
          </button>
        </div>
      </form>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  created: [projectName: string];
}>();

const projectName = ref('');
const isCreating = ref(false);
const error = ref('');

// Reset form when dialog opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    projectName.value = '';
    error.value = '';
    isCreating.value = false;
  }
});

async function handleSubmit() {
  if (!projectName.value.trim() || isCreating.value) return;

  isCreating.value = true;
  error.value = '';

  try {
    emit('created', projectName.value.trim());
    emit('close');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to create project';
    isCreating.value = false;
  }
}

function handleCancel() {
  emit('close');
}

function handleOverlayClick() {
  if (!isCreating.value) {
    emit('close');
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dialog-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background-color: #e5e7eb;
}

.btn-primary {
  background-color: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  color: #dc2626;
  font-size: 14px;
}
</style>
