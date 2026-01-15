<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Argument source point (orange), argument guide (orange dashed), created transported point (blue) -->
    <line
      x1="4"
      y1="10"
      x2="20"
      y2="10"
      :stroke="ICON_COLORS.secondary"
      stroke-width="1.5"
      stroke-dasharray="3,2"
    />
    <circle
      cx="8"
      cy="14"
      r="2"
      :fill="ICON_COLORS.secondary"
    />
    <circle
      cx="8"
      cy="10"
      r="2"
      :fill="ICON_COLORS.primary"
    />
    <!-- Arrow indicating transport direction -->
    <path
      d="M 8 13 L 8 11"
      :stroke="ICON_COLORS.neutral"
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
        <path d="M0,0 L0,6 L9,3 z" :fill="ICON_COLORS.neutral" />
      </marker>
    </defs>
  </svg>
</template>
    </defs>
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
