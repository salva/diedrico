<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Reference line (grey), parallel line (blue) below, defining point (orange) -->
    <line
      x1="4"
      y1="8"
      x2="20"
      y2="8"
      :stroke="ICON_COLORS.neutral"
      stroke-width="1"
    />
    <line
      x1="4"
      y1="16"
      x2="20"
      y2="16"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
    />
    <circle
      cx="12"
      cy="16"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
