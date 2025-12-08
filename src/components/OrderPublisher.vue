<script setup lang="ts">
import { ref, unref } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/vue";
import type { Order, Node, Edge, Action } from "vda-5050-lib";
import { BlockingType as BlockingTypeEnum } from "@/types/vda5050.types";

// Predefined VDA5050 action types
const predefinedActions = [
  {
    value: "startPause",
    label: "startPause",
    description:
      "Activates pause mode. No driving movements, actions can continue. Order is resumable.",
  },
  {
    value: "stopPause",
    label: "stopPause",
    description:
      "Deactivates pause mode. Movement and actions will be resumed.",
  },
  {
    value: "startCharging",
    label: "startCharging",
    description:
      "Activates charging process. Can be done on charging spot or lane.",
  },
  {
    value: "stopCharging",
    label: "stopCharging",
    description: "Deactivates charging process to send a new order.",
  },
  {
    value: "initPosition",
    label: "initPosition",
    description:
      "Resets (overrides) the pose of the AGV with given parameters.",
  },
  {
    value: "enableMap",
    label: "enableMap",
    description: "Enable a previously downloaded map to be used in orders.",
  },
  {
    value: "downloadMap",
    label: "downloadMap",
    description: "Trigger the download of a new map.",
  },
  {
    value: "deleteMap",
    label: "deleteMap",
    description: "Trigger the removal of a map from vehicle memory.",
  },
  {
    value: "stateRequest",
    label: "stateRequest",
    description: "Requests the AGV to send a new state report.",
  },
  {
    value: "logReport",
    label: "logReport",
    description: "Requests the AGV to generate and store a log report.",
  },
  {
    value: "pick",
    label: "pick",
    description:
      "Request the AGV to pick a load. Supports multiple load handling devices.",
  },
  {
    value: "drop",
    label: "drop",
    description: "Request the AGV to drop a load.",
  },
  {
    value: "detectObject",
    label: "detectObject",
    description:
      "AGV detects object (e.g., load, charging spot, free parking position).",
  },
  {
    value: "finePositioning",
    label: "finePositioning",
    description:
      "AGV positions exactly on a target. Can be used on node or edge.",
  },
  {
    value: "waitForTrigger",
    label: "waitForTrigger",
    description:
      "AGV waits for a trigger (e.g., button press, manual loading).",
  },
  {
    value: "cancelOrder",
    label: "cancelOrder",
    description:
      "AGV stops as soon as possible. Order is deleted, all actions canceled.",
  },
  {
    value: "factsheetRequest",
    label: "factsheetRequest",
    description: "Requests the AGV to send a factsheet.",
  },
  {
    value: "custom",
    label: "Custom...",
    description: "Enter a custom action type",
  },
];

const props = defineProps<{
  agvId: { manufacturer: string; serialNumber: string };
  existingOrder?: Order | null;
}>();

const emit = defineEmits<{
  close: [];
  published: [];
}>();

const { agvControllers, interfaceName } = useVDA5050();

const error = ref("");
const expandedSections = ref<Set<string>>(new Set(["order-basic"]));

// Order form state
const orderForm = ref<{
  headerId: number;
  manufacturer: string;
  serialNumber: string;
  timestamp: string;
  version: string;
  orderId: string;
  orderUpdateId: number;
  zoneSetId: string;
  nodes: Node[];
  edges: Edge[];
}>({
  headerId: 1,
  manufacturer: props.agvId.manufacturer,
  serialNumber: props.agvId.serialNumber,
  timestamp: new Date().toISOString(),
  version: "2.0.0",
  orderId: `order_${Date.now()}`,
  orderUpdateId: 1,
  zoneSetId: "",
  nodes: [],
  edges: [],
});

