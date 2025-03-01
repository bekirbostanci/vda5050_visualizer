<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import { ref, computed } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

const props = defineProps({
  agv: { type: VDA5050Agv, required: true },
});
const stateShow = ref(false);
const errorsShow = ref(false);
const actionsStateShow = ref(false);

// Search functionality
const stateSearchQuery = ref('');
const errorsSearchQuery = ref('');
const actionsSearchQuery = ref('');
const isSearching = computed(() => stateSearchQuery.value || errorsSearchQuery.value || actionsSearchQuery.value);

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
const copyStateData = () => copyToClipboard(props.agv.stateInfo.value);
const copyActionsData = () => copyToClipboard(props.agv.stateInfo.value?.actionStates);
const copyErrorsData = () => copyToClipboard(props.agv.stateInfo.value?.errors);

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
const filteredStateData = computed(() => {
  return searchInJson(props.agv.stateInfo.value, stateSearchQuery.value);
});

const filteredActionsData = computed(() => {
  return searchInJson(props.agv.stateInfo.value?.actionStates, actionsSearchQuery.value);
});

const filteredErrorsData = computed(() => {
  return searchInJson(props.agv.stateInfo.value?.errors, errorsSearchQuery.value);
});

// Clear search
const clearStateSearch = () => {
  stateSearchQuery.value = '';
};

const clearActionsSearch = () => {
  actionsSearchQuery.value = '';
};

const clearErrorsSearch = () => {
  errorsSearchQuery.value = '';
};
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
      <ui-chip icon="raw_on" @click="stateShow = !stateShow"> State </ui-chip>
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
      >
        Actions : {{ props.agv.stateInfo.value?.actionStates?.length }}
      </ui-chip>
      <ui-chip 
        icon="errors" 
        @click="errorsShow = !errorsShow"
      >
        Errors : {{ props.agv.stateInfo.value?.errors?.length }}
      </ui-chip>
    </ui-chips>
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
          <button v-if="stateSearchQuery" @click="clearStateSearch" class="clear-search-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <button class="copy-btn" @click="copyStateData">
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <vue-json-pretty
      :data="stateSearchQuery ? { key: filteredStateData } : { key: props.agv.stateInfo.value }"
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
          <button v-if="actionsSearchQuery" @click="clearActionsSearch" class="clear-search-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <button class="copy-btn" @click="copyActionsData">
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <vue-json-pretty
      :data="actionsSearchQuery ? { key: filteredActionsData } : { key: props.agv.stateInfo.value?.actionStates }"
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
          <button v-if="errorsSearchQuery" @click="clearErrorsSearch" class="clear-search-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <button class="copy-btn" @click="copyErrorsData">
          <i class="material-icons">content_copy</i>
        </button>
      </div>
    </div>
    <vue-json-pretty
      :data="errorsSearchQuery ? { key: filteredErrorsData } : { key: props.agv.stateInfo.value?.errors }"
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
.json-container {
  position: relative;
  margin-top: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}

.json-header {
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

// Add tooltip for chips with double-click functionality
ui-chip {
  position: relative;
  
  &[icon="raw_on"], &[icon="pending_actions"], &[icon="errors"] {
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
