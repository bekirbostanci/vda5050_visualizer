<script setup lang="ts">
import { ref, computed } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/vue";
import { useToast } from "@/components/ui/toast";
import { useOfflineVisualizer } from "@/composables/useOfflineVisualizer";
import { useVDA5050 } from "@/composables/useVDA5050";

const emit = defineEmits<{
  close: [];
}>();

const {
  visualizeOffline,
  closeSidebarOffline,
  orderJson,
  stateJson,
  activeTab,
  editRobot,
  resetEditor,
} = useOfflineVisualizer();
const { robotList } = useVDA5050();
const { toast } = useToast();

const autoSetStateFromOrder = ref(true);

const orderError = ref("");
const stateError = ref("");

// Pre-defined sample Order
const sampleOrder = {
  headerId: 1,
  timestamp: new Date().toISOString(),
  version: "2.0.0",
  manufacturer: "OfflineFleet",
  serialNumber: "robot_alpha",
  orderId: `order_${Date.now().toString().slice(-6)}`,
  orderUpdateId: 0,
  zoneSetId: "zone_warehouse_A",
  nodes: [
    {
      nodeId: "node_01",
      sequenceId: 0,
      released: true,
      actions: [],
      nodePosition: {
        x: 0,
        y: 0,
        mapId: "warehouse_main",
      },
    },
    {
      nodeId: "node_02",
      sequenceId: 2,
      released: true,
      actions: [
        {
          actionId: "act_pick_1",
          actionType: "pick",
          blockingType: "HARD",
          actionDescription: "Pick cargo crate",
        },
      ],
      nodePosition: {
        x: 8,
        y: 0,
        mapId: "warehouse_main",
      },
    },
    {
      nodeId: "node_03",
      sequenceId: 4,
      released: true,
      actions: [],
      nodePosition: {
        x: 8,
        y: 6,
        mapId: "warehouse_main",
      },
    },
    {
      nodeId: "node_04",
      sequenceId: 6,
      released: true,
      actions: [
        {
          actionId: "act_drop_1",
          actionType: "drop",
          blockingType: "HARD",
          actionDescription: "Drop cargo at discharge bay",
        },
      ],
      nodePosition: {
        x: 0,
        y: 6,
        mapId: "warehouse_main",
      },
    },
  ],
  edges: [
    {
      edgeId: "edge_01",
      sequenceId: 1,
      released: true,
      startNodeId: "node_01",
      endNodeId: "node_02",
      actions: [],
    },
    {
      edgeId: "edge_02",
      sequenceId: 3,
      released: true,
      startNodeId: "node_02",
      endNodeId: "node_03",
      actions: [],
    },
    {
      edgeId: "edge_03",
      sequenceId: 5,
      released: true,
      startNodeId: "node_03",
      endNodeId: "node_04",
      actions: [],
    },
  ],
};

// Pre-defined sample State
const sampleState = {
  headerId: 1,
  timestamp: new Date().toISOString(),
  version: "2.0.0",
  manufacturer: "OfflineFleet",
  serialNumber: "robot_alpha",
  orderId: `order_${Date.now().toString().slice(-6)}`,
  orderUpdateId: 0,
  lastNodeId: "node_02",
  lastNodeSequenceId: 2,
  nodeStates: [],
  edgeStates: [],
  agvPosition: {
    x: 8.0,
    y: 0.0,
    theta: 1.57,
    mapId: "warehouse_main",
    positionInitialized: true,
  },
  velocity: {
    vx: 0.0,
    vy: 0.0,
    omega: 0.0,
  },
  loads: [
    {
      loadId: "pallet_99",
      loadType: "standard_euro",
      loadPosition: "front",
    },
  ],
  driving: false,
  paused: false,
  newBaseRequest: false,
  distanceSinceLastNode: 0.0,
  actionStates: [
    {
      actionId: "act_pick_1",
      actionType: "pick",
      actionStatus: "FINISHED",
    },
  ],
  batteryState: {
    batteryCharge: 88.5,
    batteryVoltage: 48.2,
    charging: false,
  },
  operatingMode: "AUTOMATIC",
  errors: [],
  information: [
    {
      infoType: "SYSTEM_OK",
      infoDescription: "AGV operating normally in offline visualization",
    },
  ],
  safetyState: {
    eStop: "none",
    fieldViolation: false,
  },
};

