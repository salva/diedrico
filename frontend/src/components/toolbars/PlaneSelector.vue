<template>
  <div 
    class="plane-selector" 
    aria-label="Active plane selector"
    ref="dropdownRef"
    data-testid="plane-selector"
  >
    <button
      class="plane-select-button"
      @click="toggleDropdown"
      @keydown.down.prevent="openDropdown"
      @keydown.up.prevent="openDropdown"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      title="Active Plane"
      data-testid="plane-selector-button"
    >
      <div class="formatted-label" v-html="formatElementLabel(activePlaneLabel)"></div>
      <svg class="chevron" width="12" height="12" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M 5 7 L 10 12 L 15 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    
    <div 
      v-if="isOpen" 
      class="dropdown-menu"
      role="listbox"
      :aria-activedescendant="focusedOptionId"
    >
      <div
        v-for="(plane, index) in planes"
        :key="plane.id"
        :id="`plane-option-${plane.id}`"
        class="dropdown-option"
        :class="{ 
          'selected': plane.id === activePlaneId,
          'focused': index === focusedIndex
        }"
        role="option"
        :data-testid="`plane-selector-${plane.id}`"
        :aria-selected="plane.id === activePlaneId"
        @click="selectPlane(plane.id)"
        @mouseenter="focusedIndex = index"
      >
        <div v-html="formatElementLabel(plane.label)"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { ActivePlaneSelectorInjectionKey } from '@/application/appShell/RuntimeInjectionKeys';
import { formatElementLabel } from '@/utils/formatUtils';

const activePlaneSelectorPort = inject(ActivePlaneSelectorInjectionKey);
if (!activePlaneSelectorPort) {
  throw new Error('[PlaneSelector] active plane selector port not provided');
}

const activePlaneSelectorPortRequired = activePlaneSelectorPort;
const forceUpdate = ref(0);
const isOpen = ref(false);
const focusedIndex = ref(-1);
const dropdownRef = ref<HTMLElement | null>(null);

function handleRuntimeChange(): void {
  forceUpdate.value++;
}

onMounted(() => {
  activePlaneSelectorPortRequired.subscribeToChanges(handleRuntimeChange);

  // Click outside handler
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  activePlaneSelectorPortRequired.unsubscribeFromChanges(handleRuntimeChange);
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});

type PlaneOption = { id: string; label: string };

const planes = computed<readonly PlaneOption[]>(() => {
  forceUpdate.value;

  return activePlaneSelectorPortRequired.getPlaneOptions();
});

const activePlaneId = computed(() => {
  forceUpdate.value;
  return activePlaneSelectorPortRequired.getActivePlaneId();
});

const activePlaneLabel = computed(() => {
  forceUpdate.value;
  return activePlaneSelectorPortRequired.getActivePlaneLabel() || activePlaneSelectorPortRequired.getActivePlaneId();
});

const focusedOptionId = computed(() => {
  if (focusedIndex.value >= 0 && focusedIndex.value < planes.value.length) {
    return `plane-option-${planes.value[focusedIndex.value].id}`;
  }
  return '';
});

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    // Set focused index to current active plane
    const activeIndex = planes.value.findIndex(p => p.id === activePlaneId.value);
    focusedIndex.value = activeIndex >= 0 ? activeIndex : 0;
  }
}

function openDropdown() {
  if (!isOpen.value) {
    toggleDropdown();
  }
}

function closeDropdown() {
  isOpen.value = false;
  focusedIndex.value = -1;
}

function selectPlane(planeId: string) {
  activePlaneSelectorPortRequired.setActivePlaneId(planeId);
  closeDropdown();
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (!isOpen.value) return;

  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      closeDropdown();
      break;
    case 'ArrowDown':
      event.preventDefault();
      focusedIndex.value = Math.min(focusedIndex.value + 1, planes.value.length - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (focusedIndex.value >= 0 && focusedIndex.value < planes.value.length) {
        const focusedPlane = planes.value[focusedIndex.value];
        if (focusedPlane) {
          selectPlane(focusedPlane.id);
        }
      }
      break;
    case 'Home':
      event.preventDefault();
      focusedIndex.value = 0;
      break;
    case 'End':
      event.preventDefault();
      focusedIndex.value = planes.value.length - 1;
      break;
  }
}
</script>

<style scoped>
.plane-selector {
  position: relative;
  display: inline-block;
}

.plane-select-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  height: 40px;
  min-width: 80px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.plane-select-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.plane-select-button:focus {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}

.formatted-label {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
  flex: 1;
}

.chevron {
  flex-shrink: 0;
  color: #666;
  transition: transform 0.2s;
}

.plane-select-button[aria-expanded="true"] .chevron {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  max-height: 300px;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 4px 0;
}

.dropdown-option {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  transition: background-color 0.15s;
  white-space: nowrap;
}

.dropdown-option:hover,
.dropdown-option.focused {
  background-color: #e8e8e8;
}

.dropdown-option.selected {
  background-color: #f0f7ff;
  color: #2196F3;
}

.dropdown-option.selected:hover,
.dropdown-option.selected.focused {
  background-color: #e3f2fd;
}
</style>
