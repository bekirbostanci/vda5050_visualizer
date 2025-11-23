<script setup lang="ts">
import AgvList from "@/components/AgvList.vue";
</script>

<template>
  <div class="h-full w-full border-r bg-background">
    <AgvList />
  </div>
</template>

<style>
/* Custom scrollbar styling for light and dark mode */
.sidebar-content {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

.sidebar-content::-webkit-scrollbar {
  width: 8px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

/* Dark mode specific scrollbar styling */
.dark .sidebar-content {
  scrollbar-color: hsl(var(--muted-foreground) / 0.4) transparent;
}

.dark .sidebar-content::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.4);
}

.dark .sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.6);
}
</style>
