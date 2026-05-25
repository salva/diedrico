<template>
  <div v-if="isOpen && element" class="dialog-overlay" @click="handleOverlayClick">
    <div class="dialog-content" @click.stop>
      <h2 class="dialog-title">Element Properties</h2>
      
      <form @submit.prevent="handleSubmit">
        <!-- Element Info Section -->
        <div class="info-section">
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value">{{ element.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">{{ formatKind(element.kind) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <input
              v-model="localName"
              type="text"
              class="form-input"
              placeholder="Element name..."
              :class="{ 'input-error': !isLabelValid }"
            />
          </div>
          <div v-if="localName" class="info-row">
            <span class="info-label">Preview:</span>
            <span class="label-preview" v-html="labelPreview"></span>
          </div>
          <div v-if="!isLabelValid && localName" class="validation-error">
            Invalid LaTeX syntax in label
          </div>
        </div>

        <!-- Visual Style Section -->
        <div class="style-section">
          <h3 class="section-title">Visual Style</h3>
          
          <div class="form-group">
            <label for="color-picker">Color</label>
            <div class="color-input-group">
              <input
                id="color-picker"
                v-model="localStyle.color"
                type="color"
                class="color-picker"
              />
              <input
                v-model="localStyle.color"
                type="text"
                class="form-input color-text"
                placeholder="#000000"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="lineWidth-input">Line Width</label>
            <input
              id="lineWidth-input"
              v-model.number="localStyle.lineWidth"
              type="number"
              min="1"
              max="10"
              step="0.5"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="lineStyle-select">Line Style</label>
            <select
              id="lineStyle-select"
              v-model="localStyle.lineStyle"
              class="form-select"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>

          <div class="form-group">
            <label for="opacity-input">Opacity</label>
            <input
              id="opacity-input"
              v-model.number="localStyle.opacity"
              type="number"
              min="0"
              max="1"
              step="0.1"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>
              <input
                v-model="localStyle.visible"
                type="checkbox"
                class="form-checkbox"
              />
              Visible
            </label>
          </div>
        </div>

        <!-- Dialog Actions -->
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" @click="handleCancel">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="!isLabelValid">
            Apply Changes
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Element2D } from '../../types/ElementTypes';
import type { VisualStyle } from '../../domain/world/VisualStyle';
import { formatElementLabel, validateLabelSyntax } from '@/utils/formatUtils';

const props = defineProps<{
  isOpen: boolean;
  element: Element2D | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [elementId: string, name: string, style: VisualStyle];
}>();

const localName = ref('');
const localStyle = ref<VisualStyle>({
  color: '#000000',
  lineWidth: 2,
  lineStyle: 'solid',
  opacity: 1.0,
  visible: true,
  inherited: false
});

// Label validation and preview
const isLabelValid = computed(() => {
  if (!localName.value) return true; // Empty is valid
  return validateLabelSyntax(localName.value).valid;
});

const labelPreview = computed(() => {
  if (!localName.value) return '';
  return formatElementLabel(localName.value);
});

// Watch for element changes and update local state
watch(() => props.element, (newElement) => {
  if (newElement) {
    localName.value = newElement.name || '';
    localStyle.value = { ...newElement.visualStyle };
  }
}, { immediate: true });

// Reset form when dialog opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.element) {
    localName.value = props.element.name || '';
    localStyle.value = { ...props.element.visualStyle };
  }
});

function formatKind(kind: string): string {
  // Convert CamelCase to Title Case with spaces
  return kind
    .replace(/([A-Z])/g, ' $1')
    .replace(/2D/g, ' 2D')
    .trim();
}

function handleOverlayClick() {
  handleCancel();
}

function handleCancel() {
  emit('close');
}

function handleSubmit() {
  if (props.element) {
    emit('save', props.element.id, localName.value, localStyle.value);
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
  background-color: var(--color-background);
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dialog-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--color-heading);
}

.info-section {
  margin-bottom: 24px;
  padding: 12px;
  background-color: var(--color-background-soft);
  border-radius: 4px;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  gap: 12px;
}

.info-label {
  font-weight: 600;
  color: var(--color-text-muted);
  min-width: 60px;
}

.info-value {
  color: var(--color-text);
  font-family: monospace;
}

.style-section {
  margin-bottom: 24px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-heading);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--color-background);
  color: var(--color-text);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-border-hover);
}

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: var(--color-border-hover);
}

.color-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-picker {
  width: 60px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
}

.color-text {
  flex: 1;
}

.form-checkbox {
  margin-right: 8px;
  cursor: pointer;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover {
  background-color: var(--color-background-mute);
}

.btn-primary {
  background-color: #42b983;
  border: 1px solid #42b983;
  color: white;
}

.btn-primary:hover {
  background-color: #33a372;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-error {
  border-color: #ff4444 !important;
  background-color: #fff5f5;
}

.validation-error {
  color: #ff4444;
  font-size: 12px;
  margin-top: 4px;
  padding-left: 120px;
}

.label-preview {
  font-size: 14px;
  padding: 4px 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  display: inline-block;
}
</style>
