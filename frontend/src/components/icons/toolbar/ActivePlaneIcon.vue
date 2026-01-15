<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Rectangle representing active projection plane (monochrome grey context) -->
    <rect
      x="5"
      y="7"
      width="14"
      height="10"
      :stroke="ICON_COLORS.neutral"
      stroke-width="1.5"
      fill="none"
    />
    <text
      x="12"
      y="13"
      text-anchor="middle"
      :fill="ICON_COLORS.neutral"
      font-size="6"
      font-weight="bold"
    >P</text>
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
