<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { RouterView } from 'vue-router';
import Toaster from '@/components/ui/toast/Toaster.vue';
import { Analytics } from '@vercel/analytics/vue';
import TopBar from '@/components/TopBar.vue';
import ToolBar from '@/components/ToolBar.vue';
import SideBar from '@/components/SideBar.vue';
import AgvDetailsSidebar from '@/components/AgvDetailsSidebar.vue';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import NetworkGraph from "@/components/NetworkGraph.vue";
import HelpPage from "@/components/HelpPage.vue";
import { useVDA5050 } from '@/composables/useVDA5050';
import { useColorMode } from '@vueuse/core';

const showLeftSidebar = ref(true);
const showRightSidebar = ref(false);
const viewMode = ref<'dashboard' | 'visualizer'>('dashboard');
const showHelp = ref(false);

const { selectedAgv } = useVDA5050();

// Color mode management
const mode = useColorMode({
  selector: 'html',
  attribute: 'class',
  modes: {
    dark: 'dark',
    light: '',
  },
});

// Automatically show sidebar when an AGV is selected
watch(selectedAgv, (newAgv) => {
  if (newAgv) {
    showRightSidebar.value = true;
  }
});

// Computed sizes for panels
// Robot list (left sidebar) defaults to 25%
const leftPanelSize = computed(() => showLeftSidebar.value ? 25 : 0);
// JSON sidebar (right sidebar) defaults to 25% when robot is selected
const rightPanelSize = computed(() => showRightSidebar.value ? 25 : 0);
// Center panel takes remaining space
const centerPanelSize = computed(() => {
  if (showLeftSidebar.value && showRightSidebar.value) return 50;
  if (showLeftSidebar.value || showRightSidebar.value) return 75;
  return 100;
});

const toggleLeftSidebar = () => {
  showLeftSidebar.value = !showLeftSidebar.value;
};

const toggleRightSidebar = () => {
  showRightSidebar.value = !showRightSidebar.value;
};

const toggleView = () => {
  const newMode = viewMode.value === 'dashboard' ? 'visualizer' : 'dashboard';
  viewMode.value = newMode;
  // Set light mode when switching to visualizer (old design only works with light mode)
  if (newMode === 'visualizer') {
    mode.value = 'light';
  }
};
</script>

<template>
  <Analytics />
  <Toaster />
  <div class="h-screen flex flex-col bg-background text-foreground">
    <TopBar
      :show-left-sidebar="showLeftSidebar"
      :show-right-sidebar="showRightSidebar"
      :view-mode="viewMode"
      :show-help="showHelp"
      @toggle-left-sidebar="toggleLeftSidebar"
      @toggle-right-sidebar="toggleRightSidebar"
      @toggle-view="toggleView"
      @toggle-help="showHelp = !showHelp"
    />
    <template v-if="viewMode === 'dashboard'">
      <ToolBar />
      <div class="flex-1 flex overflow-hidden">
        <ResizablePanelGroup 
          direction="horizontal" 
          class="flex-1"
          :key="`panels-${showLeftSidebar}-${showRightSidebar}`"
        >
          <ResizablePanel
            :default-size="leftPanelSize"
            :min-size="0"
            :max-size="showLeftSidebar ? 50 : 0"
            :collapsible="true"
            class="hidden md:block"
          >
            <SideBar v-show="showLeftSidebar" />
          </ResizablePanel>
          <ResizableHandle 
            v-show="showLeftSidebar" 
            class="hidden md:block"
          />
          <ResizablePanel
            :default-size="rightPanelSize"
            :min-size="0"
            :max-size="showRightSidebar ? 50 : 0"
            :collapsible="true"
            class="hidden md:block"
          >
            <AgvDetailsSidebar v-show="showRightSidebar" @close="toggleRightSidebar" />
          </ResizablePanel>
          <ResizableHandle 
            v-show="showRightSidebar" 
            class="hidden md:block"
          />
          <ResizablePanel 
            :default-size="centerPanelSize"
            :min-size="30"
          >
            <div class="h-full p-0 overflow-hidden">
              <HelpPage v-if="showHelp" @close="showHelp = false" />
              <NetworkGraph v-else />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </template>
    <template v-else>
      <RouterView />
    </template>
  </div>
</template>

<style scoped></style>
