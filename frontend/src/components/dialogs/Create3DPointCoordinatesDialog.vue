<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="emitClose">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="create-3d-point-title">
      <div class="dialog-header">
        <h2 id="create-3d-point-title">3D Point Coordinates</h2>
        <button class="close-button" type="button" aria-label="Close" @click="emitClose">x</button>
      </div>

      <form class="coordinate-form" @submit.prevent="submit">
        <label class="field">
          <span>X</span>
          <input v-model="xValue" type="number" step="any" required data-testid="create-3d-point-x" />
        </label>
        <label class="field">
          <span>Y</span>
          <input v-model="yValue" type="number" step="any" required data-testid="create-3d-point-y" />
        </label>
        <label class="field">
          <span>Z</span>
          <input v-model="zValue" type="number" step="any" required data-testid="create-3d-point-z" />
        </label>

        <p v-if="displayError" class="error-message" role="alert">{{ displayError }}</p>

        <div class="actions">
          <button class="secondary-button" type="button" @click="emitClose">Cancel</button>
          <button class="primary-button" type="submit" data-testid="create-3d-point-submit">Create</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  close: [];
  submit: [coordinates: { x: number; y: number; z: number }];
}>();

const xValue = ref('0');
const yValue = ref('0');
const zValue = ref('0');
const localError = ref('');

const displayError = computed(() => props.error || localError.value);

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) localError.value = '';
});

function emitClose(): void {
  localError.value = '';
  emit('close');
}

function submit(): void {
  localError.value = '';
  const coordinates = {
    x: Number(xValue.value),
    y: Number(yValue.value),
    z: Number(zValue.value),
  };
  if (!Number.isFinite(coordinates.x) || !Number.isFinite(coordinates.y) || !Number.isFinite(coordinates.z)) {
    localError.value = 'Enter finite numeric coordinates.';
    return;
  }
  emit('submit', coordinates);
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.35);
}

.dialog {
  width: min(420px, 100%);
  border: 1px solid #d6dde6;
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.22);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #e5eaf0;
}

.dialog-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 650;
}

.close-button {
  width: 32px;
  height: 32px;
  border: 1px solid #cfd8e3;
  border-radius: 4px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.coordinate-form {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.field {
  display: grid;
  grid-template-columns: 32px 1fr;
  align-items: center;
  gap: 12px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

.field input {
  width: 100%;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #cfd8e3;
  border-radius: 4px;
  color: #111827;
  font-size: 14px;
}

.field input:focus {
  border-color: #2563eb;
  outline: 2px solid rgba(37, 99, 235, 0.16);
}

.error-message {
  margin: 0;
  color: #b42318;
  font-size: 13px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.primary-button,
.secondary-button {
  height: 36px;
  padding: 0 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.primary-button {
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.secondary-button {
  border: 1px solid #cfd8e3;
  background: #ffffff;
  color: #374151;
}
</style>
