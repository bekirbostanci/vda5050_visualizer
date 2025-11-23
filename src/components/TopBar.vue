<script setup lang="ts">
import { ref } from 'vue';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
  MenubarCheckboxItem,
} from '@/components/ui/menubar';
import {Button} from '@/components/ui/button';
import {Icon} from '@iconify/vue';
import {useColorMode} from '@vueuse/core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ConnectionModal from '@/components/ConnectionModal.vue';
import { useSettingsStore } from '@/stores/settings';

const props = defineProps<{
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  viewMode?: 'dashboard' | 'visualizer';
  showHelp?: boolean;
}>();

const emit = defineEmits<{
  toggleLeftSidebar: [];
  toggleRightSidebar: [];
  toggleView: [];
  toggleHelp: [];
}>();

// Pass { disableTransition: false } to enable transitions
const mode = useColorMode({
  selector: 'html',
  attribute: 'class',
  modes: {
    dark: 'dark',
    light: '',
  },
});

const settingsStore = useSettingsStore();

const isConnectionModalOpen = ref(false);

const openGitHub = () => {
  window.open('https://github.com/bekirbostanci/vda5050_visualizer', '_blank');
};
</script>

<template>
  <div class="flex items-center w-full border-b bg-background">
    <Menubar class="flex-1 border-0">
      <div class="flex items-center">
        <img src="/bekir.svg" alt="logo" class="w-7 h-7" />
      </div>
      <MenubarMenu>
        <MenubarTrigger class="font-normal" @click="isConnectionModalOpen = true">Connect</MenubarTrigger>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger class="font-normal">View</MenubarTrigger>
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
        <MenubarTrigger class="font-normal">Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem @click="emit('toggleHelp')">
            <Icon icon="ph:question" class="mr-2 h-4 w-4" />
            <span :class="{ 'font-semibold': props.showHelp }">
              {{ props.showHelp ? 'Hide Help Page' : 'Show Help Page' }}
            </span>
          </MenubarItem>
          <MenubarItem @click="openGitHub">
            <Icon icon="ph:github-logo" class="mr-2 h-4 w-4" />
            <span>GitHub Repository</span>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
    <div class="flex items-center gap-2 px-2 shrink-0">
      <DropdownMenu v-if="viewMode === 'dashboard'">
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
        :title="showRightSidebar ? 'Hide Right Sidebar' : 'Show Right Sidebar'"
        @click="$emit('toggleRightSidebar')"
      >
        <Icon
          icon="ph:sidebar-simple"
          :class="[
            'scale-x-[-1]',
            showRightSidebar ? 'opacity-100' : 'opacity-50'
          ]"
          :height="18"
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :title="viewMode === 'dashboard' ? 'Switch to Visualizer View' : 'Switch to Dashboard View'"
        @click="$emit('toggleView')"
      >
        <Icon
          :icon="viewMode === 'dashboard' ? 'ph:layout' : 'ph:code'"
          :height="18"
        />
      </Button>
    </div>
    <ConnectionModal v-model:open="isConnectionModalOpen" />
  </div>
</template>
<style scoped>
#top-bar {
  z-index: 10;
}

@media (min-width: 768px) {
  .hide-on-desktop {
    display: none;
  }
}

@media (max-width: 767px) {
  .hide-on-mobile {
    display: none;
  }
}
</style>
