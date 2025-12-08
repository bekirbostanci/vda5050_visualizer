<script setup lang="ts">
import { useVDA5050 } from "@/composables/useVDA5050";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { computed, unref } from "vue";

const { selectedAgv, agvControllers } = useVDA5050();

const selectedAgvData = computed(() => {
  if (!selectedAgv.value) return null;

  const key = `${selectedAgv.value.manufacturer}/${selectedAgv.value.serialNumber}`;
  const controller = agvControllers.value.get(key);

  if (!controller) return null;

  // Return a structured object with relevant info
  return {
    agvId: controller.agvId,
    connection: unref(controller.connectionInfo),
    state: unref(controller.stateInfo),
    order: unref(controller.orderInfo),
    visualization: unref(controller.visualizationInfo),
    instantActions: unref(controller.instantActionsInfo),
    // We can also include nodes/edges if needed, but they might be large
  };
});
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b font-semibold">Selected AGV</div>
    <div class="flex-1 overflow-auto p-4">
      <div v-if="selectedAgvData">
        <vue-json-pretty :data="selectedAgvData" :deep="2" />
      </div>
      <div v-else class="text-muted-foreground text-center mt-10">
        Select an AGV to view details
      </div>
    </div>
  </div>
</template>
