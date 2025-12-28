<template>
  <template v-if="text.includes('_')">
    <template v-for="(part, index) in parts" :key="index">
      <template v-if="index === 0">{{ part }}</template>
      <sub v-else>{{ part }}</sub>
    </template>
  </template>
  <template v-else>
    {{ text }}
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  text: string;
}

const props = defineProps<Props>();

const parts = computed(() => props.text.split('_'));
</script>
