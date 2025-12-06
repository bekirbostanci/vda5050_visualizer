<script setup lang="ts">
import { computed, ref, unref, watch } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import { Button } from "@/components/ui/button";
import { Icon } from '@iconify/vue';
import OrderPublisher from "@/components/OrderPublisher.vue";
import InstantActionPublisher from "@/components/InstantActionPublisher.vue";

const emit = defineEmits<{
  close: [];
  showJson: [title: string, data: any];
}>();

const { selectedAgv, agvControllers, interfaceName } = useVDA5050();

const selectedAgvData = computed(() => {
  if (!selectedAgv.value) return null;
  
  const key = `${selectedAgv.value.manufacturer}/${selectedAgv.value.serialNumber}`;
  const controller = agvControllers.value.get(key);
  
  if (!controller) return null;

  return {
    agvId: controller.agvId,
    connection: unref(controller.connectionInfo),
    state: unref(controller.stateInfo),
    order: unref(controller.orderInfo),
    visualization: unref(controller.visualizationInfo),
    instantActions: unref(controller.instantActionsInfo),
  };
});

// Order information
const orderInfo = computed(() => selectedAgvData.value?.order);
const orderId = computed(() => orderInfo.value?.orderId);
const orderUpdateId = computed(() => orderInfo.value?.orderUpdateId);
const orderHeaderId = computed(() => orderInfo.value?.headerId);
const orderTimestamp = computed(() => orderInfo.value?.timestamp);
const orderNodesCount = computed(() => {
  return Array.isArray(orderInfo.value?.nodes) ? orderInfo.value.nodes.length : 0;
});
const orderEdgesCount = computed(() => {
  return Array.isArray(orderInfo.value?.edges) ? orderInfo.value.edges.length : 0;
});

// Instant Actions information
const instantActionsInfo = computed(() => selectedAgvData.value?.instantActions);
const instantActionsArray = computed(() => {
  if (Array.isArray(instantActionsInfo.value?.instantActions)) {
    return instantActionsInfo.value.instantActions;
  }
  return instantActionsInfo.value ? [instantActionsInfo.value] : [];
});
const instantActionsCount = computed(() => instantActionsArray.value.length);

// State information - errors, loads, actions
const stateInfo = computed(() => selectedAgvData.value?.state);
const errors = computed(() => stateInfo.value?.errors);
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

const loads = computed(() => stateInfo.value?.loads);
const loadsCount = computed(() => {
  return Array.isArray(loads.value) ? loads.value.length : 0;
});

const actionStates = computed(() => stateInfo.value?.actionStates);
const actionsCount = computed(() => {
  return Array.isArray(actionStates.value) ? actionStates.value.length : 0;
});

// Emit JSON getter function to parent component (App.vue) to show in JsonViewerSidebar
// This allows the JSON viewer to reactively update when data changes
const showJson = (title: string, getDataFn: () => any) => {
  emit('showJson', title, getDataFn);
};

// Publisher mode state
const publisherMode = ref<'order' | 'instantAction' | null>(null);

// Initialize publishers
const initOrderPublisher = (_useExisting: boolean = false) => {
  if (!selectedAgv.value) return;
  publisherMode.value = 'order';
};

const initInstantActionPublisher = (_useExisting: boolean = false) => {
  if (!selectedAgv.value) return;
  publisherMode.value = 'instantAction';
};

const closePublisher = () => {
  publisherMode.value = null;
};

const handlePublisherPublished = () => {
  publisherMode.value = null;
};

// Automatically show state message when stateInfo becomes available or AGV changes
watch([stateInfo, selectedAgv], ([newStateInfo], [oldStateInfo, oldSelectedAgv]) => {
  // Show state message if:
  // 1. State info is available AND
  // 2. AGV has changed (reset to default)
  // 3. Publisher is not open
  if (newStateInfo && selectedAgv.value !== oldSelectedAgv && !publisherMode.value) {
    showJson('State Message', () => stateInfo.value);
  }
}, { immediate: true });

// Reset publisher when AGV changes
watch(selectedAgv, () => {
  if (publisherMode.value) {
    publisherMode.value = null;
  }
});
</script>

