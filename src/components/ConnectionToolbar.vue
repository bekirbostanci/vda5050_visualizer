<script setup lang="ts">
import { useVDA5050 } from "@/composables/useVDA5050";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const { 
  brokerIp, 
  brokerPort, 
  connectionType, 
  updateBroker,
  isElectronAvailable
} = useVDA5050();
</script>

<template>
  <div class="flex items-center gap-2 p-2 w-full overflow-x-auto">
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
        Connect
      </Button>
    </div>
  </div>
</template>
