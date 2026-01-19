<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- 3D Line - main line with parallel depth line -->
    <line
      x1="5"
      y1="17"
      x2="15"
      y2="7"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
    />
    <!-- Depth line (lighter, offset) -->
    <line
      x1="9"
      y1="19"
      x2="19"
      y2="9"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      opacity="0.4"
    />
    <!-- Connecting lines showing depth -->
    <line
      x1="5"
      y1="17"
      x2="9"
      y2="19"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1"
      opacity="0.5"
    />
    <line
      x1="15"
      y1="7"
      x2="19"
      y2="9"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1"
      opacity="0.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
/**
 * Create3DLineIcon - Icon for 3D line creation tool
 * Phase 78: 3D Element Creation Tools
 */
</script>
