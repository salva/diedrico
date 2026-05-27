<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="handleCancel">
    <div class="properties-dialog" role="dialog" aria-labelledby="dialog-title">
      <!-- Header -->
      <div class="dialog-header">
        <h2 id="dialog-title">Properties: {{ elementLabel }}</h2>
        <button class="close-button" @click="handleCancel" aria-label="Close dialog">
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <!-- Geometry Info Section (Read-only) -->
        <section class="geometry-section">
          <h3>Geometry Info</h3>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Type:</span>
              <span class="info-value">{{ elementType }}</span>
            </div>
            <div class="info-row" v-if="planeId">
              <span class="info-label">Plane:</span>
              <span class="info-value">{{ planeId }}</span>
            </div>
            <div class="info-row" v-if="coordinates">
              <span class="info-label">Coordinates:</span>
              <span class="info-value">{{ coordinates }}</span>
            </div>
            <div class="info-row" v-if="dependencies && dependencies.length > 0">
              <span class="info-label">Dependencies:</span>
              <span class="info-value">{{ dependencies.join(', ') }}</span>
            </div>
            <div class="info-row" v-if="createdBy">
              <span class="info-label">Created by:</span>
              <span class="info-value">{{ createdBy }}</span>
            </div>
          </div>
        </section>

        <!-- Visual Style Section (Editable) -->
        <section class="visual-style-section">
          <h3>Visual Style</h3>
          <div class="style-controls">
            <!-- Color -->
            <div class="control-row">
              <label for="color-input">Color:</label>
              <input
                id="color-input"
                type="color"
                v-model="editableColor"
                :disabled="!colorOverride"
                @blur="colorOverride && validateColor(editableColor)"
              />
              <input
                type="text"
                v-model="editableColor"
                pattern="^#[0-9A-Fa-f]{6}$"
                class="hex-input"
                :class="{ 'input-error': colorError }"
                :disabled="!colorOverride"
                placeholder="#000000"
                @blur="colorOverride && validateColor(editableColor)"
              />
              <label class="override-checkbox">
                <input type="checkbox" v-model="colorOverride" />
                Override
              </label>
            </div>
            <div v-if="colorError" class="error-message">{{ colorError }}</div>

            <!-- Line Width (for non-point elements) -->
            <div class="control-row" v-if="elementType !== '2D Point'">
              <label for="width-input">Line Width:</label>
              <input
                id="width-input"
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                v-model.number="editableLineWidth"
                :disabled="!lineWidthOverride"
                @change="lineWidthOverride && validateLineWidth(editableLineWidth)"
              />
              <input
                type="number"
                v-model.number="editableLineWidth"
                min="0.5"
                max="5.0"
                step="0.1"
                class="number-input"
                :class="{ 'input-error': lineWidthError }"
                :disabled="!lineWidthOverride"
                @blur="lineWidthOverride && validateLineWidth(editableLineWidth)"
              />
              <label class="override-checkbox">
                <input type="checkbox" v-model="lineWidthOverride" />
                Override
              </label>
            </div>
            <div v-if="lineWidthError" class="error-message">{{ lineWidthError }}</div>

            <!-- Line Style (for line/segment/guide elements) -->
            <div class="control-row" v-if="hasLineStyle">
              <label for="style-input">Line Style:</label>
              <select
                id="style-input"
                v-model="editableLineStyle"
                :class="{ 'input-error': lineStyleError }"
                :disabled="!lineStyleOverride"
                @change="lineStyleOverride && validateLineStyle(editableLineStyle)"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
              <label class="override-checkbox">
                <input type="checkbox" v-model="lineStyleOverride" />
                Override
              </label>
            </div>
            <div v-if="lineStyleError" class="error-message">{{ lineStyleError }}</div>

            <!-- Visibility -->
            <div class="control-row">
              <label for="visibility-input">Visibility:</label>
              <input
                id="visibility-input"
                type="checkbox"
                v-model="editableVisible"
                :disabled="!visibilityOverride"
              />
              <label class="override-checkbox">
                <input type="checkbox" v-model="visibilityOverride" />
                Override
              </label>
            </div>
          </div>

          <!-- Reset Button -->
          <button class="reset-button" @click="handleResetToDefault">
            Reset to Default
          </button>
        </section>
      </div>

      <!-- Footer Actions -->
      <div class="dialog-footer">
        <button class="button button-secondary" @click="handleCancel">
          Cancel
        </button>
        <button class="button button-primary" @click="handleSave">
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PropertiesDialogViewModel } from '@/application/appShell/RuntimeViewPorts';

interface Props {
  isOpen: boolean;
  viewModel: PropertiesDialogViewModel | null;
}

interface StyleChanges {
  elementId: string;
  color?: string;
  lineWidth?: number;
  lineStyle?: string;
  visible?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  save: [changes: StyleChanges];
}>();

// Editable state
const editableColor = ref<string>('#000000');
const editableLineWidth = ref<number>(1.0);
const editableLineStyle = ref<string>('solid');
const editableVisible = ref<boolean>(true);

// Override flags
const colorOverride = ref<boolean>(false);
const lineWidthOverride = ref<boolean>(false);
const lineStyleOverride = ref<boolean>(false);
const visibilityOverride = ref<boolean>(false);

// Validation state
const colorError = ref<string>('');
const lineWidthError = ref<string>('');
const lineStyleError = ref<string>('');

