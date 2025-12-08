<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import { ref, computed, watch, onMounted } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

const props = defineProps({
  agv: { type: VDA5050Agv, required: true },
});
const stateShow = ref(false);
const errorsShow = ref(false);
const actionsStateShow = ref(false);
const messageHistoryShow = ref(false);
const activeHistoryTab = ref("state");

// Message history
const MAX_HISTORY_ITEMS = 5;
const stateHistory = ref<any[]>([]);
const actionsHistory = ref<any[]>([]);
const errorsHistory = ref<any[]>([]);

// Search functionality
const stateSearchQuery = ref("");
const errorsSearchQuery = ref("");
const actionsSearchQuery = ref("");
const isSearching = computed(
  () =>
    stateSearchQuery.value ||
    errorsSearchQuery.value ||
    actionsSearchQuery.value
);

// Function to copy JSON data to clipboard
const copyToClipboard = (data: any) => {
  const jsonString = JSON.stringify(data, null, 2);
  navigator.clipboard
    .writeText(jsonString)
    .then(() => {
      alert("JSON copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
    });
};

// Copy specific data based on type
const copyStateData = () => copyToClipboard(props.agv.stateInfo.value);
const copyActionsData = () =>
  copyToClipboard(props.agv.stateInfo.value?.actionStates);
const copyErrorsData = () => copyToClipboard(props.agv.stateInfo.value?.errors);
const copyHistoryItem = (item: any) => copyToClipboard(item);

// Search in JSON data
const searchInJson = (json: any, query: string): any => {
  if (!query || query.trim() === "") return json;

  const searchStr = query.toLowerCase();

  // Helper function to check if a value contains the search string
  const containsSearchString = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(searchStr);
  };

  // Recursive function to filter objects and arrays
  const filterData = (data: any): any => {
    if (typeof data !== "object" || data === null) {
      return containsSearchString(data) ? data : undefined;
    }

    if (Array.isArray(data)) {
      const filteredArray = data
        .map((item) => filterData(item))
        .filter((item) => item !== undefined);
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
const filteredStateData = computed(() => {
  return searchInJson(props.agv.stateInfo.value, stateSearchQuery.value);
});

const filteredActionsData = computed(() => {
  return searchInJson(
    props.agv.stateInfo.value?.actionStates,
    actionsSearchQuery.value
  );
});

const filteredErrorsData = computed(() => {
  return searchInJson(
    props.agv.stateInfo.value?.errors,
    errorsSearchQuery.value
  );
});

// Clear search
const clearStateSearch = () => {
  stateSearchQuery.value = "";
};

const clearActionsSearch = () => {
  actionsSearchQuery.value = "";
};

const clearErrorsSearch = () => {
  errorsSearchQuery.value = "";
};

// Watch for changes in state data to update history
watch(
  () => props.agv.stateInfo.value,
  (newValue) => {
    if (newValue) {
      // Create a timestamp for the history item
      const historyItem = {
        timestamp: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(newValue)),
        type: "state",
      };

      // Add to history and maintain max length
      stateHistory.value.unshift(historyItem);
      if (stateHistory.value.length > MAX_HISTORY_ITEMS) {
        stateHistory.value = stateHistory.value.slice(0, MAX_HISTORY_ITEMS);
      }

      // Also track action states if they exist
      if (newValue.actionStates && newValue.actionStates.length > 0) {
        const actionsItem = {
          timestamp: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(newValue.actionStates)),
          type: "actions",
          stateId: newValue.headerId,
        };

        actionsHistory.value.unshift(actionsItem);
        if (actionsHistory.value.length > MAX_HISTORY_ITEMS) {
          actionsHistory.value = actionsHistory.value.slice(
            0,
            MAX_HISTORY_ITEMS
          );
        }
      }

      // Also track errors if they exist
      if (newValue.errors && newValue.errors.length > 0) {
        const errorsItem = {
          timestamp: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(newValue.errors)),
          type: "errors",
          stateId: newValue.headerId,
        };

        errorsHistory.value.unshift(errorsItem);
        if (errorsHistory.value.length > MAX_HISTORY_ITEMS) {
          errorsHistory.value = errorsHistory.value.slice(0, MAX_HISTORY_ITEMS);
        }
      }
    }
  },
  { deep: true }
);

// Format timestamp for display
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

