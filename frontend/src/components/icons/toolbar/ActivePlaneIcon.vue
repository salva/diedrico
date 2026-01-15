<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Rectangle representing active projection plane -->
    <rect
      x="5"
      y="7"
      width="14"
      height="10"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
    <line
      x1="5"
      y1="7"
      x2="19"
      y2="17"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1"
      opacity="0.5"
    />
    <line
      x1="19"
      y1="7"
      x2="5"
      y2="17"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1"
      opacity="0.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
