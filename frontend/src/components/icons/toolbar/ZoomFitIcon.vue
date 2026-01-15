<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Frame with arrows pointing outward to corners -->
    <rect
      x="6"
      y="6"
      width="12"
      height="12"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
    <path
      d="M 4 4 L 7 4 M 4 4 L 4 7"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <path
      d="M 20 4 L 17 4 M 20 4 L 20 7"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <path
      d="M 4 20 L 7 20 M 4 20 L 4 17"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <path
      d="M 20 20 L 17 20 M 20 20 L 20 17"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