// Initialize history with current values if available
onMounted(() => {
  if (props.agv.stateInfo.value) {
    stateHistory.value.push({
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(props.agv.stateInfo.value)),
      type: "state",
    });

    if (
      props.agv.stateInfo.value.actionStates &&
      props.agv.stateInfo.value.actionStates.length > 0
    ) {
      actionsHistory.value.push({
        timestamp: new Date().toISOString(),
        data: JSON.parse(
          JSON.stringify(props.agv.stateInfo.value.actionStates)
        ),
        type: "actions",
        stateId: props.agv.stateInfo.value.headerId,
      });
    }

    if (
      props.agv.stateInfo.value.errors &&
      props.agv.stateInfo.value.errors.length > 0
    ) {
      errorsHistory.value.push({
        timestamp: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(props.agv.stateInfo.value.errors)),
        type: "errors",
        stateId: props.agv.stateInfo.value.headerId,
      });
    }
  }
});
</script>

<template>
  <ui-divider class="mb-2 mt-2 card-divider"></ui-divider>
  <div class="card-header-div">
    <div class="flex-right">
      <div class="card-font-bold" style="display: inline">
        AGV -> Master Controller
      </div>
      <div class="card-font" style="margin-left: 20px; display: inline">
        Header : {{ props.agv.stateInfo.value?.headerId }}
      </div>
    </div>
    <ui-chips class="flex-right">
      <ui-chip
        icon="raw_on"
        @click="stateShow = !stateShow"
        @dblclick="copyStateData"
      >
        State
      </ui-chip>
      <ui-chip icon="history" @click="messageHistoryShow = !messageHistoryShow">
        History
      </ui-chip>
      <ui-chip icon="av_timer">
        {{ props.agv.stateInfo.value?.timestamp }}
      </ui-chip>
    </ui-chips>
  </div>
  <div class="card-header-div">
    <div class="flex-right" v-if="props.agv.stateInfo.value?.orderId">
      <div class="card-font">
        Order : {{ props.agv.stateInfo.value?.orderId }}
      </div>
      <div class="card-font mal-1">
        Update : {{ props.agv.stateInfo.value?.orderUpdateId }}
      </div>
      <div class="card-font mal-1">
        Last Node Id : {{ props.agv.stateInfo.value?.lastNodeId }}
      </div>
      <div class="card-font mal-1">
        Last Node Sequence : {{ props.agv.stateInfo.value?.lastNodeSequenceId }}
      </div>
    </div>
    <div v-else></div>

    <ui-chips class="flex-right">
      <ui-chip icon="moving" v-if="props.agv.stateInfo.value?.driving">
        Driving
      </ui-chip>
      <ui-chip icon="stop_circle" v-else> Not Driving </ui-chip>
      <ui-chip
        icon="stop_circle"
        v-if="!props.agv.stateInfo.value?.agvPosition?.positionInitialized"
      >
        Not Driving
      </ui-chip>
      <ui-chip
        icon="location_on"
        v-if="props.agv.stateInfo.value?.agvPosition?.positionInitialized"
      >
        Localized
      </ui-chip>
      <ui-chip icon="location_off" v-else> Not Localized </ui-chip>
      <ui-chip icon="view_in_ar" v-if="props.agv.stateInfo.value?.loads">
        Loads : {{ props.agv.stateInfo.value?.loads?.length }}
      </ui-chip>
      <ui-chip
        icon="pending_actions"
        @click="actionsStateShow = !actionsStateShow"
        @dblclick="copyActionsData"
      >
        Actions : {{ props.agv.stateInfo.value?.actionStates?.length }}
      </ui-chip>
      <ui-chip
        icon="errors"
        @click="errorsShow = !errorsShow"
        @dblclick="copyErrorsData"
      >
        Errors : {{ props.agv.stateInfo.value?.errors?.length }}
      </ui-chip>
    </ui-chips>
  </div>

  <!-- Message History Section -->
  <div v-if="messageHistoryShow" class="history-container">
    <div class="history-header">
      <span>Message History (Last {{ MAX_HISTORY_ITEMS }})</span>
    </div>

    <div class="history-tabs">
      <button
        class="history-tab"
        :class="{ active: activeHistoryTab === 'state' }"
        @click="activeHistoryTab = 'state'"
      >
        States ({{ stateHistory.length }})
      </button>
      <button
        class="history-tab"
        :class="{ active: activeHistoryTab === 'actions' }"
        @click="activeHistoryTab = 'actions'"
      >
        Actions ({{ actionsHistory.length }})
      </button>
      <button
        class="history-tab"
        :class="{ active: activeHistoryTab === 'errors' }"
        @click="activeHistoryTab = 'errors'"
      >
        Errors ({{ errorsHistory.length }})
      </button>
    </div>

    <div v-if="activeHistoryTab === 'state'" class="history-list">
      <div v-if="stateHistory.length === 0" class="no-history">
        No state history available
      </div>
      <div
        v-for="(item, index) in stateHistory"
        :key="index"
        class="history-item"
      >
        <div class="history-item-header">
          <div class="history-item-info">
            <span class="history-timestamp">{{
              formatTimestamp(item.timestamp)
            }}</span>
            <span class="history-id" v-if="item.data.headerId"
              >Header ID: {{ item.data.headerId }}</span
            >
            <span class="history-id" v-if="item.data.orderId"
              >Order ID: {{ item.data.orderId }}</span
            >
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

    <div v-if="activeHistoryTab === 'actions'" class="history-list">
      <div v-if="actionsHistory.length === 0" class="no-history">
        No actions history available
      </div>
      <div
        v-for="(item, index) in actionsHistory"
        :key="index"
        class="history-item"
      >
        <div class="history-item-header">
          <div class="history-item-info">
            <span class="history-timestamp">{{
              formatTimestamp(item.timestamp)
            }}</span>
            <span class="history-id" v-if="item.stateId"
              >State ID: {{ item.stateId }}</span
            >
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

    <div v-if="activeHistoryTab === 'errors'" class="history-list">
      <div v-if="errorsHistory.length === 0" class="no-history">
        No errors history available
      </div>
      <div
        v-for="(item, index) in errorsHistory"
        :key="index"
        class="history-item"
      >
        <div class="history-item-header">
          <div class="history-item-info">
            <span class="history-timestamp">{{
              formatTimestamp(item.timestamp)
            }}</span>
            <span class="history-id" v-if="item.stateId"
              >State ID: {{ item.stateId }}</span
            >
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

  <div v-if="stateShow" class="json-container">
    <div class="json-header">
      <span>State Data</span>
      <div class="json-actions">
        <div class="search-container">
          <input
            type="text"
            v-model="stateSearchQuery"
            placeholder="Search in JSON..."
            class="search-input"
          />
          <button
            v-if="stateSearchQuery"
            @click="clearStateSearch"
            class="clear-search-btn"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
        <button class="copy-btn" @click="copyStateData">
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <vue-json-pretty
      :data="
        stateSearchQuery
          ? { key: filteredStateData }
          : { key: props.agv.stateInfo.value }
      "
      :show-double-quotes="true"
      :show-length="true"
      :show-line="true"
      :highlight-mouseover-node="true"
      :highlight-selected-node="true"
      :collapsed-on-click-brackets="true"
    />
  </div>

  <div v-if="actionsStateShow" class="json-container">
    <div class="json-header">
      <span>Action States</span>
      <div class="json-actions">
        <div class="search-container">
          <input
            type="text"
            v-model="actionsSearchQuery"
            placeholder="Search in JSON..."
            class="search-input"
          />
          <button
            v-if="actionsSearchQuery"
            @click="clearActionsSearch"
            class="clear-search-btn"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
        <button class="copy-btn" @click="copyActionsData">
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <vue-json-pretty
      :data="
        actionsSearchQuery
          ? { key: filteredActionsData }
          : { key: props.agv.stateInfo.value?.actionStates }
      "
      :show-double-quotes="true"
      :show-length="true"
      :show-line="true"
      :highlight-mouseover-node="true"
      :highlight-selected-node="true"
      :collapsed-on-click-brackets="true"
    />
  </div>

  <div v-if="errorsShow" class="json-container">
    <div class="json-header">
      <span>Errors</span>
      <div class="json-actions">
        <div class="search-container">
          <input
            type="text"
            v-model="errorsSearchQuery"
            placeholder="Search in JSON..."
            class="search-input"
          />
          <button
            v-if="errorsSearchQuery"
            @click="clearErrorsSearch"
            class="clear-search-btn"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
        <button class="copy-btn" @click="copyErrorsData">
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <vue-json-pretty
      :data="
        errorsSearchQuery
          ? { key: filteredErrorsData }
          : { key: props.agv.stateInfo.value?.errors }
      "
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
.json-container,
.history-container {
  position: relative;
  margin-top: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}

.json-header,
.history-header {
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
    border-bottom-color: #2196f3;
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

  &[icon="raw_on"],
  &[icon="pending_actions"],
  &[icon="errors"] {
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
