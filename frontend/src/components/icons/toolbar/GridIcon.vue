<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Grid pattern icon -->
    <line x1="6" y1="3" x2="6" y2="21" :stroke="ICON_COLORS.neutral" stroke-width="1" opacity="0.6" />
    <line x1="12" y1="3" x2="12" y2="21" :stroke="ICON_COLORS.neutral" stroke-width="1" opacity="0.6" />
    <line x1="18" y1="3" x2="18" y2="21" :stroke="ICON_COLORS.neutral" stroke-width="1" opacity="0.6" />
    <line x1="3" y1="6" x2="21" y2="6" :stroke="ICON_COLORS.neutral" stroke-width="1" opacity="0.6" />
    <line x1="3" y1="12" x2="21" y2="12" :stroke="ICON_COLORS.neutral" stroke-width="1" opacity="0.6" />
    <line x1="3" y1="18" x2="21" y2="18" :stroke="ICON_COLORS.neutral" stroke-width="1" opacity="0.6" />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
