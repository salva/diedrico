<template>
  <div v-if="show" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-content startup-dialog" @click.stop>
      <h1 class="dialog-title">Diedrico - Project Selection</h1>
      <button @click="emit('close')">Continue in local mode</button>

      <!-- Sign in section (if not signed in) -->
      <div v-if="!isSignedIn" class="sign-in-section">
        <p class="info-text">Sign in with your Google account to access your projects</p>
        <button class="sign-in-button" @click="handleSignIn" :disabled="props.loading || props.driveAvailable === false">
          <span v-if="!props.loading">Sign in with Google</span>
          <span v-else>Signing in...</span>
        </button>
        <p v-if="props.error" class="error-text">{{ props.error }}</p>
      </div>

      <!-- Project selection (after sign in) -->
      <div v-else class="project-selection">
        <div style="margin-bottom: 20px;">
          <button class="create-button" style="width: 100%" @click="handleCreateNewProject">
            + Create New Project
          </button>
        </div>

        <!-- Open Existing Project Section -->
        <section class="project-section">
          <h2>Open Existing Project</h2>
          
          <div v-if="props.loadingFiles" class="loading-files">
            Loading projects...
          </div>
          
          <div v-else-if="props.files.length === 0" class="no-files">
            <p>No projects found in your Google Drive.</p>
            <button class="create-button" @click="handleCreateNewProject">Create First Project</button>
          </div>
          
          <div v-else class="file-list">
            <div
              v-for="file in props.files"
              :key="file.id"
              class="file-item"
              :class="{ selected: selectedFileId === file.id }"
              @click="selectedFileId = file.id"
              @dblclick="handleOpenProject"
            >
              <div class="file-name">{{ getDisplayName(file.name) }}</div>
              <div class="file-modified">{{ formatDate(file.modifiedTime) }}</div>
            </div>
          </div>
          
          <button 
            v-if="props.files.length > 0"
            @click="handleOpenProject" 
            :disabled="props.loading || !selectedFileId"
            class="open-button"
          >
            Open
          </button>
        </section>

        <p v-if="props.error" class="error-text">{{ props.error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { GoogleDriveFile } from '@/application/appShell/DrivePortTypes';

interface Props {
  show: boolean;
  isSignedIn: boolean;
  files: GoogleDriveFile[];
  loading: boolean;
  driveAvailable?: boolean;
  loadingFiles: boolean;
  error: string | null;
}

interface Emits {
  (e: 'sign-in'): void;
  (e: 'open', fileId: string): void;
  (e: 'close'): void;
  (e: 'create-project'): void;
  (e: 'request-files'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedFileId = ref<string | null>(null);


// Watch for sign-in status changes
watch(() => props.isSignedIn, (signedIn) => {
  if (signedIn) emit('request-files');
}, { immediate: true });

function handleSignIn() {
  emit('sign-in');
}

async function handleOpenProject() {
  if (!selectedFileId.value) {
    return;
  }

  emit('open', selectedFileId.value);
}

function handleCreateNewProject() {
  emit('create-project');
}

function handleOverlayClick() {
  // Don't allow closing the startup dialog by clicking overlay
  // User must complete sign-in and project selection
}

function getDisplayName(fileName: string): string {
  // Remove .diedrico extension for display
  return fileName.replace(/\.diedrico$/, '');
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  padding: 32px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dialog-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  color: #333;
}

.sign-in-section {
  text-align: center;
  padding: 40px 0;
}

.info-text {
  margin-bottom: 24px;
  color: #666;
  font-size: 16px;
}

.sign-in-button {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 500;
  color: white;
  background: #4285f4;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.sign-in-button:hover:not(:disabled) {
  background: #3367d6;
}

.sign-in-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.project-selection {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-section h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.section-divider {
  text-align: center;
  color: #999;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  position: relative;
  margin: 8px 0;
}

.section-divider::before,
.section-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #ddd;
}

.section-divider::before {
  left: 0;
}

.section-divider::after {
  right: 0;
}

.create-project-form {
  display: flex;
  gap: 12px;
}

.project-name-input {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.2s;
}

.project-name-input:focus {
  border-color: #4285f4;
}

.create-button,
.open-button {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: #4285f4;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.create-button:hover:not(:disabled),
.open-button:hover:not(:disabled) {
  background: #3367d6;
}

.create-button:disabled,
.open-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading-files {
  padding: 40px;
  text-align: center;
  color: #666;
}

.no-files {
  padding: 40px;
  text-align: center;
  color: #666;
}

.no-files .hint {
  margin-top: 8px;
  font-size: 14px;
  color: #999;
}

.file-list {
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background: #f5f5f5;
}

.file-item.selected {
  background: #e3f2fd;
  border-left: 3px solid #4285f4;
}

.file-name {
  font-weight: 500;
  color: #333;
}

.file-modified {
  font-size: 12px;
  color: #999;
}

.error-text {
  margin-top: 16px;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.open-button {
  align-self: flex-end;
  margin-top: 12px;
}
</style>
