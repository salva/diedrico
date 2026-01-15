<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Circle (orange), external point (orange), tangent line (blue) touching circle -->
    <circle
      cx="10"
      cy="12"
      r="5"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
      fill="none"
    />
    <line
      x1="3"
      y1="4"
      x2="21"
      y2="16"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
    />
    <circle
      cx="18"
      cy="14"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
