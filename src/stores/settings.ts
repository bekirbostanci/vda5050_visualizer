import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  // Network graph settings
  const showGrid = ref<boolean>(true);

  // Actions
  function toggleGrid() {
    showGrid.value = !showGrid.value;
  }

  function setShowGrid(value: boolean) {
    showGrid.value = value;
  }

  return {
    // State
    showGrid,

    // Actions
    toggleGrid,
    setShowGrid,
  };
});