<template>
  <div class="h-full w-full border-r bg-background flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b font-semibold flex items-center justify-between h-[68px]">
      <span>{{ selectedAgv?.serialNumber || 'N/A' }}</span>
      <div class="flex items-center gap-2">
        <Button
          v-if="selectedAgv && !publisherMode"
          variant="outline"
          size="sm"
          class="h-8 text-xs"
          @click="initOrderPublisher"
        >
          <Icon icon="material-symbols:add-circle-outline" class="w-4 h-4 mr-1" />
          Create Order
        </Button>
        <Button
          v-if="selectedAgv && !publisherMode"
          variant="outline"
          size="sm"
          class="h-8 text-xs"
          @click="initInstantActionPublisher"
        >
          <Icon icon="material-symbols:flash-on" class="w-4 h-4 mr-1" />
          Instant Action
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-8 w-8 p-0"
          @click="emit('close')"
        >
          <Icon icon="material-symbols:close" class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4 agv-details-sidebar-content">
      <!-- Order Publisher -->
      <OrderPublisher
        v-if="publisherMode === 'order' && selectedAgv"
        :agv-id="selectedAgv"
        :existing-order="orderInfo || null"
        @close="closePublisher"
        @published="handlePublisherPublished"
      />

      <!-- InstantAction Publisher -->
      <InstantActionPublisher
        v-else-if="publisherMode === 'instantAction' && selectedAgv"
        :agv-id="selectedAgv"
        :existing-instant-actions="instantActionsInfo || null"
        @close="closePublisher"
        @published="handlePublisherPublished"
      />

      <!-- View Mode -->
      <div v-else-if="selectedAgvData" class="space-y-4">
        <!-- State Message Section -->
        <div v-if="stateInfo" class="space-y-2">
          <div class="text-sm font-semibold flex items-center gap-2">
            <Icon icon="material-symbols:info" class="w-4 h-4" />
            State Message
          </div>
          <div class="space-y-1">
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Show State Message', () => stateInfo)"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:code" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Show State Message</span>
              </div>
              <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
            <!-- Errors -->
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              :class="fatalErrorsCount > 0 ? 'text-red-600' : warningErrorsCount > 0 ? 'text-yellow-600' : ''"
              @click="showJson('Errors', () => errors || [])"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:error" class="w-4 h-4 flex-shrink-0" />
                <span class="text-sm truncate">Errors</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[120px]">{{ errorsCount }}</span>
                <span v-if="fatalErrorsCount > 0" class="text-xs text-red-600 truncate max-w-[80px]">({{ fatalErrorsCount }} fatal)</span>
                <span v-else-if="warningErrorsCount > 0" class="text-xs text-yellow-600 truncate max-w-[100px]">({{ warningErrorsCount }} warnings)</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>

            <!-- Loads -->
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Loads', () => loads || [])"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:view-in-ar" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Loads</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[120px]">{{ loadsCount }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>

            <!-- Actions -->
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Action States', () => actionStates || [])"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:pending-actions" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Actions</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[120px]">{{ actionsCount }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>

            <!-- Operating Mode -->
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Operating Mode', () => ({ operatingMode: stateInfo.operatingMode || 'N/A' }))"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:auto-mode" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Operating Mode</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[150px]">{{ stateInfo.operatingMode || 'N/A' }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>

            <!-- Battery State -->
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Battery State', () => stateInfo.batteryState || { batteryLevel: stateInfo.batteryLevel })"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:battery-charging-full" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Battery</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span v-if="stateInfo.batteryLevel !== undefined" class="text-sm font-medium truncate max-w-[120px]">{{ stateInfo.batteryLevel }}%</span>
                <span v-else-if="stateInfo.batteryState" class="text-sm font-medium truncate max-w-[120px]">View</span>
                <span v-else class="text-sm font-medium truncate max-w-[120px] text-muted-foreground">N/A</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>

            <!-- AGV Position -->
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('AGV Position', () => stateInfo.agvPosition || {})"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:location-on" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Position</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span 
                  v-if="stateInfo.agvPosition && stateInfo.agvPosition.x !== undefined && stateInfo.agvPosition.y !== undefined" 
                  class="text-sm font-medium truncate max-w-[180px]"
                >
                  ({{ stateInfo.agvPosition.x.toFixed(2) }}, {{ stateInfo.agvPosition.y.toFixed(2) }}<span v-if="stateInfo.agvPosition.theta !== undefined">, {{ stateInfo.agvPosition.theta.toFixed(2) }}°</span>)
                </span>
                <span v-else class="text-sm font-medium truncate max-w-[120px] text-muted-foreground">N/A</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>

        <!-- Orders Section -->
        <div v-if="orderInfo" class="space-y-2">
          <div class="text-sm font-semibold flex items-center gap-2">
            <Icon icon="material-symbols:list-alt" class="w-4 h-4" />
            Order Message
          </div>
          <div class="space-y-1">
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Order Message', () => orderInfo)"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:code" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Show Order Message</span>
              </div>
              <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground" />
            </div>
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Order Information', () => orderInfo || {})"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:label" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Order ID</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[200px]">{{ orderId || 'N/A' }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Order Update ID', () => ({ orderUpdateId }))"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:update" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Update ID</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[120px]">{{ orderUpdateId !== undefined ? orderUpdateId : 'N/A' }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Order Header ID', () => ({ orderHeaderId }))"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:label" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Header ID</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[150px]">{{ orderHeaderId || 'N/A' }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Order Nodes', () => orderInfo?.nodes || [])"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:account-tree" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Nodes</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[120px]">{{ orderNodesCount }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Order Edges', () => orderInfo?.edges || [])"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:route" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Edges</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[120px]">{{ orderEdgesCount }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Order Timestamp', () => ({ timestamp: orderTimestamp }))"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:schedule" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Timestamp</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[180px]">{{ orderTimestamp || 'N/A' }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>

        <!-- Instant Actions Section -->
        <div v-if="instantActionsInfo" class="space-y-2">
          <div class="text-sm font-semibold flex items-center gap-2">
            <Icon icon="material-symbols:flash-on" class="w-4 h-4" />
            Instant Actions
          </div>
          <div class="space-y-1">
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Full Instant Actions', () => instantActionsInfo)"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:code" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Full Instant Actions</span>
              </div>
              <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground" />
            </div>
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="initInstantActionPublisher(true)"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:edit" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Edit Instant Actions</span>
              </div>
              <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground" />
            </div>
            <div 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('Instant Actions', () => instantActionsInfo)"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:bolt" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Count</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[120px]">{{ instantActionsCount }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
            <div 
              v-for="(action, index) in instantActionsArray.slice(0, 3)" 
              :key="index"
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson(`Instant Action ${index + 1}`, () => instantActionsArray[index])"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:flash-on" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">Action {{ index + 1 }}</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span v-if="action.instantActionId" class="text-sm font-medium truncate max-w-[150px]">{{ action.instantActionId }}</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
            <div 
              v-if="instantActionsCount > 3" 
              class="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors min-w-0"
              @click="showJson('All Instant Actions', () => instantActionsArray)"
            >
              <div class="flex items-center gap-2 min-w-0 flex-shrink">
                <Icon icon="material-symbols:more-horiz" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span class="text-sm truncate">More Actions</span>
              </div>
              <div class="flex items-center gap-1 min-w-0 flex-shrink">
                <span class="text-sm font-medium truncate max-w-[120px]">+{{ instantActionsCount - 3 }} more</span>
                <Icon icon="material-symbols:chevron-right" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-muted-foreground text-center mt-10">
        Select an AGV to view details
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling for light and dark mode */
.agv-details-sidebar-content {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

.agv-details-sidebar-content::-webkit-scrollbar {
  width: 8px;
}

.agv-details-sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.agv-details-sidebar-content::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.agv-details-sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

/* Dark mode specific scrollbar styling */
.dark .agv-details-sidebar-content {
  scrollbar-color: hsl(var(--muted-foreground) / 0.4) transparent;
}

.dark .agv-details-sidebar-content::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.4);
}

.dark .agv-details-sidebar-content::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.6);
}
</style>