// Computed properties for display
const elementLabel = computed(() => props.viewModel?.elementLabel ?? 'Unknown');
const elementType = computed(() => props.viewModel?.elementType ?? 'Unknown');
const planeId = computed(() => props.viewModel?.planeId ?? null);
const coordinates = computed(() => props.viewModel?.coordinates ?? null);
const dependencies = computed(() => props.viewModel?.dependencies ?? []);
const createdBy = computed(() => props.viewModel?.createdBy ?? null);

const hasLineStyle = computed(() => {
  const type = elementType.value;
  return type === '2D Line' || type === '2D Segment' || type === '2D Guide';
});

// Watch for dialog open/close and element changes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.viewModel) {
    loadElementProperties();
  }
});

watch(() => props.viewModel, () => {
  if (props.isOpen && props.viewModel) {
    loadElementProperties();
  }
});

function loadElementProperties() {
  const style = props.viewModel?.style;
  editableColor.value = style?.color ?? '#000000';
  editableLineWidth.value = style?.lineWidth ?? 1.0;
  editableLineStyle.value = style?.lineStyle ?? 'solid';
  editableVisible.value = style?.visible ?? true;
  
  // Reset override flags
  colorOverride.value = false;
  lineWidthOverride.value = false;
  lineStyleOverride.value = false;
  visibilityOverride.value = false;
  
  // Clear validation errors
  colorError.value = '';
  lineWidthError.value = '';
  lineStyleError.value = '';
}

/**
 * Validate color hex format
 */
function validateColor(color: string): boolean {
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  if (!hexPattern.test(color)) {
    colorError.value = 'Invalid hex color format (e.g., #000000)';
    return false;
  }
  colorError.value = '';
  return true;
}

/**
 * Validate line width range
 */
function validateLineWidth(width: number): boolean {
  if (width < 0.5 || width > 5.0) {
    lineWidthError.value = 'Line width must be between 0.5 and 5.0';
    return false;
  }
  lineWidthError.value = '';
  return true;
}

/**
 * Validate line style
 */
function validateLineStyle(style: string): boolean {
  const validStyles = ['solid', 'dashed', 'dotted'];
  if (!validStyles.includes(style)) {
    lineStyleError.value = 'Invalid line style';
    return false;
  }
  lineStyleError.value = '';
  return true;
}

function handleCancel() {
  emit('close');
}

function handleSave() {
  if (!props.viewModel) return;
  
  // Validate all overridden properties
  let isValid = true;
  
  if (colorOverride.value && !validateColor(editableColor.value)) {
    isValid = false;
  }
  if (lineWidthOverride.value && !validateLineWidth(editableLineWidth.value)) {
    isValid = false;
  }
  if (lineStyleOverride.value && !validateLineStyle(editableLineStyle.value)) {
    isValid = false;
  }
  
  // Don't save if validation failed
  if (!isValid) {
    console.warn('[PropertiesDialog] Validation failed');
    return;
  }
  
  const changes: StyleChanges = {
    elementId: props.viewModel.elementId,
  };
  
  // Only include overridden properties
  if (colorOverride.value) {
    changes.color = editableColor.value;
  }
  if (lineWidthOverride.value) {
    changes.lineWidth = editableLineWidth.value;
  }
  if (lineStyleOverride.value) {
    changes.lineStyle = editableLineStyle.value;
  }
  if (visibilityOverride.value) {
    changes.visible = editableVisible.value;
  }
  
  emit('save', changes);
  emit('close');
}

function handleResetToDefault() {
  // Clear all overrides
  colorOverride.value = false;
  lineWidthOverride.value = false;
  lineStyleOverride.value = false;
  visibilityOverride.value = false;
  
  // Reset to defaults
  loadElementProperties();
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

.properties-dialog {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
}

.dialog-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #212121;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: #757575;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #212121;
}

.dialog-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

section {
  margin-bottom: 24px;
}

section:last-child {
  margin-bottom: 0;
}

section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #212121;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  gap: 12px;
}

.info-label {
  font-weight: 500;
  color: #757575;
  min-width: 120px;
}

.info-value {
  color: #212121;
  font-family: "Fira Code", "Consolas", "Monaco", monospace;
  font-size: 11px;
}

.style-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-row label {
  min-width: 100px;
  font-weight: 500;
  color: #212121;
}

.control-row input[type="color"] {
  width: 40px;
  height: 32px;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.hex-input {
  width: 100px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: "Fira Code", "Consolas", "Monaco", monospace;
}

.control-row input[type="range"] {
  flex: 1;
  min-width: 100px;
}

.number-input {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.control-row select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.override-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #757575;
  min-width: 80px;
}

.override-checkbox input[type="checkbox"] {
  margin: 0;
}

.reset-button {
  margin-top: 12px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.reset-button:hover {
  background: #e0e0e0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
}

.button {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.button-secondary {
  background: #f5f5f5;
  color: #212121;
  border: 1px solid #ccc;
}

.button-secondary:hover {
  background: #e0e0e0;
}

.button-primary {
  background: #0066cc;
  color: white;
}

.button-primary:hover {
  background: #0052a3;
}

/* Disabled state */
input:disabled,
select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Validation error states */
.input-error {
  border-color: #dc3545 !important;
  background-color: #fff5f5;
}

.error-message {
  color: #dc3545;
  font-size: 12px;
  margin-top: -8px;
  margin-bottom: 8px;
  margin-left: 100px;
}
</style>
