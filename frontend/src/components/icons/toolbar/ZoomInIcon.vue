<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Magnifying glass with plus sign -->
    <circle
      cx="10"
      cy="10"
      r="6"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
    <line
      x1="14.5"
      y1="14.5"
      x2="19"
      y2="19"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <line
      x1="10"
      y1="7"
      x2="10"
      y2="13"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
    />
    <line
      x1="7"
      y1="10"
      x2="13"
      y2="10"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
