<script setup lang="ts">
import { computed } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import { useColorMode } from "@vueuse/core";
import { createConfigs } from "@/utils/configs";
import { useSettingsStore } from "@/stores/settings";

const { totalNodes, totalEdges, totalLayouts } = useVDA5050();
const settingsStore = useSettingsStore();
const mode = useColorMode({
  selector: "html",
  attribute: "class",
  modes: {
    dark: "dark",
    light: "",
  },
});

// Create reactive configs based on dark mode and grid settings
const config = computed(() => createConfigs(mode.value === "dark", settingsStore.showGrid));
</script>

<template>
  <div class="w-full h-full bg-background">
    <v-network-graph
      class="w-full h-full"
      :nodes="totalNodes"
      :edges="totalEdges"
      :layouts="totalLayouts"
      :configs="config"
      :zoom-level="100"
    />
  </div>
</template>

<style scoped>
/* Ensure v-network-graph takes full height */
:deep(.v-network-graph) {
  width: 100%;
  height: 100%;
}
</style>
