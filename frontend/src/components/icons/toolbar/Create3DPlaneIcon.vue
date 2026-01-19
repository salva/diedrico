<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- 3D Plane - tilted parallelogram with trace lines -->
    <!-- Plane outline -->
    <path
      d="M 7 14 L 12 9 L 19 11 L 14 16 Z"
      :fill="ICON_COLORS.primary"
      opacity="0.15"
    />
    <path
      d="M 7 14 L 12 9 L 19 11 L 14 16 Z"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
    <!-- Horizontal trace line -->
    <line
      x1="4"
      y1="18"
      x2="16"
      y2="18"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
    />
    <!-- Vertical trace line -->
    <line
      x1="20"
      y1="8"
      x2="20"
      y2="16"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
/**
 * Create3DPlaneIcon - Icon for 3D plane creation tool
 * Phase 78: 3D Element Creation Tools
 */
</script>
