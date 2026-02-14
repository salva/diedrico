<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- 3D point above -->
    <circle cx="12" cy="6" r="2.5" :fill="ICON_COLORS.neutral" opacity="0.9" />
    <!-- Projection lines going down -->
    <line x1="12" y1="8.5" x2="6" y2="17" :stroke="ICON_COLORS.neutral" stroke-width="1" stroke-dasharray="2,2" opacity="0.5" />
    <line x1="12" y1="8.5" x2="18" y2="17" :stroke="ICON_COLORS.neutral" stroke-width="1" stroke-dasharray="2,2" opacity="0.5" />
    <!-- Projection plane (horizontal line) -->
    <line x1="3" y1="17" x2="21" y2="17" :stroke="ICON_COLORS.neutral" stroke-width="1.5" opacity="0.7" />
    <!-- Projected points on the plane -->
    <circle cx="6" cy="17" r="2" :fill="ICON_COLORS.neutral" opacity="0.4" />
    <circle cx="18" cy="17" r="2" :fill="ICON_COLORS.neutral" opacity="0.4" />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