// Initialize form with existing order if provided
if (props.existingOrder) {
  orderForm.value = {
    headerId: (props.existingOrder.headerId || 0) + 1,
    manufacturer: props.existingOrder.manufacturer || props.agvId.manufacturer,
    serialNumber: props.existingOrder.serialNumber || props.agvId.serialNumber,
    timestamp: new Date().toISOString(),
    version: props.existingOrder.version,
    orderId: props.existingOrder.orderId,
    orderUpdateId: (props.existingOrder.orderUpdateId || 0) + 1,
    zoneSetId: props.existingOrder.zoneSetId || "",
    nodes: props.existingOrder.nodes || [],
    edges: props.existingOrder.edges || [],
  };
}

// Build Order from form data
const buildOrderFromForm = (): Order => {
  const order: Order = {
    headerId: orderForm.value.headerId,
    manufacturer: orderForm.value.manufacturer,
    serialNumber: orderForm.value.serialNumber,
    timestamp: orderForm.value.timestamp || new Date().toISOString(),
    version: orderForm.value.version,
    orderId: orderForm.value.orderId,
    orderUpdateId: orderForm.value.orderUpdateId,
    nodes: orderForm.value.nodes,
    edges: orderForm.value.edges,
  };

  if (orderForm.value.zoneSetId) {
    order.zoneSetId = orderForm.value.zoneSetId;
  }

  return order;
};

// Publish Order
const publishOrder = () => {
  try {
    // Validate required fields
    if (
      !orderForm.value.headerId ||
      !orderForm.value.manufacturer ||
      !orderForm.value.serialNumber ||
      !orderForm.value.version ||
      !orderForm.value.orderId ||
      orderForm.value.orderUpdateId === undefined
    ) {
      error.value =
        "Missing required fields: headerId, manufacturer, serialNumber, version, orderId, orderUpdateId";
      return;
    }

    const order = buildOrderFromForm();
    const key = `${props.agvId.manufacturer}/${props.agvId.serialNumber}`;
    const controller = agvControllers.value.get(key);

    if (!controller) {
      error.value = "AGV controller not found";
      return;
    }

    controller.publishOrder(order, unref(interfaceName));
    error.value = "";
    alert("Order published successfully!");
    emit("published");
  } catch (err: any) {
    error.value = `Failed to publish: ${err.message}`;
  }
};

// Helper functions for managing arrays
const addNode = () => {
  orderForm.value.nodes.push({
    nodeId: `node_${orderForm.value.nodes.length + 1}`,
    sequenceId: orderForm.value.nodes.length + 1,
    released: true,
    actions: [],
  });
};

const removeNode = (index: number) => {
  orderForm.value.nodes.splice(index, 1);
};

const addEdge = () => {
  orderForm.value.edges.push({
    edgeId: `edge_${orderForm.value.edges.length + 1}`,
    startNodeId: "",
    endNodeId: "",
    sequenceId: orderForm.value.edges.length + 1,
    released: true,
    actions: [],
  });
};

const removeEdge = (index: number) => {
  orderForm.value.edges.splice(index, 1);
};

const addActionToNode = (nodeIndex: number) => {
  if (!orderForm.value.nodes[nodeIndex].actions) {
    orderForm.value.nodes[nodeIndex].actions = [];
  }
  orderForm.value.nodes[nodeIndex].actions.push({
    actionId: `action_${orderForm.value.nodes[nodeIndex].actions.length + 1}`,
    actionType: "",
    blockingType: BlockingTypeEnum.None,
  });
};

const removeActionFromNode = (nodeIndex: number, actionIndex: number) => {
  orderForm.value.nodes[nodeIndex].actions.splice(actionIndex, 1);
};

const addActionToEdge = (edgeIndex: number) => {
  if (!orderForm.value.edges[edgeIndex].actions) {
    orderForm.value.edges[edgeIndex].actions = [];
  }
  orderForm.value.edges[edgeIndex].actions.push({
    actionId: `action_${orderForm.value.edges[edgeIndex].actions.length + 1}`,
    actionType: "",
    blockingType: BlockingTypeEnum.None,
  });
};