// Initialize with samples
orderJson.value = JSON.stringify(sampleOrder, null, 2);
stateJson.value = JSON.stringify(sampleState, null, 2);

// Parse Order
const parsedOrder = computed(() => {
  orderError.value = "";
  if (!orderJson.value.trim()) return null;
  try {
    return JSON.parse(orderJson.value);
  } catch (err: any) {
    orderError.value = `Invalid JSON: ${err.message}`;
    return null;
  }
});

// Parse State
const parsedState = computed(() => {
  stateError.value = "";
  if (!stateJson.value.trim()) return null;
  try {
    return JSON.parse(stateJson.value);
  } catch (err: any) {
    stateError.value = `Invalid JSON: ${err.message}`;
    return null;
  }
});

// Auto-detected manufacturer and serialNumber from message
const detectedManufacturer = computed(() => {
  return (
    parsedOrder.value?.manufacturer ||
    parsedState.value?.manufacturer ||
    "OfflineFleet"
  );
});

const detectedSerialNumber = computed(() => {
  return (
    parsedOrder.value?.serialNumber ||
    parsedState.value?.serialNumber ||
    "robot_alpha"
  );
});

// Order stats
const orderStats = computed(() => {
  if (!parsedOrder.value) return null;
  const nodes = Array.isArray(parsedOrder.value.nodes)
    ? parsedOrder.value.nodes.length
    : 0;
  const edges = Array.isArray(parsedOrder.value.edges)
    ? parsedOrder.value.edges.length
    : 0;
  return { nodes, edges };
});

// State stats
const stateStats = computed(() => {
  if (!parsedState.value) return null;
  const pos = parsedState.value.agvPosition;
  const battery = parsedState.value.batteryState?.batteryCharge;
  const mode = parsedState.value.operatingMode;
  return {
    pos: pos ? `(${Number(pos.x).toFixed(1)}, ${Number(pos.y).toFixed(1)})` : "N/A",
    battery: battery !== undefined ? `${battery}%` : null,
    mode: mode || "UNKNOWN",
  };
});

// Quick action buttons
const loadSampleOrder = () => {
  orderJson.value = JSON.stringify(sampleOrder, null, 2);
  orderError.value = "";
};

const loadSampleState = () => {
  stateJson.value = JSON.stringify(sampleState, null, 2);
  stateError.value = "";
};

const formatOrderJson = () => {
  if (parsedOrder.value) {
    orderJson.value = JSON.stringify(parsedOrder.value, null, 2);
  }
};

const formatStateJson = () => {
  if (parsedState.value) {
    stateJson.value = JSON.stringify(parsedState.value, null, 2);
  }
};

const clearOrder = () => {
  orderJson.value = "";
  orderError.value = "";
};

const clearState = () => {
  stateJson.value = "";
  stateError.value = "";
};

const handleCancel = () => {
  closeSidebarOffline();
  emit("close");
};

const currentRobotKey = computed(
  () => `${detectedManufacturer.value}/${detectedSerialNumber.value}`
);

const isExistingRobot = computed(() => {
  if (!robotList.value) return false;
  return robotList.value.some(
    (r) =>
      r.serialNumber === detectedSerialNumber.value &&
      r.manufacturer === detectedManufacturer.value
  );
});

const handleSelectRobotToEdit = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  const val = target.value;
  if (!val || val === "new") {
    resetEditor();
    return;
  }
  const [mfg, sn] = val.split("/");
  editRobot({ manufacturer: mfg, serialNumber: sn });
};

