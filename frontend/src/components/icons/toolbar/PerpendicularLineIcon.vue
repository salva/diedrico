<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Argument reference line (orange), created perpendicular (blue), right-angle marker, argument point (orange) -->
    <line
      x1="4"
      y1="16"
      x2="20"
      y2="16"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
    />
    <line
      x1="12"
      y1="4"
      x2="12"
      y2="20"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
    />
    <!-- Right-angle marker -->
    <path
      d="M 10 16 L 10 14 L 12 14"
      :stroke="ICON_COLORS.primary"
      stroke-width="1"
      fill="none"
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