const removeActionFromEdge = (edgeIndex: number, actionIndex: number) => {
  orderForm.value.edges[edgeIndex].actions.splice(actionIndex, 1);
};

const addActionParameter = (action: Action) => {
  if (!action.actionParameters) {
    action.actionParameters = [];
  }
  action.actionParameters.push({
    key: "",
    value: "",
  });
};

const removeActionParameter = (action: Action, index: number) => {
  if (action.actionParameters) {
    action.actionParameters.splice(index, 1);
  }
};

const toggleSection = (section: string) => {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section);
  } else {
    expandedSections.value.add(section);
  }
};

const handleActionTypeChange = (action: Action) => {
  if (action.actionType === "custom") {
    action.actionType = "";
  }
};

const isCustomActionType = (actionType: string | undefined): boolean => {
  if (!actionType || actionType === "") return true;
  return !predefinedActions.find((a) => a.value === actionType);
};

const getActionDescription = (
  actionType: string | undefined
): string | undefined => {
  if (!actionType) return undefined;
  const action = predefinedActions.find((a) => a.value === actionType);
  return action && action.value !== "custom" ? action.description : undefined;
};
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex items-center justify-between top-0 bg-background z-10 pb-2 border-b"
    >
      <div class="text-sm font-semibold flex items-center gap-2">
        <Icon icon="material-symbols:list-alt" class="w-4 h-4" />
        Create Order
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="h-6 w-6 p-0"
        @click="emit('close')"
      >
        <Icon icon="material-symbols:close" class="w-4 h-4" />
      </Button>
    </div>

    <div
      v-if="error"
      class="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded"
    >
      {{ error }}
    </div>

    <div class="space-y-4">
      <!-- Basic Information -->
      <div class="border rounded-lg p-4 space-y-3">
        <div
          class="flex items-center justify-between cursor-pointer"
          @click="toggleSection('order-basic')"
        >
          <h3 class="font-semibold text-sm">Basic Information</h3>
          <Icon
            :icon="
              expandedSections.has('order-basic')
                ? 'material-symbols:expand-less'
                : 'material-symbols:expand-more'
            "
            class="w-4 h-4"
          />
        </div>
        <div v-if="expandedSections.has('order-basic')" class="space-y-3 pt-2">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="text-xs">Header ID</Label>
              <Input
                v-model.number="orderForm.headerId"
                type="number"
                class="h-8 text-xs"
              />
            </div>
            <div>
              <Label class="text-xs">Order Update ID</Label>
              <Input
                v-model.number="orderForm.orderUpdateId"
                type="number"
                class="h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label class="text-xs">Order ID</Label>
            <Input v-model="orderForm.orderId" class="h-8 text-xs" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <Label class="text-xs">Manufacturer</Label>
              <Input v-model="orderForm.manufacturer" class="h-8 text-xs" />
            </div>
            <div>
              <Label class="text-xs">Serial Number</Label>
              <Input v-model="orderForm.serialNumber" class="h-8 text-xs" />
            </div>
          </div>
          <div>
            <Label class="text-xs">Version</Label>
            <Input v-model="orderForm.version" class="h-8 text-xs" />
          </div>
          <div>
            <Label class="text-xs">Zone Set ID (Optional)</Label>
            <Input v-model="orderForm.zoneSetId" class="h-8 text-xs" />
          </div>
          <div>
            <Label class="text-xs">Timestamp</Label>
            <div class="flex gap-2">
              <Input
                :model-value="
                  orderForm.timestamp
                    ? new Date(orderForm.timestamp).toISOString().slice(0, 16)
                    : ''
                "
                @update:model-value="
                  (val) =>
                    (orderForm.timestamp = val
                      ? new Date(val).toISOString()
                      : new Date().toISOString())
                "
                type="datetime-local"
                class="h-8 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                class="h-8 text-xs"
                @click="orderForm.timestamp = new Date().toISOString()"
              >
                Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Nodes -->
      <div class="border rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div
            class="flex items-center justify-between cursor-pointer flex-1"
            @click="toggleSection('order-nodes')"
          >
            <h3 class="font-semibold text-sm">
              Nodes ({{ orderForm.nodes.length }})
            </h3>
            <Icon
              :icon="
                expandedSections.has('order-nodes')
                  ? 'material-symbols:expand-less'
                  : 'material-symbols:expand-more'
              "
              class="w-4 h-4"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            class="h-7 text-xs ml-2"
            @click="addNode"
          >
            <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
            Add Node
          </Button>
        </div>
        <div v-if="expandedSections.has('order-nodes')" class="space-y-3 pt-2">
          <div
            v-for="(node, nodeIndex) in orderForm.nodes"
            :key="nodeIndex"
            class="border rounded p-3 space-y-2 bg-muted/30"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium">Node {{ nodeIndex + 1 }}</span>
              <Button
                size="sm"
                variant="ghost"
                class="h-6 w-6 p-0"
                @click="removeNode(nodeIndex)"
              >
                <Icon icon="material-symbols:delete" class="w-3 h-3" />
              </Button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <Label class="text-xs">Node ID</Label>
                <Input v-model="node.nodeId" class="h-7 text-xs" />
              </div>
              <div>
                <Label class="text-xs">Sequence ID</Label>
                <Input
                  v-model.number="node.sequenceId"
                  type="number"
                  class="h-7 text-xs"
                />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="node.released"
                :id="'node-released-' + nodeIndex"
                class="w-4 h-4"
              />
              <Label
                :for="'node-released-' + nodeIndex"
                class="text-xs cursor-pointer"
                >Released</Label
              >
            </div>
            <div v-if="!node.nodePosition" class="pt-1">
              <Button
                size="sm"
                variant="outline"
                class="h-6 text-xs"
                @click="node.nodePosition = { x: 0, y: 0, mapId: '' }"
              >
                <Icon
                  icon="material-symbols:add-location"
                  class="w-3 h-3 mr-1"
                />
                Add Position
              </Button>
            </div>
            <div v-else class="grid grid-cols-3 gap-2">
              <div>
                <Label class="text-xs">X</Label>
                <Input
                  v-model.number="node.nodePosition.x"
                  type="number"
                  class="h-7 text-xs"
                />
              </div>
              <div>
                <Label class="text-xs">Y</Label>
                <Input
                  v-model.number="node.nodePosition.y"
                  type="number"
                  class="h-7 text-xs"
                />
              </div>
              <div class="space-y-1">
                <Label class="text-xs">Map ID</Label>
                <div class="flex gap-1">
                  <Input
                    v-model="node.nodePosition.mapId"
                    class="h-7 text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    class="h-7 w-7 p-0"
                    @click="node.nodePosition = undefined"
                  >
                    <Icon icon="material-symbols:close" class="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label class="text-xs"
                  >Actions ({{ node.actions?.length || 0 }})</Label
                >
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-6 text-xs"
                  @click="addActionToNode(nodeIndex)"
                >
                  <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
                  Add Action
                </Button>
              </div>
              <div
                v-for="(action, actionIndex) in node.actions"
                :key="actionIndex"
                class="pl-2 border-l-2 space-y-2 bg-background/50 p-2 rounded"
              >
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <Label class="text-xs">Action ID</Label>
                    <Input
                      v-model="action.actionId"
                      placeholder="Action ID"
                      class="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label class="text-xs">Action Type</Label>
                    <select
                      v-model="action.actionType"
                      class="h-6 text-xs w-full rounded border px-2 bg-background"
                      @change="handleActionTypeChange(action)"
                    >
                      <option value="">Select action type...</option>
                      <option
                        v-for="predefAction in predefinedActions"
                        :key="predefAction.value"
                        :value="predefAction.value"
                      >
                        {{ predefAction.label }}
                      </option>
                    </select>
                  </div>
                </div>
                <div
                  v-if="isCustomActionType(action.actionType)"
                  class="space-y-1"
                >
                  <Label class="text-xs">Custom Action Type</Label>
                  <Input
                    v-model="action.actionType"
                    placeholder="Enter custom action type"
                    class="h-6 text-xs"
                  />
                </div>
                <div
                  v-if="getActionDescription(action.actionType)"
                  class="text-xs text-muted-foreground italic"
                >
                  {{ getActionDescription(action.actionType) }}
                </div>
                <div>
                  <Label class="text-xs">Blocking Type</Label>
                  <select
                    v-model="action.blockingType"
                    class="h-6 text-xs w-full rounded border px-2 bg-background"
                  >
                    <option value="NONE">NONE</option>
                    <option value="SOFT">SOFT</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <Label class="text-xs">Action Description (Optional)</Label>
                  <Textarea
                    v-model="action.actionDescription"
                    class="h-12 text-xs"
                    placeholder="Additional information on the action"
                  />
                </div>
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label class="text-xs"
                      >Parameters ({{
                        action.actionParameters?.length || 0
                      }})</Label
                    >
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-6 text-xs"
                      @click="addActionParameter(action)"
                    >
                      <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
                      Add Parameter
                    </Button>
                  </div>
                  <div
                    v-for="(param, paramIndex) in action.actionParameters"
                    :key="paramIndex"
                    class="pl-2 border-l-2 space-y-1"
                  >
                    <div class="grid grid-cols-2 gap-2">
                      <Input
                        v-model="param.key"
                        placeholder="Key"
                        class="h-6 text-xs"
                      />
                      <Input
                        :model-value="
                          typeof param.value === 'object'
                            ? JSON.stringify(param.value)
                            : String(param.value)
                        "
                        @update:model-value="(val) => {
                          try {
                            param.value = JSON.parse(val as string);
                          } catch {
                            param.value = val;
                          }
                        }"
                        placeholder="Value (JSON for arrays/objects)"
                        class="h-6 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-5 text-xs"
                      @click="removeActionParameter(action, paramIndex)"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-5 text-xs"
                  @click="removeActionFromNode(nodeIndex, actionIndex)"
                >
                  Remove Action
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edges -->
      <div class="border rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div
            class="flex items-center justify-between cursor-pointer flex-1"
            @click="toggleSection('order-edges')"
          >
            <h3 class="font-semibold text-sm">
              Edges ({{ orderForm.edges.length }})
            </h3>
            <Icon
              :icon="
                expandedSections.has('order-edges')
                  ? 'material-symbols:expand-less'
                  : 'material-symbols:expand-more'
              "
              class="w-4 h-4"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            class="h-7 text-xs ml-2"
            @click="addEdge"
          >
            <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
            Add Edge
          </Button>
        </div>
        <div v-if="expandedSections.has('order-edges')" class="space-y-3 pt-2">
          <div
            v-for="(edge, edgeIndex) in orderForm.edges"
            :key="edgeIndex"
            class="border rounded p-3 space-y-2 bg-muted/30"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium">Edge {{ edgeIndex + 1 }}</span>
              <Button
                size="sm"
                variant="ghost"
                class="h-6 w-6 p-0"
                @click="removeEdge(edgeIndex)"
              >
                <Icon icon="material-symbols:delete" class="w-3 h-3" />
              </Button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <Label class="text-xs">Edge ID</Label>
                <Input v-model="edge.edgeId" class="h-7 text-xs" />
              </div>
              <div>
                <Label class="text-xs">Sequence ID</Label>
                <Input
                  v-model.number="edge.sequenceId"
                  type="number"
                  class="h-7 text-xs"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <Label class="text-xs">Start Node ID</Label>
                <Input v-model="edge.startNodeId" class="h-7 text-xs" />
              </div>
              <div>
                <Label class="text-xs">End Node ID</Label>
                <Input v-model="edge.endNodeId" class="h-7 text-xs" />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                v-model="edge.released"
                :id="'edge-released-' + edgeIndex"
                class="w-4 h-4"
              />
              <Label
                :for="'edge-released-' + edgeIndex"
                class="text-xs cursor-pointer"
                >Released</Label
              >
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label class="text-xs"
                  >Actions ({{ edge.actions?.length || 0 }})</Label
                >
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-6 text-xs"
                  @click="addActionToEdge(edgeIndex)"
                >
                  <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
                  Add Action
                </Button>
              </div>
              <div
                v-for="(action, actionIndex) in edge.actions"
                :key="actionIndex"
                class="pl-2 border-l-2 space-y-2 bg-background/50 p-2 rounded"
              >
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <Label class="text-xs">Action ID</Label>
                    <Input
                      v-model="action.actionId"
                      placeholder="Action ID"
                      class="h-6 text-xs"
                    />
                  </div>
                  <div>
                    <Label class="text-xs">Action Type</Label>
                    <select
                      v-model="action.actionType"
                      class="h-6 text-xs w-full rounded border px-2 bg-background"
                      @change="handleActionTypeChange(action)"
                    >
                      <option value="">Select action type...</option>
                      <option
                        v-for="predefAction in predefinedActions"
                        :key="predefAction.value"
                        :value="predefAction.value"
                      >
                        {{ predefAction.label }}
                      </option>
                    </select>
                  </div>
                </div>
                <div
                  v-if="isCustomActionType(action.actionType)"
                  class="space-y-1"
                >
                  <Label class="text-xs">Custom Action Type</Label>
                  <Input
                    v-model="action.actionType"
                    placeholder="Enter custom action type"
                    class="h-6 text-xs"
                  />
                </div>
                <div
                  v-if="getActionDescription(action.actionType)"
                  class="text-xs text-muted-foreground italic"
                >
                  {{ getActionDescription(action.actionType) }}
                </div>
                <div>
                  <Label class="text-xs">Blocking Type</Label>
                  <select
                    v-model="action.blockingType"
                    class="h-6 text-xs w-full rounded border px-2 bg-background"
                  >
                    <option value="NONE">NONE</option>
                    <option value="SOFT">SOFT</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <Label class="text-xs">Action Description (Optional)</Label>
                  <Textarea
                    v-model="action.actionDescription"
                    class="h-12 text-xs"
                    placeholder="Additional information on the action"
                  />
                </div>
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label class="text-xs"
                      >Parameters ({{
                        action.actionParameters?.length || 0
                      }})</Label
                    >
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-6 text-xs"
                      @click="addActionParameter(action)"
                    >
                      <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
                      Add Parameter
                    </Button>
                  </div>
                  <div
                    v-for="(param, paramIndex) in action.actionParameters"
                    :key="paramIndex"
                    class="pl-2 border-l-2 space-y-1"
                  >
                    <div class="grid grid-cols-2 gap-2">
                      <Input
                        v-model="param.key"
                        placeholder="Key"
                        class="h-6 text-xs"
                      />
                      <Input
                        :model-value="
                          typeof param.value === 'object'
                            ? JSON.stringify(param.value)
                            : String(param.value)
                        "
                        @update:model-value="(val) => {
                              try {
                                param.value = JSON.parse(val as string);
                              } catch {
                                param.value = val;
                              }
                            }"
                        placeholder="Value (JSON for arrays/objects)"
                        class="h-6 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      class="h-5 text-xs"
                      @click="removeActionParameter(action, paramIndex)"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-5 text-xs"
                  @click="removeActionFromEdge(edgeIndex, actionIndex)"
                >
                  Remove Action
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-2 border-t">
        <Button @click="publishOrder" class="flex-1">
          <Icon icon="material-symbols:send" class="w-4 h-4 mr-2" />
          Publish Order
        </Button>
        <Button variant="outline" @click="emit('close')"> Cancel </Button>
      </div>
    </div>
  </div>
</template>
