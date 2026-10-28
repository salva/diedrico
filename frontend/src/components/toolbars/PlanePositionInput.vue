<template>
  <label
    v-if="enabled"
    class="plane-position-input"
    :class="{ 'has-error': displayError }"
    data-testid="plane-position-input-wrapper"
  >
    <span class="position-label">{{ label }}:</span>
    <input
      ref="inputRef"
      v-model="text"
      class="position-input"
      type="text"
      inputmode="text"
      autocomplete="off"
      spellcheck="false"
      :aria-label="`${label} coordinates on ${activePlaneName}`"
      data-testid="plane-position-input"
      :placeholder="placeholder"
      @keydown.enter.prevent="submit"
      @keydown.escape.stop.prevent="handleEscape"
      @focus="emit('focus-state-changed', true)"
      @blur="emit('focus-state-changed', false)"
    />
    <span v-if="displayError" class="position-error" role="alert">{{ displayError }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { parseToolArgumentInput } from '@/application/coordinates/parseToolArgumentInput';
import type { ParsedToolArgumentInput, ToolArgumentInputRequest } from '@/types/ToolArgumentInput';

const props = withDefaults(defineProps<{
  enabled: boolean;
  kind?: ToolArgumentInputRequest['kind'];
  valueKind?: ToolArgumentInputRequest['valueKind'];
  label?: string;
  placeholder?: string;
  activePlaneName?: string;
  error?: string;
}>(), {
  kind: 'plane-position',
  valueKind: undefined,
  label: 'position',
  placeholder: 'u,v',
  activePlaneName: '',
  error: '',
});

const emit = defineEmits<{
  submit: [input: ParsedToolArgumentInput];
  clear: [];
  'focus-state-changed': [focused: boolean];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const text = ref('');
const localError = ref('');
const displayError = computed(() => props.error || localError.value);

function submit(): void {
  localError.value = '';
  try {
    emit('submit', parseToolArgumentInput(text.value, {
      kind: props.kind,
      valueKind: props.valueKind,
      label: props.label,
      placeholder: props.placeholder,
    }));
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Enter a valid value';
  }
}

function handleEscape(): void {
  if (text.value) {
    clear();
    return;
  }
  blur();
}

function clear(): void {
  text.value = '';
  localError.value = '';
  emit('clear');
}

function blur(): void {
  inputRef.value?.blur();
}

function focusWithText(initialText: string): void {
  if (!props.enabled) return;
  void nextTick(() => {
    const input = inputRef.value;
    if (!input) return;
    input.focus();
    text.value = initialText;
    const end = text.value.length;
    void nextTick(() => input.setSelectionRange(end, end));
  });
}

function isFocused(): boolean {
  return document.activeElement === inputRef.value;
}

function hasText(): boolean {
  return text.value.length > 0;
}

function clearAndBlur(): void {
  clear();
  blur();
}

defineExpose({
  blur,
  clear,
  clearAndBlur,
  focusWithText,
  hasText,
  isFocused,
});
</script>

<style scoped>
.plane-position-input {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: #333;
}

.position-label {
  color: #666;
  font-weight: 600;
  white-space: nowrap;
}

.position-input {
  width: 110px;
  height: 20px;
  min-width: 0;
  padding: 0 6px;
  border: 1px solid #b8c2cc;
  border-radius: 3px;
  background: #fff;
  color: #111827;
  font-size: 12px;
}

.position-input:focus {
  border-color: #2563eb;
  outline: 1px solid rgba(37, 99, 235, 0.35);
}

.position-error {
  max-width: 190px;
  overflow: hidden;
  color: #b42318;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.has-error .position-input {
  border-color: #b42318;
}
</style>