// Execute visualization / update
const handleApply = () => {
  const isOrder = activeTab.value === "order";
  const isState = activeTab.value === "state";

  if (isOrder && !orderJson.value.trim()) {
    orderError.value = "Please enter or load an Order JSON message.";
    return;
  }

  if (isState && !stateJson.value.trim()) {
    stateError.value = "Please enter or load a State JSON message.";
    return;
  }

  if (isOrder && !parsedOrder.value) {
    orderError.value = "Please fix JSON syntax in the Order message.";
    return;
  }

  if (isState && !parsedState.value) {
    stateError.value = "Please fix JSON syntax in the State message.";
    return;
  }

  const orderToApply = isOrder ? parsedOrder.value : null;
  const stateToApply = isState ? parsedState.value : null;

  try {
    const isUpdate = isExistingRobot.value;
    const result = visualizeOffline({
      order: orderToApply,
      state: stateToApply,
      setInitialStateFromOrder: autoSetStateFromOrder.value,
      selectAgv: true,
    });

    toast({
      title: isUpdate ? "Robot Updated" : "Visualized Successfully",
      description: `AGV "${result.agvId.serialNumber}" applied to map.`,
    });
  } catch (err: any) {
    toast({
      title: "Visualization Error",
      description: err.message || "Failed to visualize message.",
      variant: "destructive",
    });
  }
};
</script>

