<template>
  <span class="subscript-text">
    <template v-if="parts.length > 1">
      {{ parts[0] }}<sub v-for="(part, index) in parts.slice(1)" :key="index">{{ part }}</sub>
    </template>
    <template v-else>
      {{ text }}
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  text: string;
}>();

const parts = computed(() => props.text.split('_'));
</script>

<style scoped>
.subscript-text {
  display: inline;
}

sub {
  font-size: 0.8em;
  vertical-align: sub;
}
</style>
