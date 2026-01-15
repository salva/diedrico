<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <!-- Folder icon -->
    <path
      d="M 4 6 L 4 18 L 20 18 L 20 8 L 12 8 L 10 6 Z"
      :stroke="ICON_COLORS.primary"
      stroke-width="1.5"
      fill="none"
    />
  </svg>
</template>

<script setup lang="ts">
import { ICON_COLORS } from '@/constants/colors';
</script>
