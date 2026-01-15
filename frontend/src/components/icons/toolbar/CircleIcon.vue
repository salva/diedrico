<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Created circle (blue) with argument center point (orange) and circumference point (orange) -->
    <circle
      cx="12"
      cy="12"
      r="6"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
    <circle
      cx="12"
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
