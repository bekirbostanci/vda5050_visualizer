



<script setup lang="ts">
import { computed } from "vue";
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import { ConnectionState } from "@/types/vda5050.types";
import { useMqttStore } from "@/stores/mqtt";
import { useVDA5050 } from "@/composables/useVDA5050";

const props = defineProps<{
  controller: VDA5050Agv;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  'select-agv': [];
}>();

const mqttStore = useMqttStore();
const { selectedAgv } = useVDA5050();
const agvId = props.controller.agvId;

// Get AGV data from Pinia store
const agvData = computed(() => mqttStore.getAgvData(agvId));

// Computed properties for display - read from Pinia store
const position = computed(() => {
  const pos = agvData.value?.visualizationInfo?.agvPosition;
  return pos
    ? {
        x: pos.x.toFixed(2),
        y: pos.y.toFixed(2),
        theta: pos.theta.toFixed(2),
      }
    : null;
});

const velocity = computed(() => {
  const vel = agvData.value?.visualizationInfo?.velocity;
  return vel
    ? {
        vx: (Math.round(vel.vx * 100) / 100).toFixed(2),
        vy: (Math.round(vel.vy * 100) / 100).toFixed(2),
        omega: (Math.round(vel.omega * 100) / 100).toFixed(2),
      }
    : null;
});

const connectionState = computed(() => agvData.value?.connectionInfo?.connectionState);
const operatingMode = computed(() => agvData.value?.stateInfo?.operatingMode);
const mapId = computed(() => agvData.value?.stateInfo?.agvPosition?.mapId);
const timestamp = computed(() => agvData.value?.visualizationInfo?.timestamp);

// Order information
const orderInfo = computed(() => agvData.value?.orderInfo);
const orderId = computed(() => orderInfo.value?.orderId);
const orderUpdateId = computed(() => orderInfo.value?.orderUpdateId);
const orderHeaderId = computed(() => orderInfo.value?.headerId);
const orderTimestamp = computed(() => orderInfo.value?.timestamp);

// State information
const stateInfo = computed(() => agvData.value?.stateInfo);
const stateHeaderId = computed(() => stateInfo.value?.headerId);

// Instant action information
const instantActionsInfo = computed(() => agvData.value?.instantActionsInfo);
const instantActionId = computed(() => {
  if (Array.isArray(instantActionsInfo.value?.instantActions)) {
    return instantActionsInfo.value.instantActions.length > 0 
      ? instantActionsInfo.value.instantActions[0]?.instantActionId 
      : null;
  }
  return instantActionsInfo.value?.instantActionId || null;
});
const instantActionsCount = computed(() => {
  if (Array.isArray(instantActionsInfo.value?.instantActions)) {
    return instantActionsInfo.value.instantActions.length;
  }
  return instantActionsInfo.value ? 1 : 0;
});

// Loads, Actions, and Errors information
const loads = computed(() => agvData.value?.stateInfo?.loads);
const loadsCount = computed(() => {
  return Array.isArray(loads.value) ? loads.value.length : 0;
});

const actionStates = computed(() => agvData.value?.stateInfo?.actionStates);
const actionsCount = computed(() => {
  return Array.isArray(actionStates.value) ? actionStates.value.length : 0;
});

const errors = computed(() => agvData.value?.stateInfo?.errors);
const errorsCount = computed(() => {
  return Array.isArray(errors.value) ? errors.value.length : 0;
});
const fatalErrorsCount = computed(() => {
  if (!Array.isArray(errors.value)) return 0;
  return errors.value.filter((err: any) => err.errorLevel === 'fatal').length;
});
const warningErrorsCount = computed(() => {
  if (!Array.isArray(errors.value)) return 0;
  return errors.value.filter((err: any) => err.errorLevel === 'warning').length;
});

const sequenceProgress = computed(() => {
  const orderInfo = agvData.value?.orderInfo;
  const stateInfo = agvData.value?.stateInfo;

  if (!orderInfo || !stateInfo) return null;

  const lastNodeSequenceId =
    orderInfo.nodes?.length > 0
      ? Math.max(
          ...orderInfo.nodes.map(
            (node: { sequenceId: number }) => node.sequenceId
          )
        )
      : 0;

  const currentNodeSequenceId = stateInfo.lastNodeSequenceId || 0;

  return {
    current: currentNodeSequenceId,
    total: lastNodeSequenceId,
    percentage:
      lastNodeSequenceId > 0
        ? Math.round((currentNodeSequenceId / lastNodeSequenceId) * 100)
        : 0,
  };
});

