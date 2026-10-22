import { defineStore } from "pinia";
import { ref } from "vue";

export const useLayoutStore = defineStore("layout", () => {
  const showLeftSidebar = ref(true);
  const showRightSidebar = ref(false);
  const showJsonSidebar = ref(false);
  const showSidebarOffline = ref(false);
  const showHelp = ref(false);

  // JSON viewer state - store getter function for reactive updates
  const jsonViewerData = ref<{ title: string; getData: () => any } | null>(null);

  // Left sidebar actions
  function openLeftSidebar() {
    showLeftSidebar.value = true;
  }

  function closeLeftSidebar() {
    showLeftSidebar.value = false;
  }

  function toggleLeftSidebar() {
    showLeftSidebar.value = !showLeftSidebar.value;
  }

  // Right sidebar (AGV Details) actions
  function openRightSidebar() {
    showRightSidebar.value = true;
    showJsonSidebar.value = false;
  }

  function closeRightSidebar() {
    showRightSidebar.value = false;
    showJsonSidebar.value = false;
    jsonViewerData.value = null;
  }

  function toggleRightSidebar() {
    if (showRightSidebar.value) {
      closeRightSidebar();
    } else {
      openRightSidebar();
    }
  }

  // Offline Visualizer actions
  function openOfflineSidebar() {
    showSidebarOffline.value = true;
    showLeftSidebar.value = true;
    showRightSidebar.value = false;
    showJsonSidebar.value = false;
  }

  function closeOfflineSidebar() {
    showSidebarOffline.value = false;
  }

  function toggleOfflineSidebar() {
    if (showSidebarOffline.value) {
      closeOfflineSidebar();
    } else {
      openOfflineSidebar();
    }
  }

  // JSON Viewer sidebar actions
  function openJsonSidebar(title?: string, getData?: () => any) {
    if (title && getData) {
      jsonViewerData.value = { title, getData };
    }
    showJsonSidebar.value = true;
  }

  function closeJsonSidebar() {
    showJsonSidebar.value = false;
    jsonViewerData.value = null;
  }

  function toggleJsonSidebar() {
    if (showJsonSidebar.value) {
      closeJsonSidebar();
    } else {
      showJsonSidebar.value = true;
    }
  }

  // Help overlay actions
  function toggleHelp() {
    showHelp.value = !showHelp.value;
  }

  function setHelp(value: boolean) {
    showHelp.value = value;
  }

  return {
    // State
    showLeftSidebar,
    showRightSidebar,
    showJsonSidebar,
    showSidebarOffline,
    showHelp,
    jsonViewerData,

    // Actions
    openLeftSidebar,
    closeLeftSidebar,
    toggleLeftSidebar,
    openRightSidebar,
    closeRightSidebar,
    toggleRightSidebar,
    openOfflineSidebar,
    closeOfflineSidebar,
    toggleOfflineSidebar,
    openJsonSidebar,
    closeJsonSidebar,
    toggleJsonSidebar,
    toggleHelp,
    setHelp,
  };
});
