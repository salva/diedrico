<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Single filled circle representing a free point -->
    <circle
      cx="12"
      cy="12"
      r="4"
      :fill="ICON_COLORS.primary"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
