<template>
  <div class="status-bar" data-testid="status-bar">
    <!-- Left section: General info -->
    <div class="status-section status-left">
      <span class="status-item">
        <span class="status-label">Plane:</span>
        <span class="status-value" data-testid="active-plane-status">{{ activePlaneName }}</span>
      </span>
      <span class="status-item">
        <span class="status-label">Tool:</span>
        <span class="status-value" data-testid="active-tool-status">{{ activeToolName }}</span>
      </span>
      <PlanePositionInput
        ref="planePositionInputRef"
        :enabled="planePositionInput.enabled"
        :kind="planePositionInput.kind"
        :value-kind="planePositionInput.valueKind"
        :label="planePositionInput.label"
        :placeholder="planePositionInput.placeholder"
        :active-plane-name="activePlaneName"
        :error="planePositionInput.error"
        @submit="input => emit('submit-tool-argument-input', input)"
      />
    </div>
    
    <!-- Center section: Tool feedback, cascade preview, save status -->
    <div class="status-section status-center">
      <!-- Tool step feedback (highest priority) -->
      <span v-if="toolStepMessage" class="status-item tool-step-message">
        {{ toolStepMessage }}
      </span>
      <!-- Cascade deletion preview -->
      <span v-else-if="cascadeCount > 0" class="status-item cascade-warning">
        <span class="cascade-icon">⚠️</span>
        <span class="cascade-text">{{ cascadeCount }} element{{ cascadeCount > 1 ? 's' : '' }} will be cascade deleted</span>
      </span>
      <!-- Save status (lowest priority) -->
      <span v-else-if="saveStatus !== 'idle'" class="status-item save-status" :class="`save-status-${saveStatus}`">
        <span v-if="saveStatus === 'saving'">💾 Saving...</span>
        <span v-else-if="saveStatus === 'saved'">✓ All changes saved</span>
      </span>
    </div>
    
    <!-- Right section: 3D coordinates -->
    <div class="status-section status-right">
      <span class="status-item coordinates-3d">
        <span class="status-label">3D:</span>
        <span class="status-value coordinates-value" data-testid="coordinates-3d" :class="{ 'coordinates-inactive': !has3DCoordinates }">
          {{ formattedCoordinates }}
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PlanePositionInput from './PlanePositionInput.vue';
import type { ParsedToolArgumentInput, ToolArgumentInputRequest } from '@/types/ToolArgumentInput';

export interface PlanePositionInputState {
  enabled: boolean;
  kind: ToolArgumentInputRequest['kind'];
  valueKind?: ToolArgumentInputRequest['valueKind'];
  label: string;
  placeholder: string;
  error?: string;
}

interface Props {
  activePlaneId?: string;
  activePlaneName?: string;
  activeTool?: string;
  coordinates3D?: { x: number; y: number; z: number } | null;
  saveStatus?: 'idle' | 'saving' | 'saved';
  cascadeCount?: number;  // Number of elements that will be cascade deleted
  toolStepMessage?: string;  // Contextual feedback from the active tool
  planePositionInput?: PlanePositionInputState;
}

const props = withDefaults(defineProps<Props>(), {
  activePlaneId: '',
  activePlaneName: 'None',
  activeTool: 'Select',
  coordinates3D: null,
  saveStatus: 'idle',
  cascadeCount: 0,
  toolStepMessage: '',
  planePositionInput: () => ({ enabled: false, kind: 'plane-position', label: 'position', placeholder: 'u,v', error: '' })
});

const emit = defineEmits<{
  'submit-tool-argument-input': [input: ParsedToolArgumentInput];
}>();

const planePositionInputRef = ref<InstanceType<typeof PlanePositionInput> | null>(null);

const has3DCoordinates = computed(() => {
  return props.coordinates3D !== null && props.coordinates3D !== undefined;
});

const activeToolName = computed(() => {
  // Capitalize first letter
  return props.activeTool.charAt(0).toUpperCase() + props.activeTool.slice(1);
});

const formattedCoordinates = computed(() => {
  if (!has3DCoordinates.value || !props.coordinates3D) {
    return '---';
  }
  
  const { x, y, z } = props.coordinates3D;
  
  // Format to 2 decimal places
  const fx = x.toFixed(2);
  const fy = y.toFixed(2);
  const fz = z.toFixed(2);
  
  return `(${fx}, ${fy}, ${fz})`;
});

function focusCoordinateInputWithText(text: string): void {
  planePositionInputRef.value?.focusWithText(text);
}

function clearCoordinateInput(): void {
  planePositionInputRef.value?.clearAndBlur();
}

function blurCoordinateInput(): void {
  planePositionInputRef.value?.blur();
}

function isCoordinateInputFocused(): boolean {
  return planePositionInputRef.value?.isFocused() ?? false;
}

function hasCoordinateInputText(): boolean {
  return planePositionInputRef.value?.hasText() ?? false;
}

defineExpose({
  blurCoordinateInput,
  clearCoordinateInput,
  focusCoordinateInputWithText,
  hasCoordinateInputText,
  isCoordinateInputFocused,
});
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
  font-size: 13px;
  color: #333;
  height: 28px;
  min-height: 28px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.status-section {
  display: flex;
  gap: 16px;
  align-items: center;
}

.status-left {
  flex: 1;
}

.status-center {
  flex: 0 0 auto;
  justify-content: center;
}

.status-right {
  flex-shrink: 0;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.save-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.save-status-saving {
  background-color: #fff3cd;
  color: #856404;
  animation: pulse 1.5s ease-in-out infinite;
}

.save-status-saved {
  background-color: #d4edda;
  color: #155724;
}

.tool-step-message {
  font-size: 12px;
  color: #1a73e8;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 3px;
  background-color: #e8f0fe;
}

.cascade-warning {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cascade-icon {
  font-size: 16px;
}

.cascade-text {
  font-size: 13px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.status-label {
  font-weight: 600;
  color: #666;
}

.status-value {
  color: #222;
}

.coordinates-3d {
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 2px 8px;
}

.coordinates-value {
  min-width: 140px;
  text-align: right;
}

.coordinates-inactive {
  color: #999;
  font-style: italic;
}

/* Hover effect for coordinate display */
.coordinates-3d:hover {
  background-color: #fafafa;
  border-color: #aaa;
}
</style>
