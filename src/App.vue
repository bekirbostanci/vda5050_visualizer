<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import Toaster from "@/components/ui/toast/Toaster.vue";
import { Analytics } from "@vercel/analytics/vue";
import TopBar from "@/components/TopBar.vue";
import ToolBar from "@/components/ToolBar.vue";
import SideBar from "@/components/SideBar.vue";
import AgvDetailsSidebar from "@/components/AgvDetailsSidebar.vue";
import JsonViewerSidebar from "@/components/JsonViewerSidebar.vue";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import NetworkGraph from "@/components/NetworkGraph.vue";
import HelpPage from "@/components/HelpPage.vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import { useLayoutStore } from "@/stores/layout";

const layoutStore = useLayoutStore();
const {
  showLeftSidebar,
  showRightSidebar,
  showJsonSidebar,
  showSidebarOffline,
  showHelp,
  jsonViewerData,
} = storeToRefs(layoutStore);

const { selectedAgv } = useVDA5050();

// Automatically show sidebar when an AGV is selected
watch(
  selectedAgv,
  (newAgv) => {
    if (newAgv && !showSidebarOffline.value) {
      layoutStore.openRightSidebar();
    }
  },
  { immediate: true }
);

// JSON viewer panel size (within right panel)
const jsonViewerPanelSize = computed(() => (showJsonSidebar.value ? 50 : 0));
// Map panel size (within right panel)
const mapPanelSize = computed(() => (showJsonSidebar.value ? 50 : 100));

const handleShowJson = (title: string, getData: () => any) => {
  layoutStore.openJsonSidebar(title, getData);
};

const handleCloseJsonSidebar = () => {
  layoutStore.closeJsonSidebar();
};
</script>

<template>
  <Analytics />
  <Toaster />
  <div class="h-screen flex flex-col bg-background text-foreground">
    <TopBar />
    <ToolBar />
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Panel: AGV List + AGV Details (fixed sizes, not resizable) -->
      <div
        v-if="showLeftSidebar || showRightSidebar"
        class="hidden md:flex h-full flex-shrink-0"
      >
        <div class="h-full flex overflow-hidden">
          <!-- AGV List (fixed width) -->
          <div
            v-if="showLeftSidebar"
            class="hidden md:block w-[450px] flex-shrink-0 border-r"
          >
            <SideBar />
          </div>
          <!-- AGV Details (fixed width) -->
          <div
            v-if="showRightSidebar"
            class="hidden md:block w-[450px] flex-shrink-0 border-r"
          >
            <AgvDetailsSidebar
              @close="layoutStore.closeRightSidebar"
              @show-json="handleShowJson"
            />
          </div>
        </div>
      </div>
      <!-- Right Panel: JSON Viewer + Map (resizable between them) -->
      <div class="flex-1 h-full min-w-0">
        <ResizablePanelGroup
          direction="horizontal"
          class="h-full"
          :key="`json-panels-${showJsonSidebar}`"
        >
          <!-- JSON Viewer Sidebar (resizable) -->
          <ResizablePanel
            v-if="showJsonSidebar"
            :default-size="jsonViewerPanelSize"
            :collapsible="true"
            class="hidden md:block"
          >
            <JsonViewerSidebar
              v-if="jsonViewerData"
              :title="jsonViewerData.title"
              :get-data="jsonViewerData.getData"
              @close="handleCloseJsonSidebar"
            />
          </ResizablePanel>
          <ResizableHandle v-show="showJsonSidebar" class="hidden md:block" />
          <!-- Map/Network Graph -->
          <ResizablePanel :default-size="mapPanelSize">
            <div class="h-full p-0 overflow-hidden">
              <HelpPage v-if="showHelp" @close="layoutStore.setHelp(false)" />
              <NetworkGraph v-else />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
