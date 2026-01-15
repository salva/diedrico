<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Argument hinge line (orange), argument point (orange), created guide (blue) with perpendicular marker -->
    <line
      x1="12"
      y1="4"
      x2="12"
      y2="20"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
    />
    <line
      x1="6"
      y1="14"
      x2="18"
      y2="14"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      stroke-dasharray="3,2"
    />
    <!-- Right-angle marker -->
    <path
      d="M 12 12 L 12 14 L 14 14"
      :stroke="ICON_COLORS.primary"
      stroke-width="1"
      fill="none"
    />
    <circle
      cx="12"
      cy="14"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
