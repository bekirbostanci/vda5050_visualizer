<script setup lang="ts">
import { ref, computed } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import SidebarAgvCard from "@/components/SidebarAgvCard.vue";
import SidebarAgvListItem from "@/components/SidebarAgvListItem.vue";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import ConnectionModal from "@/components/ConnectionModal.vue";

const { robotList, selectedAgv, agvControllers } = useVDA5050();
const filterText = ref("");
const isConnectionModalOpen = ref(false);
const viewMode = ref<"card" | "list">("card");

const filteredRobots = computed(() => {
  if (!robotList.value) return [];
  let filtered = robotList.value;
  if (filterText.value) {
    filtered = filtered.filter(
      (robot) =>
        robot.serialNumber
          .toLowerCase()
          .includes(filterText.value.toLowerCase()) ||
        robot.manufacturer
          .toLowerCase()
          .includes(filterText.value.toLowerCase())
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
    <div class="p-4 border-b flex items-center gap-2 h-[68px]">
      <Input
        v-model="filterText"
        placeholder="Filter Robots..."
        class="flex-1"
      />
      <div class="flex items-center gap-1 border rounded-lg p-1">
        <button
          @click="viewMode = 'card'"
          :class="[
            'p-2 rounded transition-colors',
            viewMode === 'card'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted',
          ]"
          title="Card View"
        >
          <Icon icon="ph:grid-four" class="h-4 w-4" />
        </button>
        <button
          @click="viewMode = 'list'"
          :class="[
            'p-2 rounded transition-colors',
            viewMode === 'list'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted',
          ]"
          title="List View"
        >
          <Icon icon="ph:list" class="h-4 w-4" />
        </button>
      </div>
    </div>
    <div
      class="flex-1 overflow-y-auto p-4 sidebar-content"
      :class="viewMode === 'card' ? 'space-y-2' : 'space-y-1'"
    >
      <!-- Card View -->
      <template v-if="viewMode === 'card'">
        <template v-for="agv in filteredRobots" :key="agv.serialNumber">
          <SidebarAgvCard
            v-if="getController(agv)"
            :controller="getController(agv) as any"
            :is-selected="selectedAgv?.serialNumber === agv.serialNumber"
            @select-agv="selectAgv(agv)"
          />
        </template>
      </template>

      <!-- List View -->
      <template v-else>
        <template v-for="agv in filteredRobots" :key="agv.serialNumber">
          <SidebarAgvListItem
            v-if="getController(agv)"
            :agv="agv"
            :controller="getController(agv) as any"
            :is-selected="selectedAgv?.serialNumber === agv.serialNumber"
            @select-agv="selectAgv(agv)"
          />
        </template>
      </template>
      <div
        v-if="filteredRobots.length === 0"
        class="flex items-center justify-center min-h-[200px]"
      >
        <Card
          class="w-full max-w-sm border-2 border-dashed border-muted-foreground/20 bg-muted/30 hover:bg-muted/50"
        >
          <CardHeader class="text-center">
            <div class="flex justify-center mb-4">
              <div class="rounded-full bg-muted p-3">
                <Icon icon="ph:robot" class="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <CardTitle class="text-lg">No Robots Found</CardTitle>
            <CardDescription class="mt-2">
              Connect to an MQTT broker to discover and monitor VDA5050 robots.
              Once connected, robots will appear in this list.
            </CardDescription>
          </CardHeader>
          <CardContent class="pt-0">
            <Button class="w-full" @click="isConnectionModalOpen = true">
              <Icon icon="ph:plug" class="mr-2 h-4 w-4" />
              Connect Broker
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    <ConnectionModal v-model:open="isConnectionModalOpen" />
  </div>
</template>
