<script setup lang="ts">
import { ref } from "vue";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
  MenubarCheckboxItem,
} from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { useColorMode } from "@vueuse/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import ConnectionModal from "@/components/ConnectionModal.vue";
import SimulatorModal from "@/components/SimulatorModal.vue";
import { useSettingsStore } from "@/stores/settings";

const props = defineProps<{
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  showJsonSidebar?: boolean;
  showHelp?: boolean;
}>();

const emit = defineEmits<{
  toggleLeftSidebar: [];
  toggleRightSidebar: [];
  toggleJsonSidebar: [];
  toggleHelp: [];
}>();

// Pass { disableTransition: false } to enable transitions
const mode = useColorMode({
  selector: "html",
  attribute: "class",
  modes: {
    dark: "dark",
    light: "",
  },
});

const settingsStore = useSettingsStore();

const isConnectionModalOpen = ref(false);
const isSimulatorModalOpen = ref(false);

const openGitHub = () => {
  window.open("https://github.com/bekirbostanci/vda5050_visualizer", "_blank");
};
</script>

<template>
  <div class="flex items-center w-full border-b bg-background">
    <Menubar class="flex-1 border-0 min-w-0">
      <div class="flex items-center shrink-0">
        <img src="/bekir.svg" alt="logo" class="w-7 h-7" />
      </div>
      <MenubarMenu>
        <MenubarTrigger
          class="font-normal text-sm px-2 md:px-3"
          @click="isConnectionModalOpen = true"
          >Connect</MenubarTrigger
        >
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger
          class="font-normal text-sm px-2 md:px-3"
          @click="isSimulatorModalOpen = true"
          >Simulator</MenubarTrigger
        >
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger class="font-normal text-sm px-2 md:px-3"
          >View</MenubarTrigger
        >
        <MenubarContent>
          <MenubarCheckboxItem
            :checked="settingsStore.showGrid"
            @update:checked="(checked) => settingsStore.setShowGrid(checked)"
          >
            Show Grid
          </MenubarCheckboxItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger class="font-normal text-sm px-2 md:px-3"
          >Help</MenubarTrigger
        >
        <MenubarContent>
          <MenubarItem @click="emit('toggleHelp')">
            <Icon icon="ph:question" class="mr-2 h-4 w-4" />
            <span :class="{ 'font-semibold': props.showHelp }">
              {{ props.showHelp ? "Hide Help Page" : "Show Help Page" }}
            </span>
          </MenubarItem>
          <MenubarItem @click="openGitHub">
            <Icon icon="ph:github-logo" class="mr-2 h-4 w-4" />
            <span>GitHub Repository</span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>

    <!-- Desktop: Show all icon buttons -->
    <div class="hidden md:flex items-center gap-2 px-2 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="h-8 w-8 relative">
            <Icon
              icon="radix-icons:moon"
              class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
            />
            <Icon
              icon="radix-icons:sun"
              class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
            />
            <span class="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="mode = 'light'"> Light </DropdownMenuItem>
          <DropdownMenuItem @click="mode = 'dark'"> Dark </DropdownMenuItem>
          <DropdownMenuItem @click="mode = 'auto'"> System </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :title="showLeftSidebar ? 'Hide Left Sidebar' : 'Show Left Sidebar'"
        @click="$emit('toggleLeftSidebar')"
      >
        <Icon
          icon="ph:sidebar-simple"
          :class="showLeftSidebar ? 'opacity-100' : 'opacity-50'"
          :height="18"
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :title="
          showRightSidebar
            ? 'Hide AGV Details Sidebar'
            : 'Show AGV Details Sidebar'
        "
        @click="$emit('toggleRightSidebar')"
      >
        <Icon
          icon="ph:sidebar-simple"
          :class="[
            'scale-x-[-1]',
            showRightSidebar ? 'opacity-100' : 'opacity-50',
          ]"
          :height="18"
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :title="
          showJsonSidebar
            ? 'Hide JSON Viewer Sidebar'
            : 'Show JSON Viewer Sidebar'
        "
        @click="$emit('toggleJsonSidebar')"
      >
        <Icon
          icon="material-symbols:code"
          :class="showJsonSidebar ? 'opacity-100' : 'opacity-50'"
          :height="18"
        />
      </Button>
    </div>

    <!-- Mobile: Dropdown menu with all options -->
    <div class="flex md:hidden items-center px-2 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="h-8 w-8">
            <Icon icon="ph:dots-three-vertical-bold" :height="20" />
            <span class="sr-only">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-52">
          <DropdownMenuItem @click="$emit('toggleLeftSidebar')">
            <Icon
              icon="ph:sidebar-simple"
              class="mr-2 h-4 w-4"
              :class="showLeftSidebar ? 'opacity-100' : 'opacity-50'"
            />
            <span>{{ showLeftSidebar ? "Hide" : "Show" }} Left Sidebar</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="$emit('toggleRightSidebar')">
            <Icon
              icon="ph:sidebar-simple"
              class="mr-2 h-4 w-4 scale-x-[-1]"
              :class="showRightSidebar ? 'opacity-100' : 'opacity-50'"
            />
            <span>{{ showRightSidebar ? "Hide" : "Show" }} AGV Details</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="$emit('toggleJsonSidebar')">
            <Icon
              icon="material-symbols:code"
              class="mr-2 h-4 w-4"
              :class="showJsonSidebar ? 'opacity-100' : 'opacity-50'"
            />
            <span>{{ showJsonSidebar ? "Hide" : "Show" }} JSON Viewer</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="mode = 'light'">
            <Icon icon="radix-icons:sun" class="mr-2 h-4 w-4" />
            <span>Light Mode</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="mode = 'dark'">
            <Icon icon="radix-icons:moon" class="mr-2 h-4 w-4" />
            <span>Dark Mode</span>
          </DropdownMenuItem>
          <DropdownMenuItem @click="mode = 'auto'">
            <Icon icon="ph:monitor" class="mr-2 h-4 w-4" />
            <span>System Theme</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <ConnectionModal v-model:open="isConnectionModalOpen" />
    <SimulatorModal v-model:open="isSimulatorModalOpen" />
  </div>
</template>

<style scoped>
#top-bar {
  z-index: 10;
}
</style>
