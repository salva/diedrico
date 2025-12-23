<template>
  <div v-if="isOpen" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-content" @click.stop>
      <h2 class="dialog-title">Open Project</h2>
      
      <div v-if="isLoading" class="loading-state">
        Loading projects...
      </div>

      <div v-else-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-else-if="projects.length === 0" class="empty-state">
        No projects found. Create a new project to get started.
      </div>

      <div v-else class="projects-list">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-item"
          :class="{ selected: selectedProjectId === project.id }"
          @click="selectProject(project.id)"
          @dblclick="handleOpen"
        >
          <div class="project-info">
            <div class="project-name">{{ project.name }}</div>
            <div class="project-meta">
              <span>Modified: {{ formatDate(project.updatedAt) }}</span>
              <span>Created: {{ formatDate(project.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" @click="handleCancel">
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!selectedProjectId || isOpening"
          @click="handleOpen"
        >
          {{ isOpening ? 'Opening...' : 'Open Project' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { projectService } from '../../services/ProjectService';
import type { ProjectMetadata } from '../../../../backend/src/models/Project';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  opened: [projectId: string];
}>();

const projects = ref<ProjectMetadata[]>([]);
const selectedProjectId = ref<string | null>(null);
const isLoading = ref(false);
const isOpening = ref(false);
const error = ref('');

// Load projects when dialog opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    selectedProjectId.value = null;
    error.value = '';
    await loadProjects();
  }
});

async function loadProjects() {
  isLoading.value = true;
  error.value = '';

  try {
    projects.value = await projectService.listProjects();
  } catch (err: any) {
    error.value = err.message || 'Failed to load projects';
  } finally {
    isLoading.value = false;
  }
}

function selectProject(projectId: string) {
  selectedProjectId.value = projectId;
}

async function handleOpen() {
  if (!selectedProjectId.value || isOpening.value) return;

  isOpening.value = true;
  error.value = '';

  try {
    await projectService.loadProject(selectedProjectId.value);
    emit('opened', selectedProjectId.value);
    emit('close');
  } catch (err: any) {
    error.value = err.message || 'Failed to open project';
    isOpening.value = false;
  }
}

function handleCancel() {
  emit('close');
}

function handleOverlayClick() {
  if (!isOpening.value) {
    emit('close');
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString();
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
  min-width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dialog-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.loading-state,
.empty-state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

.projects-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.project-item {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.2s;
}

.project-item:last-child {
  border-bottom: none;
}

.project-item:hover {
  background-color: #f9fafb;
}

.project-item.selected {
  background-color: #eff6ff;
  border-left: 3px solid #2563eb;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}

.project-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #6b7280;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
  margin-bottom: 16px;
  padding: 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  color: #dc2626;
  font-size: 14px;
}
</style>
