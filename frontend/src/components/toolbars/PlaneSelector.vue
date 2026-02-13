<template>
  <div class="plane-selector" aria-label="Active plane selector">
    <div class="plane-select-wrapper">
      <select
        class="plane-select"
        :value="activePlaneId"
        @change="handleSelect"
        title="Active Plane"
      >
        <option
          v-for="plane in planes"
          :key="plane.id"
          :value="plane.id"
        >
          {{ plane.label }}
        </option>
      </select>
      <div class="formatted-label" v-html="formatElementLabel(activePlaneLabel)"></div>
      <svg class="chevron" width="12" height="12" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M 5 7 L 10 12 L 15 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import type { World } from '@/domain/world/World';
import { formatElementLabel } from '@/utils/formatUtils';

const world = inject<World>('world');
if (!world) {
  throw new Error('[PlaneSelector] World not provided');
}

const forceUpdate = ref(0);
let intervalId: number | null = null;
let lastVersion = world.getVersion();

onMounted(() => {
  intervalId = window.setInterval(() => {
    const currentVersion = world.getVersion();
    if (currentVersion !== lastVersion) {
      lastVersion = currentVersion;
      forceUpdate.value++;
    }
  }, 100);
});

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId);
  }
});

type PlaneOption = { id: string; label: string };

const planes = computed<PlaneOption[]>(() => {
  const _ = forceUpdate.value;

  return world
    .getAllProjectionPlanes()
    .filter((p) => typeof p.id === 'string' && p.id.length > 0)
    .map((p) => ({ id: p.id as string, label: p.name || (p.id as string) }));
});

const activePlaneId = computed(() => {
  const _ = forceUpdate.value;
  return world.getActivePlaneId();
});

const activePlaneLabel = computed(() => {
  const _ = forceUpdate.value;
  const planeId = world.getActivePlaneId();
  const plane = planes.value.find(p => p.id === planeId);
  return plane?.label || planeId;
});

function handleSelect(event: Event) {
  const target = event.target as HTMLSelectElement | null;
  if (!target) return;
  const planeId = target.value;
  if (!planeId) return;
  world.setActivePlaneId(planeId);
}
</script>

<style scoped>
.plane-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0px;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  height: 40px;
  justify-content: center;
}

.plane-selector:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.plane-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.plane-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  border: none;
  background: transparent;
  padding: 0 18px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: transparent;
  line-height: 1.2;
  cursor: pointer;
}

.plane-select:focus {
  outline: none;
}

.chevron {
  position: absolute;
  right: 0;
  pointer-events: none;
  color: #666;
}

.formatted-label {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}
</style>
