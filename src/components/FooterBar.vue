<script setup lang="ts">
import { Menubar, MenubarMenu, MenubarLabel } from "@/components/ui/menubar";
</script>

<template>
  <Menubar>
    <MenubarMenu>
      <MenubarLabel>Status: Ready</MenubarLabel>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarLabel>Dashboard Template</MenubarLabel>
    </MenubarMenu>
  </Menubar>
</template>
<style scoped>
#top-bar {
  background-color: white;
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
