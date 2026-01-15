<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Document with plus sign (monochrome blue action) -->
    <path
      d="M 6 3 L 6 21 L 18 21 L 18 8 L 13 3 Z"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
    <path
      d="M 13 3 L 13 8 L 18 8"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
    <line
      x1="12"
      y1="11"
      x2="12"
      y2="17"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
    />
    <line
      x1="9"
      y1="14"
      x2="15"
      y2="14"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
