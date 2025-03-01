<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import { ref, computed, watch, onMounted } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import configs from "@/utils/configs";

const props = defineProps({
  agv: { type: VDA5050Agv, required: true },
});
const orderShow = ref(false);
const orderGraphShow = ref(false);
const instantActionsShow = ref(false);
const messageHistoryShow = ref(false);
const activeHistoryTab = ref('orders');

// Message history
const MAX_HISTORY_ITEMS = 5;
const orderHistory = ref<any[]>([]);
const instantActionsHistory = ref<any[]>([]);

// Search functionality
const orderSearchQuery = ref('');
const instantActionsSearchQuery = ref('');
const isSearching = computed(() => orderSearchQuery.value || instantActionsSearchQuery.value);

// Function to copy JSON data to clipboard
const copyToClipboard = (data: any) => {
  const jsonString = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(jsonString)
    .then(() => {
      alert('JSON copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
    });
};

// Copy specific data based on type
const copyOrderData = () => copyToClipboard(props.agv.orderInfo.value);
const copyInstantActionsData = () => copyToClipboard(props.agv.instantActionsInfo.value);
const copyHistoryItem = (item: any) => copyToClipboard(item);

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

// Computed properties for filtered data
const filteredOrderData = computed(() => {
  return searchInJson(props.agv.orderInfo.value, orderSearchQuery.value);
});

const filteredInstantActionsData = computed(() => {
  return searchInJson(props.agv.instantActionsInfo.value, instantActionsSearchQuery.value);
});

// Clear search
const clearOrderSearch = () => {
  orderSearchQuery.value = '';
};

const clearInstantActionsSearch = () => {
  instantActionsSearchQuery.value = '';
};

// Watch for changes in order and instant actions data to update history
watch(() => props.agv.orderInfo.value, (newValue) => {
  if (newValue) {
    // Create a timestamp for the history item
    const historyItem = {
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(newValue)),
      type: 'order'
    };
    
    // Add to history and maintain max length
    orderHistory.value.unshift(historyItem);
    if (orderHistory.value.length > MAX_HISTORY_ITEMS) {
      orderHistory.value = orderHistory.value.slice(0, MAX_HISTORY_ITEMS);
    }
  }
}, { deep: true });

watch(() => props.agv.instantActionsInfo.value, (newValue) => {
  if (newValue) {
    // Create a timestamp for the history item
    const historyItem = {
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(newValue)),
      type: 'instantAction'
    };
    
    // Add to history and maintain max length
    instantActionsHistory.value.unshift(historyItem);
    if (instantActionsHistory.value.length > MAX_HISTORY_ITEMS) {
      instantActionsHistory.value = instantActionsHistory.value.slice(0, MAX_HISTORY_ITEMS);
    }
  }
}, { deep: true });

// Format timestamp for display
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// Initialize history with current values if available
onMounted(() => {
  if (props.agv.orderInfo.value) {
    orderHistory.value.push({
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(props.agv.orderInfo.value)),
      type: 'order'
    });
  }
  
  if (props.agv.instantActionsInfo.value) {
    instantActionsHistory.value.push({
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(props.agv.instantActionsInfo.value)),
      type: 'instantAction'
    });
  }
});
</script>

