<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Source point (orange) on source plane (grey), transported point (blue) on target plane (grey) -->
    <line
      x1="4"
      y1="14"
      x2="20"
      y2="14"
      :stroke="ICON_COLORS.neutral"
      stroke-width="1"
    />
    <line
      x1="4"
      y1="10"
      x2="20"
      y2="10"
      :stroke="ICON_COLORS.neutral"
      stroke-width="1"
    />
    <circle
      cx="10"
      cy="14"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
    <circle
      cx="10"
      cy="10"
      r="2"
      :fill="ICON_COLORS.primary"
    />
    <!-- Arrow indicating transport -->
    <path
      d="M 10 13 L 10 11"
      :stroke="ICON_COLORS.primary"
      stroke-width="1"
      marker-end="url(#arrow)"
    />
    <defs>
      <marker
        id="arrow"
        markerWidth="10"
        markerHeight="10"
        refX="5"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" :fill="ICON_COLORS.primary" />
      </marker>
    </defs>
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
