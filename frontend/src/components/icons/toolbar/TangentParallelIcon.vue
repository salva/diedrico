<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Circle (orange), reference line (grey), tangent line (blue) parallel to reference -->
    <circle
      cx="12"
      cy="14"
      r="5"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
      fill="none"
    />
    <line
      x1="4"
      y1="5"
      x2="20"
      y2="5"
      :stroke="ICON_COLORS.neutral"
      stroke-width="1"
    />
    <line
      x1="4"
      y1="9"
      x2="20"
      y2="9"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
