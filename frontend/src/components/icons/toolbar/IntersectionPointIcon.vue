<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Two intersecting argument lines (orange) with created intersection point (blue) -->
    <line
      x1="4"
      y1="12"
      x2="20"
      y2="12"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
    />
    <line
      x1="12"
      y1="4"
      x2="12"
      y2="20"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
    />
    <circle
      cx="12"
      cy="12"
      r="2.5"
      :fill="ICON_COLORS.primary"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
