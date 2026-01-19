<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- 3D Point - larger filled circle with small depth indicator -->
    <circle
      cx="12"
      cy="12"
      r="4"
      :fill="ICON_COLORS.primary"
    />
    <!-- Depth indicator - small offset circle -->
    <circle
      cx="15"
      cy="9"
      r="2"
      :fill="ICON_COLORS.secondary"
      opacity="0.6"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
/**
 * Create3DPointIcon - Icon for 3D point creation tool
 * Phase 78: 3D Element Creation Tools
 */
</script>