<template>
  <ui-divider class="mb-2 mt-2 card-divider"></ui-divider>
  <div class="card-header-div">
    <div style="display: flex">
      <div class="card-font-bold">Master Controller -> AGV</div>
      <div class="card-font" style="margin-left: 20px">
        Header : {{ props.agv.orderInfo.value?.headerId }}
      </div>
    </div>
    <ui-chips class="flex-right">
      <ui-chip icon="raw_on" @click="orderShow = !orderShow" @dblclick="copyOrderData"> Order </ui-chip>
      <ui-chip icon="raw_on" @click="instantActionsShow = !instantActionsShow" @dblclick="copyInstantActionsData">
        Instant Actions
      </ui-chip>
      <ui-chip
        icon="disabled_visible"
        @click="orderGraphShow = !orderGraphShow"
        v-if="orderGraphShow"
      >
        Hide
      </ui-chip>
      <ui-chip
        icon="remove_red_eye"
        @click="orderGraphShow = !orderGraphShow"
        v-else
      >
        Show
      </ui-chip>
      <ui-chip icon="history" @click="messageHistoryShow = !messageHistoryShow">
        History
      </ui-chip>
      <ui-chip icon="av_timer">
        {{ props.agv.orderInfo.value?.timestamp }}
      </ui-chip>
    </ui-chips>
  </div>
  <div class="card-header-div">
    <div v-if="props.agv.stateInfo.value" style="display: flex">
      <div class="card-font">
        Order : {{ props.agv.orderInfo.value?.orderId }}
      </div>
      <div class="card-font mal-1">
        Update : {{ props.agv.orderInfo.value?.orderUpdateId }}
      </div>
    </div>
  </div>

  <!-- Message History Section -->
  <div v-if="messageHistoryShow" class="history-container">
    <div class="history-header">
      <span>Message History (Last {{ MAX_HISTORY_ITEMS }})</span>
    </div>
    
    <div class="history-tabs">
      <button 
        class="history-tab" 
        :class="{ active: activeHistoryTab === 'orders' }" 
        @click="activeHistoryTab = 'orders'"
      >
        Orders ({{ orderHistory.length }})
      </button>
      <button 
        class="history-tab" 
        :class="{ active: activeHistoryTab === 'instantActions' }" 
        @click="activeHistoryTab = 'instantActions'"
      >
        Instant Actions ({{ instantActionsHistory.length }})
      </button>
    </div>
    
    <div v-if="activeHistoryTab === 'orders'" class="history-list">
      <div v-if="orderHistory.length === 0" class="no-history">
        No order history available
      </div>
      <div v-for="(item, index) in orderHistory" :key="index" class="history-item">
        <div class="history-item-header">
          <div class="history-item-info">
            <span class="history-timestamp">{{ formatTimestamp(item.timestamp) }}</span>
            <span class="history-id" v-if="item.data.orderId">Order ID: {{ item.data.orderId }}</span>
          </div>
          <button class="copy-btn" @click="copyHistoryItem(item.data)">
            <i class="material-icons">content_copy</i>
          </button>
        </div>
        <vue-json-pretty
          :data="{ key: item.data }"
          :show-double-quotes="true"
          :show-length="true"
          :collapsed="true"
          :collapsed-on-click-brackets="true"
        />
      </div>
    </div>
    
    <div v-if="activeHistoryTab === 'instantActions'" class="history-list">
      <div v-if="instantActionsHistory.length === 0" class="no-history">
        No instant actions history available
      </div>
      <div v-for="(item, index) in instantActionsHistory" :key="index" class="history-item">
        <div class="history-item-header">
          <div class="history-item-info">
            <span class="history-timestamp">{{ formatTimestamp(item.timestamp) }}</span>
            <span class="history-id" v-if="item.data.instantActionId">Action ID: {{ item.data.instantActionId }}</span>
          </div>
          <button class="copy-btn" @click="copyHistoryItem(item.data)">
            <i class="material-icons">content_copy</i>
          </button>
        </div>
        <vue-json-pretty
          :data="{ key: item.data }"
          :show-double-quotes="true"
          :show-length="true"
          :collapsed="true"
          :collapsed-on-click-brackets="true"
        />
      </div>
    </div>
  </div>

  <v-network-graph
    style="height: 750px"
    zoom-level="100"
    :nodes="props.agv.nodes.value"
    :edges="props.agv.edges.value"
    :layouts="props.agv.layouts.value"
    :configs="configs"
    v-if="props.agv.orderInfo.value && orderGraphShow"
  >
    <template #edge-label="{ edge, ...slotProps }">
      <v-edge-label
        :text="edge.label"
        align="center"
        vertical-align="above"
        v-bind="slotProps"
      />
    </template>
    <template #override-node-label="{ scale, text }">
      <text
        x="0"
        y="0"
        :font-size="9 * scale"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#ffffff"
        v-if="text == agv.agvId.serialNumber"
        >{{ text }}</text
      >
    </template>
  </v-network-graph>
  
  <div v-if="orderShow" class="json-container">
    <div class="json-header">
      <span>Order Data</span>
      <div class="json-actions">
        <div class="search-container">
          <input 
            type="text" 
            v-model="orderSearchQuery" 
            placeholder="Search in JSON..." 
            class="search-input"
          />
          <button v-if="orderSearchQuery" @click="clearOrderSearch" class="clear-search-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <button class="copy-btn" @click="copyOrderData">
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <vue-json-pretty
      :data="orderSearchQuery ? { key: filteredOrderData } : { key: props.agv.orderInfo.value }"
      :show-double-quotes="true"
      :show-length="true"
      :show-line="true"
      :highlight-mouseover-node="true"
      :highlight-selected-node="true"
      :collapsed-on-click-brackets="true"
    />
  </div>
  
  <div v-if="instantActionsShow" class="json-container">
    <div class="json-header">
      <span>Instant Actions Data</span>
      <div class="json-actions">
        <div class="search-container">
          <input 
            type="text" 
            v-model="instantActionsSearchQuery" 
            placeholder="Search in JSON..." 
            class="search-input"
          />
          <button v-if="instantActionsSearchQuery" @click="clearInstantActionsSearch" class="clear-search-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <button class="copy-btn" @click="copyInstantActionsData">
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <vue-json-pretty
      :data="instantActionsSearchQuery ? { key: filteredInstantActionsData } : { key: props.agv.instantActionsInfo.value }"
      :show-double-quotes="true"
      :show-length="true"
      :show-line="true"
      :highlight-mouseover-node="true"
      :highlight-selected-node="true"
      :collapsed-on-click-brackets="true"
    />
  </div>
</template>

<style lang="scss" scoped>
.json-container, .history-container {
  position: relative;
  margin-top: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}

.json-header, .history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #eee;
  font-weight: bold;
}

.json-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 6px 10px;
  padding-right: 30px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 200px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #aaa;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.05);
  }
}

.clear-search-btn {
  position: absolute;
  right: 5px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  
  i {
    font-size: 16px;
    color: #999;
    
    &:hover {
      color: #333;
    }
  }
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  i {
    font-size: 18px;
  }
}

// History styles
.history-tabs {
  display: flex;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.history-tab {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  
  &:hover {
    background-color: #f0f0f0;
  }
  
  &.active {
    border-bottom-color: #2196F3;
    font-weight: bold;
  }
}

.history-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}

.history-item {
  margin-bottom: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.history-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-timestamp {
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

.history-id {
  font-size: 12px;
  color: #333;
}

.no-history {
  padding: 16px;
  text-align: center;
  color: #666;
  font-style: italic;
}

// Add tooltip for chips with double-click functionality
ui-chip {
  position: relative;
  
  &[icon="raw_on"] {
    cursor: pointer;
    
    &:after {
      content: "Double-click to copy";
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      white-space: nowrap;
      z-index: 10;
    }
    
    &:hover:after {
      opacity: 1;
    }
  }
}
</style>
