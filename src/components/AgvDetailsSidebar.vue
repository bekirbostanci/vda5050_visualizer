<script setup lang="ts">
import { computed, ref, unref, watch } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from '@iconify/vue';
import { toast } from "@/components/ui/toast";
import OrderPublisher from "@/components/OrderPublisher.vue";
import InstantActionPublisher from "@/components/InstantActionPublisher.vue";

const emit = defineEmits<{
  close: [];
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

// JSON viewer state - store what to show, not the data itself
const selectedViewType = ref<{
  type: string;
  title: string;
  getData: () => any;
} | null>(null);

// Search functionality
const searchQuery = ref('');

// Search in JSON data
const searchInJson = (json: any, query: string): any => {
  if (!query || query.trim() === '') return json;
  
  const searchStr = query.toLowerCase();
  
  // Helper function to check if a value contains the search string
  const containsSearchString = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(searchStr);
  };
  
  // Recursive function to filter objects and arrays
  const filterData = (data: any): any => {
    if (typeof data !== 'object' || data === null) {
      return containsSearchString(data) ? data : undefined;
    }
    
    if (Array.isArray(data)) {
      const filteredArray = data
        .map(item => filterData(item))
        .filter(item => item !== undefined);
      return filteredArray.length > 0 ? filteredArray : undefined;
    }
    
    const filteredObj: Record<string, any> = {};
    let hasMatch = false;
    
    for (const key in data) {
      if (containsSearchString(key)) {
        filteredObj[key] = data[key];
        hasMatch = true;
        continue;
      }
      
      const filteredValue = filterData(data[key]);
      if (filteredValue !== undefined) {
        filteredObj[key] = filteredValue;
        hasMatch = true;
      }
    }
    
    return hasMatch ? filteredObj : undefined;
  };
  
  const result = filterData(json);
  return result !== undefined ? result : { message: "No matches found" };
};

// Computed property that always returns the latest data
const selectedData = computed(() => {
  if (!selectedViewType.value) return null;
  const data = selectedViewType.value.getData();
  return searchInJson(data, searchQuery.value);
});

const selectedTitle = computed(() => selectedViewType.value?.title || '');

const clearSearch = () => {
  searchQuery.value = '';
};

const showJson = (title: string, getDataFn: () => any) => {
  selectedViewType.value = {
    type: title,
    title,
    getData: getDataFn,
  };
  // Clear search when switching to a different view
  searchQuery.value = '';
};

const clearJson = () => {
  selectedViewType.value = null;
  searchQuery.value = '';
};

// Copy JSON to clipboard
const copyJsonToClipboard = async () => {
  if (!selectedViewType.value) return;
  
  try {
    // Get the raw data (not filtered by search)
    const rawData = selectedViewType.value.getData();
    const jsonString = JSON.stringify(rawData, null, 2);
    
    await navigator.clipboard.writeText(jsonString);
    toast({
      title: "Copied to clipboard",
      description: "JSON data has been copied to your clipboard",
    });
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    toast({
      title: "Copy failed",
      description: "Failed to copy JSON to clipboard",
      variant: "destructive",
    });
  }
};

// Publisher mode state
const publisherMode = ref<'order' | 'instantAction' | null>(null);

// Initialize publishers
const initOrderPublisher = (_useExisting: boolean = false) => {
  if (!selectedAgv.value) return;
  publisherMode.value = 'order';
  selectedViewType.value = null;
};

const initInstantActionPublisher = (_useExisting: boolean = false) => {
  if (!selectedAgv.value) return;
  publisherMode.value = 'instantAction';
  selectedViewType.value = null;
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
  // 2. Either no view is selected OR AGV has changed (reset to default)
  // 3. Publisher is not open
  if (newStateInfo && (!selectedViewType.value || selectedAgv.value !== oldSelectedAgv) && !publisherMode.value) {
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
      <span>{{ selectedAgv?.manufacturer || 'N/A' }} / {{ selectedAgv?.serialNumber || 'N/A' }}</span>
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
          variant="ghost"
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
                <span class="text-sm font-medium truncate max-w-[150px]">{{ orderId || 'N/A' }}</span>
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

      <!-- JSON Viewer Section -->
      <div v-if="selectedData" class="mt-6 pt-6 border-t space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold flex items-center gap-2">
            <Icon icon="material-symbols:code" class="w-4 h-4" />
            {{ selectedTitle }}
          </div>
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              class="h-6 w-6 p-0"
              @click="copyJsonToClipboard"
              title="Copy JSON to clipboard"
            >
              <Icon icon="material-symbols:content-copy" class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 w-6 p-0"
              @click="clearJson"
              title="Close JSON viewer"
            >
              <Icon icon="material-symbols:close" class="w-4 h-4" />
            </Button>
          </div>
        </div>
        <!-- Search Input -->
        <div class="relative">
          <Input
            v-model="searchQuery"
            placeholder="Search in JSON..."
            class="pr-8"
          />
          <Button
            v-if="searchQuery"
            variant="ghost"
            size="sm"
            class="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            @click="clearSearch"
          >
            <Icon icon="material-symbols:close" class="w-3 h-3" />
          </Button>
        </div>
        <div class="border rounded-md p-3 bg-muted/50">
          <vue-json-pretty :data="selectedData" :deep="10" />
        </div>
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