// Order type - try to infer from order structure or use default
const orderType = computed(() => {
  if (!orderInfo.value) return null;
  // Check if order has specific type field, otherwise infer from structure
  if (orderInfo.value.orderType) return orderInfo.value.orderType;
  // Infer from nodes/edges - if has actions, might be transport
  if (orderInfo.value.nodes?.length > 0 || orderInfo.value.edges?.length > 0) {
    return 'transport';
  }
  return null;
});

// Order state - from stateInfo or connectionState
const orderState = computed(() => {
  const state = agvData.value?.stateInfo?.orderState;
  if (state) return state;
  // Try to infer from driving state
  if (agvData.value?.stateInfo?.driving) return 'RUNNING';
  return null;
});

// Order state badge class
const orderStateBadgeClass = computed(() => {
  const state = orderState.value || connectionState.value;
  switch (state) {
    case ConnectionState.ONLINE:
    case 'RUNNING':
    case 'EXECUTING':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    case ConnectionState.OFFLINE:
    case 'FAILED':
    case 'ERROR':
      return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
    case ConnectionState.CONNECTIONBROKEN:
    case 'PAUSED':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300';
  }
});

// Route display - from order nodes
const routeDisplay = computed(() => {
  if (!orderInfo.value?.nodes || orderInfo.value.nodes.length === 0) {
    return 'N/A';
  }
  const nodes = orderInfo.value.nodes;
  const firstNode = nodes[0];
  const lastNode = nodes[nodes.length - 1];
  return `${firstNode.nodeId || 'N/A'} → ${lastNode.nodeId || 'N/A'}`;
});

// Route progress - remaining nodes / total nodes
const routeProgress = computed(() => {
  if (!sequenceProgress.value) return null;
  const { current, total } = sequenceProgress.value;
  const remaining = Math.max(0, total - current);
  return {
    remaining,
    total,
    display: `${remaining} / ${total}`
  };
});

// Current step - from stateInfo or orderInfo
const currentStep = computed(() => {
  const currentNodeId = agvData.value?.stateInfo?.lastNodeId;
  if (currentNodeId) return `${currentNodeId}`;
  
  const currentAction = agvData.value?.stateInfo?.actionStates?.[0];
  if (currentAction?.actionType) return currentAction.actionType;
  
  return null;
});

// Priority - from orderInfo
const priority = computed(() => {
  return orderInfo.value?.priority || null;
});

// Battery percentage
const batteryPercent = computed(() => {
  const battery = agvData.value?.stateInfo?.batteryState;
  if (battery?.batteryCharge !== undefined) {
    return Math.round(battery.batteryCharge);
  }
  if (battery?.batteryVoltage !== undefined) {
    // Estimate from voltage if charge not available
    return null; // Could add voltage-based estimation if needed
  }
  return null;
});

// Speed - from velocity
const speed = computed(() => {
  if (!velocity.value) return null;
  const vx = parseFloat(velocity.value.vx);
  const vy = parseFloat(velocity.value.vy);
  const speedValue = Math.sqrt(vx * vx + vy * vy);
  return speedValue.toFixed(2);
});

// Alerts - from errors
const alerts = computed(() => {
  if (!errors.value || errors.value.length === 0) return [];
  return errors.value.map((err: any) => {
    const level = err.errorLevel || 'warning';
    const type = err.errorType || 'Unknown';
    return `${level}: ${type}`;
  });
});

// Deadline - from orderInfo
const deadline = computed(() => {
  return orderInfo.value?.deadline || null;
});

// Format timestamp helper
const formatTimestamp = (timestamp: string | number | null | undefined): string => {
  if (!timestamp) return 'N/A';
  try {
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp) 
      : new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return String(timestamp);
  }
};

// Action handlers
const handleAcknowledge = (event: Event) => {
  event.stopPropagation();
  // TODO: Implement acknowledge functionality
  console.log('Acknowledge clicked for', agvId);
};

