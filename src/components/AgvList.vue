<script setup lang="ts">
import { ref, computed } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import SidebarAgvCard from "@/components/SidebarAgvCard.vue";
import { Input } from "@/components/ui/input";

const { robotList, selectedAgv, agvControllers } = useVDA5050();
const filterText = ref("");

const filteredRobots = computed(() => {
  if (!robotList.value) return [];
  let filtered = robotList.value;
  if (filterText.value) {
    filtered = filtered.filter(
      (robot) =>
        robot.serialNumber.toLowerCase().includes(filterText.value.toLowerCase()) ||
        robot.manufacturer.toLowerCase().includes(filterText.value.toLowerCase())
    );
  }
  return filtered;
});

function selectAgv(agv: any) {
  selectedAgv.value = agv;
}

function getController(agv: any) {
  const key = `${agv.manufacturer}/${agv.serialNumber}`;
  return agvControllers.value.get(key);
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="p-4 border-b flex items-center h-[68px]">
      <Input v-model="filterText" placeholder="Filter Robots..." />
    </div>
    <div class="flex-1 overflow-y-auto p-2 space-y-2 sidebar-content">
      <template v-for="agv in filteredRobots" :key="agv.serialNumber">
        <SidebarAgvCard
          v-if="getController(agv)"
          :controller="getController(agv) as any"
          :is-selected="selectedAgv?.serialNumber === agv.serialNumber"
          @select-agv="selectAgv(agv)"
        />
      </template>
      <div v-if="filteredRobots.length === 0" class="text-center text-muted-foreground p-4">
        No robots found
      </div>
    </div>
  </div>
</template>
