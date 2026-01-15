<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Curved arrow pointing right -->
    <path
      d="M 15 8 L 19 12 L 15 16"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      fill="none"
    />
    <path
      d="M 19 12 L 10 12 Q 5 12 5 17"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      stroke-linecap="round"
      fill="none"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
