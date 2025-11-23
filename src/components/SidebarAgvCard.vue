<script setup lang="ts">
import { computed, ref } from "vue";
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ConnectionState } from "@/types/vda5050.types";
import { Icon } from '@iconify/vue';
import { useMqttStore } from "@/stores/mqtt";

const props = defineProps<{
  controller: VDA5050Agv;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  'select-agv': [];
}>();

const mqttStore = useMqttStore();
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

const statusColor = computed(() => {
  switch (connectionState.value) {
    case ConnectionState.ONLINE: return 'bg-green-500 hover:bg-green-600';
    case ConnectionState.OFFLINE: return 'bg-red-500 hover:bg-red-600';
    case ConnectionState.CONNECTIONBROKEN: return 'bg-orange-500 hover:bg-orange-600';
    default: return 'bg-gray-500 hover:bg-gray-600';
  }
});

const showOrderInfo = ref(false);
const showInstantActions = ref(false);

const toggleOrderInfo = (event: Event) => {
  event.stopPropagation();
  showOrderInfo.value = !showOrderInfo.value;
};

const toggleInstantActions = (event: Event) => {
  event.stopPropagation();
  showInstantActions.value = !showInstantActions.value;
};
</script>

<template>
  <div>
  <Card 
    class="cursor-pointer transition-all hover:shadow-md"
    :class="{ 'border-primary ring-1 ring-primary': isSelected }"
    @click="emit('select-agv')"
  >
    <CardHeader class="p-3 pb-2">
      <CardTitle class="text-sm font-semibold flex items-center justify-between">
        <span>{{ agvId.manufacturer }} / {{ agvId.serialNumber }}</span>
        <Badge :class="statusColor" class="text-xs px-1 py-0 h-5">
          {{ connectionState || 'UNKNOWN' }}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent class="p-3 pt-0 space-y-2">
      <!-- Chips Row -->
      <div class="flex flex-wrap gap-1">
        <Badge variant="outline" class="text-xs px-1 h-5 gap-1" v-if="position">
          <Icon icon="material-symbols:gps-fixed" class="w-3 h-3" />
          x:{{ position.x }} y:{{ position.y }} θ:{{ position.theta }}
        </Badge>
        <Badge variant="outline" class="text-xs px-1 h-5 gap-1" v-if="velocity">
          <Icon icon="material-symbols:speed" class="w-3 h-3" />
          vx:{{ velocity.vx }} vy:{{ velocity.vy }}
        </Badge>
        <Badge variant="outline" class="text-xs px-1 h-5 gap-1" v-if="operatingMode">
          <Icon icon="material-symbols:auto-mode" class="w-3 h-3" />
          {{ operatingMode.toLowerCase() }}
        </Badge>
        <Badge variant="outline" class="text-xs px-1 h-5 gap-1" v-if="mapId">
          <Icon icon="material-symbols:map" class="w-3 h-3" />
          {{ mapId }}
        </Badge>
        <Badge variant="outline" class="text-xs px-1 h-5 gap-1" v-if="loadsCount > 0">
          <Icon icon="material-symbols:view-in-ar" class="w-3 h-3" />
          Loads: {{ loadsCount }}
        </Badge>
        <Badge variant="outline" class="text-xs px-1 h-5 gap-1" v-if="actionsCount > 0">
          <Icon icon="material-symbols:pending-actions" class="w-3 h-3" />
          Actions: {{ actionsCount }}
        </Badge>
        <Badge 
          variant="outline" 
          :class="[
            'text-xs px-1 h-5 gap-1',
            fatalErrorsCount > 0 ? 'border-red-500 text-red-600' : warningErrorsCount > 0 ? 'border-yellow-500 text-yellow-600' : ''
          ]"
          v-if="errorsCount > 0"
        >
          <Icon icon="material-symbols:error" class="w-3 h-3" />
          Errors: {{ errorsCount }}
          <span v-if="fatalErrorsCount > 0" class="ml-1">({{ fatalErrorsCount }} fatal)</span>
          <span v-else-if="warningErrorsCount > 0" class="ml-1">({{ warningErrorsCount }} warnings)</span>
        </Badge>
      </div>

      <!-- Order Information Toggle Button -->
      <div v-if="orderInfo" class="pt-1 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          class="w-full text-xs h-7 justify-between px-2"
          @click="toggleOrderInfo"
        >
          <div class="flex items-center gap-1">
            <Icon icon="material-symbols:list-alt" class="w-3 h-3" />
            <span>Order Information</span>
          </div>
          <Icon 
            :icon="showOrderInfo ? 'material-symbols:expand-less' : 'material-symbols:expand-more'" 
            class="w-4 h-4" 
          />
        </Button>
      </div>

      <!-- Order Information Content -->
      <div v-if="orderInfo && showOrderInfo" class="space-y-1 pt-1 pl-2">
        <div class="flex flex-wrap gap-1">
          <Badge variant="secondary" class="text-xs px-1 h-5 gap-1" v-if="orderId">
            <Icon icon="material-symbols:tag" class="w-3 h-3" />
            ID: {{ orderId }}
          </Badge>
          <Badge variant="secondary" class="text-xs px-1 h-5 gap-1" v-if="orderUpdateId !== undefined">
            <Icon icon="material-symbols:update" class="w-3 h-3" />
            Update: {{ orderUpdateId }}
          </Badge>
          <Badge variant="secondary" class="text-xs px-1 h-5 gap-1" v-if="orderHeaderId">
            <Icon icon="material-symbols:label" class="w-3 h-3" />
            Header: {{ orderHeaderId }}
          </Badge>
        </div>
        <div v-if="orderTimestamp" class="text-[10px] text-muted-foreground flex items-center gap-1">
          <Icon icon="material-symbols:schedule" class="w-3 h-3" />
          {{ orderTimestamp }}
        </div>
      </div>

      <!-- Instant Actions Toggle Button -->
      <div v-if="instantActionsInfo" class="pt-1 border-t">
        <Button 
          variant="ghost" 
          size="sm" 
          class="w-full text-xs h-7 justify-between px-2"
          @click="toggleInstantActions"
        >
          <div class="flex items-center gap-1">
            <Icon icon="material-symbols:flash-on" class="w-3 h-3" />
            <span>Instant Actions</span>
          </div>
          <Icon 
            :icon="showInstantActions ? 'material-symbols:expand-less' : 'material-symbols:expand-more'" 
            class="w-4 h-4" 
          />
        </Button>
      </div>

      <!-- Instant Actions Content -->
      <div v-if="instantActionsInfo && showInstantActions" class="space-y-1 pt-1 pl-2">
        <div class="flex flex-wrap gap-1">
          <Badge variant="secondary" class="text-xs px-1 h-5 gap-1" v-if="instantActionId">
            <Icon icon="material-symbols:bolt" class="w-3 h-3" />
            Action ID: {{ instantActionId }}
          </Badge>
          <Badge variant="secondary" class="text-xs px-1 h-5 gap-1" v-if="instantActionsCount > 0">
            <Icon icon="material-symbols:format-list-numbered" class="w-3 h-3" />
            Count: {{ instantActionsCount }}
          </Badge>
        </div>
      </div>

      <!-- Progress Bar -->
      <div v-if="sequenceProgress && sequenceProgress.total > 0" class="space-y-1">
        <div class="flex justify-between text-[10px] text-muted-foreground">
          <span>Progress: {{ sequenceProgress.current }} / {{ sequenceProgress.total }}</span>
          <span>{{ sequenceProgress.percentage }}%</span>
        </div>
        <Progress :model-value="sequenceProgress.percentage" class="h-1.5" />
      </div>
      
      <div v-if="timestamp" class="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
         <Icon icon="material-symbols:av-timer" class="w-3 h-3" />
         {{ timestamp }}
      </div>
    </CardContent>

  </Card>
  </div>
</template>

<style scoped>
/* Ensure the details section content is visible */
:deep(.card-header-div) {
  padding: 8px 12px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:deep(.card-font-bold) {
  font-weight: bold;
  font-size: 14px;
}

:deep(.card-font) {
  font-size: 12px;
}

:deep(.card-divider) {
  margin: 8px 0;
}

/* Ensure BalmUI components are visible */
:deep(ui-chips) {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

:deep(ui-chip) {
  display: inline-flex;
  align-items: center;
}
</style>
