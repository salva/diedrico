<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Hand icon for panning -->
    <path
      d="M 9 11 L 9 7 Q 9 5 10.5 5 Q 12 5 12 7 L 12 5 Q 12 3 13.5 3 Q 15 3 15 5 L 15 7 Q 15 5 16.5 5 Q 18 5 18 7 L 18 11 L 18 9 Q 18 7 19.5 7 Q 21 7 21 9 L 21 14 Q 21 18 17 18 L 13 18 Q 9 18 7 14 L 5 11 L 7 10 Z"
      :fill="ICON_COLORS.primary"
      :stroke="ICON_COLORS.primary"
      stroke-width="0.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
