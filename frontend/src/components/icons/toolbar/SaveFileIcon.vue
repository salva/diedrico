<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Floppy disk icon -->
    <rect
      x="5"
      y="3"
      width="14"
      height="18"
      rx="1"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
    <rect
      x="8"
      y="3"
      width="8"
      height="5"
      :fill="ICON_COLORS.secondary"
    />
    <rect
      x="8"
      y="14"
      width="8"
      height="5"
      :stroke="ICON_COLORS.primary"
      stroke-width="1"
      fill="none"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