<template>
  <div class="flex flex-col h-full bg-background overflow-hidden">
    <!-- Header -->
    <div class="p-3 border-b flex items-center justify-between h-[68px] shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0"
          title="Back to robot list"
          @click="handleCancel"
        >
          <Icon icon="ph:arrow-left-bold" class="h-4 w-4" />
        </Button>
        <div class="truncate">
          <div class="flex items-center gap-1.5 font-semibold text-sm">
            <Icon icon="ph:cloud-slash-bold" class="h-4 w-4 text-primary shrink-0" />
            <span class="truncate">Offline Mode</span>
          </div>
          <p class="text-[11px] text-muted-foreground truncate">
            {{ isExistingRobot ? 'Edit Order or State JSON' : 'Paste Order or State JSON directly' }}
          </p>
        </div>
      </div>
      <Badge
        :variant="isExistingRobot ? 'default' : 'outline'"
        class="text-[10px] font-mono shrink-0"
        :class="isExistingRobot ? '' : 'border-primary/30 text-primary'"
      >
        {{ detectedSerialNumber }}
      </Badge>
    </div>

    <!-- Active Robots selector to switch between multiple robots -->
    <div
      v-if="robotList && robotList.length > 0"
      class="px-3 py-1.5 bg-muted/30 border-b flex items-center justify-between gap-2 text-xs shrink-0"
    >
      <span class="text-[11px] text-muted-foreground flex items-center gap-1 font-medium truncate">
        <Icon icon="ph:robot" class="w-3.5 h-3.5 text-primary shrink-0" />
        <span class="truncate">Edit Robot:</span>
      </span>
      <select
        class="text-[11px] h-6 px-1.5 rounded border border-border bg-background font-mono focus:outline-none cursor-pointer max-w-[170px] truncate"
        :value="isExistingRobot ? currentRobotKey : 'new'"
        @change="handleSelectRobotToEdit"
      >
        <option value="new">+ New Robot Message</option>
        <option
          v-for="r in robotList"
          :key="`${r.manufacturer}/${r.serialNumber}`"
          :value="`${r.manufacturer}/${r.serialNumber}`"
        >
          {{ r.serialNumber }} ({{ r.manufacturer }})
        </option>
      </select>
    </div>

    <!-- Mode Tabs -->
    <Tabs v-model="activeTab" class="flex-1 flex flex-col min-h-0 p-3 pt-2">
      <TabsList class="grid w-full grid-cols-2 h-8 shrink-0">
        <TabsTrigger value="order" class="text-[11px] px-1">
          Order
          <span v-if="orderStats" class="ml-1 text-[9px] text-muted-foreground font-mono">
            ({{ orderStats.nodes }}n)
          </span>
        </TabsTrigger>
        <TabsTrigger value="state" class="text-[11px] px-1">
          State
          <span v-if="stateStats" class="ml-1 text-[9px] text-muted-foreground font-mono">
            ({{ stateStats.pos }})
          </span>
        </TabsTrigger>
      </TabsList>

      <!-- ORDER TAB -->
      <TabsContent
        value="order"
        class="flex-1 min-h-0 space-y-2 mt-2 flex-col data-[state=active]:flex data-[state=inactive]:hidden"
      >
        <div class="flex items-center justify-between text-[11px] shrink-0">
          <span class="font-medium text-muted-foreground flex items-center gap-1">
            <Icon icon="ph:code" class="w-3.5 h-3.5 text-primary" />
            Order JSON
          </span>
          <div class="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              class="h-6 text-[10px] px-1.5 gap-1"
              @click="loadSampleOrder"
            >
              <Icon icon="ph:sparkle" class="w-3 h-3 text-amber-500" />
              Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 text-[10px] px-1"
              :disabled="!parsedOrder"
              @click="formatOrderJson"
            >
              Format
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 text-[10px] px-1 text-destructive hover:text-destructive"
              @click="clearOrder"
            >
              Clear
            </Button>
          </div>
        </div>

        <Textarea
          v-model="orderJson"
          placeholder="Paste VDA 5050 Order JSON here..."
          class="flex-1 min-h-0 w-full font-mono text-xs resize-none p-2.5 bg-muted/20 border-border focus-visible:ring-1"
          :class="{ 'border-destructive': orderError }"
        />

        <div v-if="orderError" class="text-[11px] text-destructive flex items-center gap-1 shrink-0">
          <Icon icon="ph:warning-circle-bold" class="w-3.5 h-3.5 shrink-0" />
          <span>{{ orderError }}</span>
        </div>

        <div class="flex items-center gap-2 pt-0.5 shrink-0">
          <input
            id="sb-auto-state"
            v-model="autoSetStateFromOrder"
            type="checkbox"
            class="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
          />
          <Label for="sb-auto-state" class="text-[11px] cursor-pointer text-muted-foreground select-none">
            Auto-place robot at Node 1 (Start Node)
          </Label>
        </div>
      </TabsContent>

      <!-- STATE TAB -->
      <TabsContent
        value="state"
        class="flex-1 min-h-0 space-y-2 mt-2 flex-col data-[state=active]:flex data-[state=inactive]:hidden"
      >
        <div class="flex items-center justify-between text-[11px] shrink-0">
          <span class="font-medium text-muted-foreground flex items-center gap-1">
            <Icon icon="ph:code" class="w-3.5 h-3.5 text-primary" />
            State JSON
          </span>
          <div class="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              class="h-6 text-[10px] px-1.5 gap-1"
              @click="loadSampleState"
            >
              <Icon icon="ph:sparkle" class="w-3 h-3 text-amber-500" />
              Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 text-[10px] px-1"
              :disabled="!parsedState"
              @click="formatStateJson"
            >
              Format
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 text-[10px] px-1 text-destructive hover:text-destructive"
              @click="clearState"
            >
              Clear
            </Button>
          </div>
        </div>

        <Textarea
          v-model="stateJson"
          placeholder="Paste VDA 5050 State JSON here..."
          class="flex-1 min-h-0 w-full font-mono text-xs resize-none p-2.5 bg-muted/20 border-border focus-visible:ring-1"
          :class="{ 'border-destructive': stateError }"
        />

        <div v-if="stateError" class="text-[11px] text-destructive flex items-center gap-1 shrink-0">
          <Icon icon="ph:warning-circle-bold" class="w-3.5 h-3.5 shrink-0" />
          <span>{{ stateError }}</span>
        </div>

        <div v-if="stateStats" class="flex flex-wrap gap-2 text-[11px] text-muted-foreground pt-1 shrink-0">
          <span>Pos: <strong class="text-foreground">{{ stateStats.pos }}</strong></span>
          <span v-if="stateStats.battery">Bat: <strong class="text-foreground">{{ stateStats.battery }}</strong></span>
          <span>Mode: <strong class="text-foreground">{{ stateStats.mode }}</strong></span>
        </div>
      </TabsContent>
    </Tabs>

    <!-- Footer Actions -->
    <div class="p-3 border-t bg-muted/10 shrink-0">
      <Button
        size="sm"
        class="w-full h-8 text-xs gap-1.5 shadow-sm font-medium"
        @click="handleApply"
        title="Apply and visualize message on map"
      >
        <Icon icon="ph:play-bold" class="w-3.5 h-3.5" />
        {{ isExistingRobot ? "Update Robot" : "Apply / Visualize" }}
      </Button>
    </div>
  </div>
</template>

<style scoped></style>
