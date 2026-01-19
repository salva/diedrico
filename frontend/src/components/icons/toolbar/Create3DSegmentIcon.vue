<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- 3D Segment - main segment with endpoints -->
    <line
      x1="5"
      y1="17"
      x2="15"
      y2="7"
      :stroke="ICON_COLORS.primary"
      stroke-width="2"
    />
    <circle
      cx="5"
      cy="17"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
    <circle
      cx="15"
      cy="7"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
    <!-- Depth segment (lighter, offset) -->
    <line
      x1="9"
      y1="19"
      x2="19"
      y2="9"
      :stroke="ICON_COLORS.primary"
      stroke-width="2"
      opacity="0.3"
    />
    <circle
      cx="9"
      cy="19"
      r="1.5"
      :fill="ICON_COLORS.secondary"
      opacity="0.3"
    />
    <circle
      cx="19"
      cy="9"
      r="1.5"
      :fill="ICON_COLORS.secondary"
      opacity="0.3"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
/**
 * Create3DSegmentIcon - Icon for 3D segment creation tool
 * Phase 78: 3D Element Creation Tools
 */
</script>
