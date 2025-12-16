<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@iconify/vue";
import { useToast } from "@/components/ui/toast";
import { useMqttStore } from "@/stores/mqtt";
import type { ClientOptions } from "vda-5050-lib";
import {
  simulatorAgvs,
  createSimulatorAgv,
  createRandomVdaOrder,
  pauseSimulatorAgv,
  resumeSimulatorAgv,
  removeSimulatorAgv,
  clearAllSimulatorAgvs,
} from "@/controllers/simulator.controller";

const props = defineProps<{
  open: boolean;
}>();

const emits = defineEmits<{
  "update:open": [value: boolean];
}>();

const { toast } = useToast();
const mqttStore = useMqttStore();

// Track paused robots
const pausedRobots = ref<string[]>([]);

// Form state - WebSocket for browser support
const form = ref({
  websocketProtocol: "ws",
  mqttAddress: "localhost",
  mqttPort: "14520",
  vdaInterface: "uagv",
  vdaVersion: "2.0.0" as "2.0.0" | "1.1.0",
  vehicleName: "sim_robot_",
  vehicleCount: 1,
  vehicleMapId: "map1",
});

const isCreating = ref(false);
const activeTab = ref("create");

// Load settings from mqtt store when available
const loadFromMqttStore = () => {
  if (mqttStore.config.brokerIp) {
    form.value.mqttAddress = mqttStore.config.brokerIp;
  }
  if (mqttStore.config.brokerPort) {
    form.value.mqttPort = mqttStore.config.brokerPort;
  }
  if (mqttStore.config.interfaceName) {
    form.value.vdaInterface = mqttStore.config.interfaceName;
  }
};

// Create client options for simulator
function createClientOptions(): ClientOptions {
  return {
    interfaceName: form.value.vdaInterface,
    vdaVersion: form.value.vdaVersion,
    transport: {
      brokerUrl: `${form.value.websocketProtocol}://${form.value.mqttAddress}:${form.value.mqttPort}`,
    },
  };
}

// Create simulators
async function handleCreateSimulators() {
  if (form.value.vdaVersion !== "2.0.0" && form.value.vdaVersion !== "1.1.0") {
    toast({
      title: "Error",
      description: "VDA Version must be 2.0.0 or 1.1.0",
      variant: "destructive",
    });
    return;
  }

  isCreating.value = true;

  try {
    const clientOptions = createClientOptions();

    for (let i = 0; i < form.value.vehicleCount; i++) {
      await createSimulatorAgv(
        form.value.vehicleName + (i + 1),
        form.value.vehicleMapId,
        0,
        i,
        clientOptions
      );
    }

    toast({
      title: "Simulators Created",
      description: `Created ${form.value.vehicleCount} simulator vehicle(s)`,
    });

    // Switch to list tab after creation
    activeTab.value = "list";
  } catch (error: any) {
    console.error("Error creating simulators:", error);
    const errorMessage =
      error?.message ||
      error?.toString() ||
      `Failed to connect to MQTT broker at ${form.value.websocketProtocol}://${form.value.mqttAddress}:${form.value.mqttPort}. Please ensure your MQTT broker is running and WebSocket is enabled.`;
    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    isCreating.value = false;
  }
}

// Handle random order
async function handleRandomOrder(agv: any) {
  try {
    await createRandomVdaOrder(agv);
    toast({
      title: "Order Created",
      description: `Random order sent to ${agv.controller.agvId.serialNumber}`,
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to create random order",
      variant: "destructive",
    });
  }
}

// Handle pause
function handlePause(agv: any) {
  agv.controller.stop();
  pausedRobots.value.push(agv.controller.agvId.serialNumber);
}

// Handle resume
function handleResume(agv: any) {
  agv.controller.start();
  const index = pausedRobots.value.indexOf(agv.controller.agvId.serialNumber);
  if (index > -1) {
    pausedRobots.value.splice(index, 1);
  }
}

// Handle remove
function handleRemove(agv: any) {
  const index = simulatorAgvs.value.indexOf(agv);
  if (index > -1) {
    simulatorAgvs.value.splice(index, 1);
  }
  agv.controller.stop();
}

// Handle clear all
function handleClearAll() {
  clearAllSimulatorAgvs();
  pausedRobots.value = [];
  toast({
    title: "Cleared",
    description: "All simulators have been removed",
  });
}

// Check if robot is paused
function isPaused(serialNumber: string): boolean {
  return pausedRobots.value.includes(serialNumber);
}

const hasSimulators = computed(() => simulatorAgvs.value.length > 0);
</script>