const handleViewDetails = (event: Event) => {
  event.stopPropagation();
  // Select the AGV to open the details sidebar
  selectedAgv.value = agvId;
};
</script>

<template>
  <div class="max-w-xl mx-auto p-1">
    <div class="rounded-3xl shadow-lg  text-gray-900 dark:text-white p-3 border border-gray-200 dark:border-white/10">
      <!-- Top Row -->
      <div class="flex justify-between items-start mb-6">
        <div class="min-w-0 flex-1">
          <h2 class="text-xl tracking-tight">
            <span class="font-light">{{ agvId.manufacturer }}</span> / <span class="font-semibold">{{ agvId.serialNumber }}</span>
          </h2>
          <p class="text-sm text-gray-600 dark:text-white/60 truncate">Order: <span class="text-gray-900 dark:text-white">{{ orderId || 'N/A' }}</span></p>
        </div>

        <div class="flex flex-col gap-2 items-end">
          <span v-if="orderType" class="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            {{ orderType }}
          </span>
          <span :class="orderStateBadgeClass" class="px-3 py-1 rounded-full text-xs font-medium">
            {{ orderState || connectionState || 'N/A' }}
          </span>
        </div>
      </div>

      <!-- Middle Stats Card -->
      <div class="grid grid-cols-2 gap-6 mb-6">
        <!-- Left -->
        <div class="space-y-4">
          <div>
            <p class="text-xs text-gray-500 dark:text-white/50">Route</p>
            <p v-if="routeProgress" class="text-base font-medium text-gray-900 dark:text-white">{{ routeProgress.display }}</p>
            <p v-else class="text-base font-medium text-gray-900 dark:text-white">N/A</p>
          </div>

          <div>
            <p class="text-xs text-gray-500 dark:text-white/50">Current Step</p>
            <p class="text-base font-medium text-gray-900 dark:text-white max-w-xs truncate">{{ currentStep || 'N/A' }}</p>
          </div>

          <div>
            <p class="text-xs text-gray-500 dark:text-white/50">Operating Mode</p>
            <p class="text-base font-medium text-gray-900 dark:text-white capitalize max-w-xs truncate">{{ operatingMode || 'N/A' }}</p>
          </div>
        </div>

        <!-- Right -->
        <div class="space-y-4">
          <div>
            <p class="text-xs text-gray-500 dark:text-white/50">Position</p>
            <p class="text-base font-medium text-gray-900 dark:text-white">
              <span v-if="position">
                x: {{ position.x }},
                y: {{ position.y }},
                θ: {{ position.theta }}
              </span>
              <span v-else>N/A</span>
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 dark:text-white/50">Battery</p>
            <div class="flex items-center gap-2">
              <p class="text-base font-medium text-gray-900 dark:text-white">{{ batteryPercent !== null ? batteryPercent + '%' : 'N/A' }}</p>
              <div v-if="batteryPercent !== null" class="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                <div class="h-2 bg-emerald-500 dark:bg-emerald-400" :style="{ width: batteryPercent + '%' }"></div>
              </div>
            </div>
          </div>

          <div>
            <p class="text-xs text-gray-500 dark:text-white/50">Speed</p>
            <p class="text-base font-medium text-gray-900 dark:text-white">{{ speed !== null ? speed + ' m/s' : 'N/A' }}</p>
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div class="mb-6" v-if="alerts.length > 0">
        <p class="text-xs text-gray-500 dark:text-white/50 mb-1">Alerts</p>
        <div v-if="alerts.length" class="text-red-600 dark:text-red-300 text-sm">
          {{ alerts.join(', ') }}
        </div>
        <div v-else class="text-gray-500 dark:text-white/40 text-sm">None</div>
      </div>

      <!-- Footer -->
      <div class="flex justify-between text-xs text-gray-500 dark:text-white/40 border-t border-gray-200 dark:border-white/10 pt-4">
        <div>
          <p>Created: {{ formatTimestamp(orderTimestamp) }}</p>
          <p>State Header ID: <span class="text-gray-900 dark:text-white">{{ stateHeaderId ? stateHeaderId : 'N/A' }}</span></p>
        </div>
        <div class="flex gap-2">
          <button @click="handleViewDetails" class="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition text-white text-xs">Details</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
