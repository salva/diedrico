<template>
  <div class="plane-selector">
    <h3 class="selector-title">Active Plane</h3>
    <div class="plane-buttons">
      <button
        v-for="plane in planes"
        :key="plane.id"
        :class="['plane-button', { active: isActivePlane(plane.id) }]"
        @click="selectPlane(plane.id)"
      >
        <span class="plane-label"><SubscriptText :text="plane.id" /></span>
        <span class="plane-name"><SubscriptText :text="plane.name" /></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useViewStore } from '@/stores/viewStore';
import SubscriptText from '../common/SubscriptText.vue';

const viewStore = useViewStore();

const planes = computed(() => viewStore.planes);

const isActivePlane = (planeId: string) => {
  return viewStore.activePlaneId === planeId;
};

const selectPlane = (planeId: string) => {
  viewStore.setActivePlane(planeId);
};
</script>

<style scoped>
.plane-selector {
  background-color: #ffffff;
  border-bottom: 1px solid #ddd;
  padding: 16px;
}

.selector-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  margin: 0 0 12px 0;
  letter-spacing: 0.5px;
}

.plane-buttons {
  display: flex;
  gap: 8px;
}

.plane-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f5f5;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.plane-button:hover {
  background-color: #e8e8e8;
  border-color: #ccc;
}

.plane-button.active {
  background-color: #e3f2fd;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.plane-label {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.plane-button.active .plane-label {
  color: #2196f3;
}

.plane-name {
  font-size: 12px;
  color: #666;
}

.plane-button.active .plane-name {
  color: #1976d2;
}
</style>
