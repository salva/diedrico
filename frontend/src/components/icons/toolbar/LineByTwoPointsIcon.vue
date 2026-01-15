<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Diagonal line (blue) with two endpoint circles (orange) -->
    <line
      x1="6"
      y1="18"
      x2="18"
      y2="6"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
    />
    <circle
      cx="6"
      cy="18"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
    <circle
      cx="18"
      cy="6"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
