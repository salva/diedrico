<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Dashed construction line (blue) with direction point (orange) -->
    <line
      x1="4"
      y1="12"
      x2="20"
      y2="12"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      stroke-dasharray="3,2"
    />
    <circle
      cx="15"
      cy="12"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
