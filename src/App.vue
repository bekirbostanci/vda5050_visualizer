<script setup lang="ts">
import { ref, watch, computed } from "vue";
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

const showLeftSidebar = ref(true);
const showRightSidebar = ref(false);
const showJsonSidebar = ref(false);
const showHelp = ref(false);

// JSON viewer state - store getter function for reactive updates
const jsonViewerData = ref<{ title: string; getData: () => any } | null>(null);

const { selectedAgv } = useVDA5050();

// Automatically show sidebar when an AGV is selected
watch(
  selectedAgv,
  (newAgv) => {
    if (newAgv) {
      showRightSidebar.value = true;
    }
  },
  { immediate: true }
);

// JSON viewer panel size (within right panel)
const jsonViewerPanelSize = computed(() => (showJsonSidebar.value ? 50 : 0));
// Map panel size (within right panel)
const mapPanelSize = computed(() => (showJsonSidebar.value ? 50 : 100));

const toggleLeftSidebar = () => {
  showLeftSidebar.value = !showLeftSidebar.value;
};

const toggleRightSidebar = () => {
  showRightSidebar.value = !showRightSidebar.value;
  // Close JSON sidebar if AGV details sidebar is closed
  if (!showRightSidebar.value) {
    showJsonSidebar.value = false;
    jsonViewerData.value = null;
  }
};

const toggleJsonSidebar = () => {
  showJsonSidebar.value = !showJsonSidebar.value;
  if (!showJsonSidebar.value) {
    jsonViewerData.value = null;
  }
};

const handleShowJson = (title: string, getData: () => any) => {
  jsonViewerData.value = { title, getData };
  showJsonSidebar.value = true;
};

const handleCloseJsonSidebar = () => {
  showJsonSidebar.value = false;
  jsonViewerData.value = null;
};
</script>

<template>
  <Analytics />
  <Toaster />
  <div class="h-screen flex flex-col bg-background text-foreground">
    <TopBar
      :show-left-sidebar="showLeftSidebar"
      :show-right-sidebar="showRightSidebar"
      :show-json-sidebar="showJsonSidebar"
      :show-help="showHelp"
      @toggle-left-sidebar="toggleLeftSidebar"
      @toggle-right-sidebar="toggleRightSidebar"
      @toggle-json-sidebar="toggleJsonSidebar"
      @toggle-help="showHelp = !showHelp"
    />
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
              @close="toggleRightSidebar"
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
              <HelpPage v-if="showHelp" @close="showHelp = false" />
              <NetworkGraph v-else />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
