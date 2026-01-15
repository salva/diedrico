<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Created segment (blue) with argument endpoint circles (orange) -->
    <line
      x1="6"
      y1="12"
      x2="18"
      y2="12"
      :stroke="ICON_COLORS.primary"
      stroke-width="2"
    />
    <circle
      cx="6"
      cy="12"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
    <circle
      cx="18"
      cy="12"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
