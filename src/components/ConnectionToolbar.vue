<script setup lang="ts">
import { useVDA5050 } from "@/composables/useVDA5050";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@iconify/vue";
import { useOfflineVisualizer } from "@/composables/useOfflineVisualizer";

const {
  brokerIp,
  brokerPort,
  connectionType,
  updateBroker,
  isElectronAvailable,
} = useVDA5050();

const { open: openOfflineVisualizer } = useOfflineVisualizer();
</script>

<template>
  <div class="flex items-center gap-2 p-2 w-full overflow-x-auto justify-between">
    <div class="flex items-center gap-2 min-w-fit">
      <Input v-model="brokerIp" placeholder="Broker IP" class="w-32 h-8" />
      <Input v-model="brokerPort" placeholder="Port" class="w-20 h-8" />

      <Select v-model="connectionType">
        <SelectTrigger class="w-32 h-8">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="websocket">WebSocket</SelectItem>
          <SelectItem v-if="isElectronAvailable" value="mqtt">MQTT</SelectItem>
        </SelectContent>
      </Select>

      <Button @click="updateBroker" size="sm" variant="outline" class="h-8">
        <Icon icon="ph:plug" class="mr-2 h-4 w-4" />
        Connect
      </Button>

      <div class="h-4 w-px bg-border mx-1" />

      <Button
        @click="openOfflineVisualizer"
        size="sm"
        variant="secondary"
        class="h-8 gap-1.5 font-medium shadow-xs"
        title="Directly visualize Order or State messages without requiring an MQTT broker"
      >
        <Icon icon="ph:cloud-slash-bold" class="h-4 w-4 text-primary" />
        <span>Offline Mode</span>
      </Button>
    </div>
  </div>
</template>
