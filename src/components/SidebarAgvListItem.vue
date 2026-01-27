<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { useMqttStore } from "@/stores/mqtt";
import { ConnectionState } from "@/types/vda5050.types";
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";

const props = defineProps<{
  agv: {
    manufacturer: string;
    serialNumber: string;
  };
  controller: VDA5050Agv;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  "select-agv": [];
}>();

const mqttStore = useMqttStore();

function getAgvData() {
  if (!props.controller) return null;
  return mqttStore.getAgvData(props.controller.agvId);
}

function getConnectionState() {
  const agvData = getAgvData();
  if (!agvData) return ConnectionState.OFFLINE;

  // If there's connection info, use it
  if (agvData.connectionInfo?.connectionState) {
    return agvData.connectionInfo.connectionState;
  }

  // If there's state info but no connection info, visualizer probably started later
  // so assume online
  if (agvData.stateInfo) {
    return ConnectionState.ONLINE;
  }

  return ConnectionState.OFFLINE;
}

function getOrderState() {
  const agvData = getAgvData();
  return agvData?.stateInfo?.orderState || null;
}

function getBatteryPercent() {
  const agvData = getAgvData();
  const battery = agvData?.stateInfo?.batteryState;
  if (battery?.batteryCharge !== undefined) {
    return Math.round(battery.batteryCharge);
  }
  return null;
}

function getErrorsCount() {
  const agvData = getAgvData();
  const errors = agvData?.stateInfo?.errors;
  if (!Array.isArray(errors)) return 0;
  return errors.length;
}

function getOrderId() {
  const agvData = getAgvData();
  return agvData?.orderInfo?.orderId || null;
}

function getStateHeaderId() {
  const agvData = getAgvData();
  return agvData?.stateInfo?.headerId || null;
}

function getStateBadgeClass(state: string | null) {
  switch (state) {
    case ConnectionState.ONLINE:
      return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300";
    case "RUNNING":
    case "EXECUTING":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300";
    case ConnectionState.OFFLINE:
    case "FAILED":
    case "ERROR":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
    case ConnectionState.CONNECTIONBROKEN:
    case "PAUSED":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300";
  }
}

const connectionState = computed(() => getConnectionState());
const orderState = computed(() => getOrderState());
const batteryPercent = computed(() => getBatteryPercent());
const errorsCount = computed(() => getErrorsCount());
const orderId = computed(() => getOrderId());
const stateHeaderId = computed(() => getStateHeaderId());
const stateBadgeClass = computed(() =>
  getStateBadgeClass(orderState.value || connectionState.value)
);
</script>

<template>
  <div
    @click="emit('select-agv')"
    :class="[
      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
      isSelected
        ? 'bg-primary/10 border-primary'
        : 'border-gray-200 dark:border-white/10 hover:bg-muted/50',
    ]"
  >
    <!-- Status Indicator -->
    <div class="flex-shrink-0">
      <div
        :class="[
          'w-3 h-3 rounded-full',
          connectionState === ConnectionState.ONLINE
            ? 'bg-green-500'
            : connectionState === ConnectionState.CONNECTIONBROKEN
            ? 'bg-orange-500'
            : 'bg-gray-400',
        ]"
      ></div>
    </div>

    <!-- Left Side: Name, Battery, Header ID -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-3 text-sm">
        <span class="font-semibold truncate">
          {{ agv.serialNumber }}
        </span>
        <span
          v-if="batteryPercent !== null"
          class="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Icon icon="ph:battery" class="h-3 w-3" />
          {{ batteryPercent }}%
        </span>
        <span
          v-if="stateHeaderId"
          class="flex items-center gap-1 text-xs text-muted-foreground truncate"
          :title="stateHeaderId"
        >
          <Icon icon="material-symbols:label" class="h-3 w-3" />
          {{ stateHeaderId }}
        </span>
        <span
          v-if="orderId"
          class="truncate max-w-[150px] text-xs text-muted-foreground"
          :title="orderId"
        >
          Order: {{ orderId }}
        </span>
        <span
          v-if="errorsCount > 0"
          class="flex items-center gap-1 text-red-500 text-xs"
        >
          <Icon icon="ph:warning" class="h-3 w-3" />
          {{ errorsCount }} error{{ errorsCount > 1 ? "s" : "" }}
        </span>
      </div>
    </div>

    <!-- Right Side: Status Badge and Action Icon -->
    <div class="flex-shrink-0 flex items-center gap-3">
      <span
        :class="[
          'px-2 py-0.5 rounded-full text-xs font-medium',
          stateBadgeClass,
        ]"
      >
        {{ orderState || connectionState }}
      </span>
      <Icon icon="ph:caret-right" class="h-4 w-4 text-muted-foreground" />
    </div>
  </div>
</template>
