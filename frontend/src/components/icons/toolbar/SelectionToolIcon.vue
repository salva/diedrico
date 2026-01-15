<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Selection cursor (blue) - default tool indicator -->
    <path
      d="M 4 3 L 4 18 L 9 13.5 L 11.5 19.5 L 13.5 18.5 L 11 12.5 L 16 12 Z"
      :fill="ICON_COLORS.primary"
      :stroke="ICON_COLORS.primary"
      stroke-width="0.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
