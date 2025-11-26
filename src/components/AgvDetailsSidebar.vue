<script setup lang="ts">
import { computed, ref, unref, watch } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from '@iconify/vue';
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
    showJson('Full State Message', () => stateInfo.value);
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
      <span>AGV Details</span>
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
          <div class="flex flex-wrap gap-2">
            <Badge 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Full State Message', () => stateInfo)"
            >
              <Icon icon="material-symbols:code" class="w-3 h-3 mr-1" />
              Show Full State
            </Badge>
            <!-- Errors -->
            <Badge 
              v-if="errorsCount > 0"
              variant="outline" 
              :class="[
                'cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1',
                fatalErrorsCount > 0 ? 'border-red-500 text-red-600' : warningErrorsCount > 0 ? 'border-yellow-500 text-yellow-600' : ''
              ]"
              @click="showJson('Errors', () => errors)"
            >
              <Icon icon="material-symbols:error" class="w-3 h-3 mr-1" />
              Errors: {{ errorsCount }}
              <span v-if="fatalErrorsCount > 0" class="ml-1">({{ fatalErrorsCount }} fatal)</span>
              <span v-else-if="warningErrorsCount > 0" class="ml-1">({{ warningErrorsCount }} warnings)</span>
            </Badge>

            <!-- Loads -->
            <Badge 
              v-if="loadsCount > 0"
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Loads', () => loads)"
            >
              <Icon icon="material-symbols:view-in-ar" class="w-3 h-3 mr-1" />
              Loads: {{ loadsCount }}
            </Badge>

            <!-- Actions -->
            <Badge 
              v-if="actionsCount > 0"
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Action States', () => actionStates)"
            >
              <Icon icon="material-symbols:pending-actions" class="w-3 h-3 mr-1" />
              Actions: {{ actionsCount }}
            </Badge>

            <!-- Other state info badges -->
            <Badge 
              v-if="stateInfo.operatingMode"
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Operating Mode', () => ({ operatingMode: stateInfo.operatingMode }))"
            >
              <Icon icon="material-symbols:auto-mode" class="w-3 h-3 mr-1" />
              Mode: {{ stateInfo.operatingMode }}
            </Badge>

            <Badge 
              v-if="stateInfo.batteryState"
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Battery State', () => stateInfo.batteryState)"
            >
              <Icon icon="material-symbols:battery-charging-full" class="w-3 h-3 mr-1" />
              Battery
            </Badge>

            <Badge 
              v-if="stateInfo.agvPosition"
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('AGV Position', () => stateInfo.agvPosition)"
            >
              <Icon icon="material-symbols:gps-fixed" class="w-3 h-3 mr-1" />
              Position
            </Badge>
          </div>
        </div>

        <!-- Orders Section -->
        <div v-if="orderInfo" class="space-y-2">
          <div class="text-sm font-semibold flex items-center gap-2">
            <Icon icon="material-symbols:list-alt" class="w-4 h-4" />
            Orders
          </div>
          <div class="flex flex-wrap gap-2">
            <Badge 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Full Order', () => orderInfo)"
            >
              <Icon icon="material-symbols:code" class="w-3 h-3 mr-1" />
              Show Full Order
            </Badge>
            <Badge 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="initOrderPublisher(true)"
            >
              <Icon icon="material-symbols:edit" class="w-3 h-3 mr-1" />
              Edit Order
            </Badge>
            <Badge 
              v-if="orderId" 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5"
              @click="showJson('Order Information', () => orderInfo)"
            >
              {{ orderId }}
            </Badge>
            <Badge 
              v-if="orderUpdateId !== undefined" 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Order Update ID', () => ({ orderUpdateId }))"
            >
              <Icon icon="material-symbols:update" class="w-3 h-3 mr-1" />
              Update: {{ orderUpdateId }}
            </Badge>
            <Badge 
              v-if="orderHeaderId" 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Order Header ID', () => ({ orderHeaderId }))"
            >
              <Icon icon="material-symbols:label" class="w-3 h-3 mr-1" />
              Header: {{ orderHeaderId }}
            </Badge>
            <Badge 
              v-if="orderNodesCount > 0" 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Order Nodes', () => orderInfo.nodes)"
            >
              <Icon icon="material-symbols:account-tree" class="w-3 h-3 mr-1" />
              Nodes: {{ orderNodesCount }}
            </Badge>
            <Badge 
              v-if="orderEdgesCount > 0" 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Order Edges', () => orderInfo.edges)"
            >
              <Icon icon="material-symbols:route" class="w-3 h-3 mr-1" />
              Edges: {{ orderEdgesCount }}
            </Badge>
            <Badge 
              v-if="orderTimestamp" 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Order Timestamp', () => ({ timestamp: orderTimestamp }))"
            >
              <Icon icon="material-symbols:schedule" class="w-3 h-3 mr-1" />
              {{ orderTimestamp }}
            </Badge>
          </div>
        </div>

        <!-- Instant Actions Section -->
        <div v-if="instantActionsInfo" class="space-y-2">
          <div class="text-sm font-semibold flex items-center gap-2">
            <Icon icon="material-symbols:flash-on" class="w-4 h-4" />
            Instant Actions
          </div>
          <div class="flex flex-wrap gap-2">
            <Badge 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Instant Actions', () => instantActionsInfo)"
            >
              <Icon icon="material-symbols:bolt" class="w-3 h-3 mr-1" />
              Count: {{ instantActionsCount }}
            </Badge>
            <Badge 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="initInstantActionPublisher(true)"
            >
              <Icon icon="material-symbols:edit" class="w-3 h-3 mr-1" />
              Edit Instant Actions
            </Badge>
            <Badge 
              v-for="(action, index) in instantActionsArray.slice(0, 3)" 
              :key="index"
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson(`Instant Action ${index + 1}`, () => instantActionsArray[index])"
            >
              <Icon icon="material-symbols:flash-on" class="w-3 h-3 mr-1" />
              Action {{ index + 1 }}
              <span v-if="action.instantActionId" class="ml-1">({{ action.instantActionId }})</span>
            </Badge>
            <Badge 
              v-if="instantActionsCount > 3" 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('All Instant Actions', () => instantActionsArray)"
            >
              <Icon icon="material-symbols:more-horiz" class="w-3 h-3 mr-1" />
              +{{ instantActionsCount - 3 }} more
            </Badge>
            <Badge 
              variant="outline" 
              class="cursor-pointer hover:bg-accent transition-colors px-1 h-5 gap-1"
              @click="showJson('Full Instant Actions', () => instantActionsInfo)"
            >
              <Icon icon="material-symbols:code" class="w-3 h-3 mr-1" />
              Show Full Instant Actions
            </Badge>
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
          <Button
            variant="ghost"
            size="sm"
            class="h-6 w-6 p-0"
            @click="clearJson"
          >
            <Icon icon="material-symbols:close" class="w-4 h-4" />
          </Button>
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