<template>
  <Dialog :open="open" @update:open="emits('update:open', $event)">
    <DialogContent class="sm:max-w-[700px] max-h-[85vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon icon="mdi:robot" class="h-5 w-5" />
          VDA5050 Simulator
        </DialogTitle>
        <DialogDescription>
          Manage and create VDA5050 simulators. Simulators run in the browser
          via WebSocket and will be destroyed when the tab is closed.
        </DialogDescription>
      </DialogHeader>

      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <Icon icon="mdi:plus-circle" class="mr-2 h-4 w-4" />
            Create
          </TabsTrigger>
          <TabsTrigger value="list">
            <Icon icon="mdi:format-list-bulleted" class="mr-2 h-4 w-4" />
            Simulators
            <span
              v-if="hasSimulators"
              class="ml-2 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs"
            >
              {{ simulatorAgvs.length }}
            </span>
          </TabsTrigger>
        </TabsList>

        <!-- Create Tab -->
        <TabsContent
          value="create"
          class="mt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-2"
        >
          <div>
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
              <Icon icon="mdi:connection" class="h-4 w-4" />
              WebSocket Connection Settings
            </h3>
            <p class="text-xs text-muted-foreground mb-4">
              Web browsers don't support native MQTT. Please use WebSocket (ws
              or wss) and enable your MQTT broker's WebSocket feature.
            </p>

            <div class="grid gap-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="websocketProtocol">Protocol</Label>
                  <Select v-model="form.websocketProtocol">
                    <SelectTrigger id="websocketProtocol">
                      <SelectValue :placeholder="form.websocketProtocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ws">ws</SelectItem>
                      <SelectItem value="wss">wss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="vdaInterface">VDA Interface</Label>
                  <Input
                    id="vdaInterface"
                    v-model="form.vdaInterface"
                    placeholder="uagv"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="mqttAddress">MQTT Address</Label>
                  <Input
                    id="mqttAddress"
                    v-model="form.mqttAddress"
                    placeholder="localhost"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="mqttPort">WebSocket Port</Label>
                  <Input
                    id="mqttPort"
                    v-model="form.mqttPort"
                    placeholder="14520"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 class="text-sm font-semibold mb-3 flex items-center gap-2">
              <Icon icon="mdi:robot-industrial" class="h-4 w-4" />
              Vehicle Settings
            </h3>

            <div class="grid gap-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="vehicleName">Vehicle Name Prefix</Label>
                  <Input
                    id="vehicleName"
                    v-model="form.vehicleName"
                    placeholder="sim_robot_"
                  />
                </div>
                <div class="space-y-2">
                  <Label for="vehicleCount">Number of Vehicles</Label>
                  <Input
                    id="vehicleCount"
                    v-model.number="form.vehicleCount"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="1"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="vdaVersion">VDA Version</Label>
                  <Select v-model="form.vdaVersion">
                    <SelectTrigger id="vdaVersion">
                      <SelectValue :placeholder="form.vdaVersion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2.0.0">2.0.0</SelectItem>
                      <SelectItem value="1.1.0">1.1.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="space-y-2">
                  <Label for="vehicleMapId">Map ID</Label>
                  <Input
                    id="vehicleMapId"
                    v-model="form.vehicleMapId"
                    placeholder="map1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-2">
            <Button variant="outline" size="sm" @click="loadFromMqttStore">
              <Icon icon="mdi:content-copy" class="mr-2 h-4 w-4" />
              Load from Connection
            </Button>
            <Button @click="handleCreateSimulators" :disabled="isCreating">
              <Icon
                v-if="isCreating"
                icon="mdi:loading"
                class="mr-2 h-4 w-4 animate-spin"
              />
              <Icon v-else icon="mdi:plus" class="mr-2 h-4 w-4" />
              {{ isCreating ? "Creating..." : "Create Simulators" }}
            </Button>
          </div>
        </TabsContent>

        <!-- List Tab -->
        <TabsContent value="list" class="mt-4">
          <div v-if="hasSimulators" class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-muted-foreground">
                {{ simulatorAgvs.length }} simulator(s) running
              </span>
              <Button variant="destructive" size="sm" @click="handleClearAll">
                <Icon icon="mdi:delete-sweep" class="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>

            <div class="max-h-[45vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead class="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="agv in simulatorAgvs"
                    :key="agv.controller.agvId.serialNumber"
                  >
                    <TableCell class="font-medium">
                      {{ agv.controller.agvId.serialNumber }}
                    </TableCell>
                    <TableCell>
                      {{ agv.controller.agvId.manufacturer }}
                    </TableCell>
                    <TableCell>
                      {{ agv.controller.clientOptions.vdaVersion }}
                    </TableCell>
                    <TableCell>
                      <span
                        :class="[
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          isPaused(agv.controller.agvId.serialNumber)
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                        ]"
                      >
                        <span
                          :class="[
                            'w-1.5 h-1.5 rounded-full mr-1.5',
                            isPaused(agv.controller.agvId.serialNumber)
                              ? 'bg-yellow-500'
                              : 'bg-green-500',
                          ]"
                        />
                        {{
                          isPaused(agv.controller.agvId.serialNumber)
                            ? "Stopped"
                            : "Running"
                        }}
                      </span>
                    </TableCell>
                    <TableCell class="text-right">
                      <div class="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8"
                          title="Send Random Order"
                          @click="handleRandomOrder(agv)"
                        >
                          <Icon icon="mdi:shuffle" class="h-4 w-4" />
                        </Button>
                        <Button
                          v-if="isPaused(agv.controller.agvId.serialNumber)"
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8"
                          title="Resume"
                          @click="handleResume(agv)"
                        >
                          <Icon icon="mdi:play" class="h-4 w-4" />
                        </Button>
                        <Button
                          v-else
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8"
                          title="Stop"
                          @click="handlePause(agv)"
                        >
                          <Icon icon="material-symbols:stop" class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-8 w-8 text-destructive hover:text-destructive"
                          title="Remove"
                          @click="handleRemove(agv)"
                        >
                          <Icon icon="mdi:delete-outline" class="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <Card v-else class="border-dashed">
            <CardContent
              class="flex flex-col items-center justify-center py-12 text-center"
            >
              <Icon
                icon="mdi:robot-off"
                class="h-12 w-12 text-muted-foreground mb-4"
              />
              <h3 class="text-lg font-semibold mb-2">No Simulators</h3>
              <p class="text-sm text-muted-foreground mb-4">
                No simulation robots available. Create one to get started.
              </p>
              <Button variant="outline" @click="activeTab = 'create'">
                <Icon icon="mdi:plus" class="mr-2 h-4 w-4" />
                Create Simulator
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
