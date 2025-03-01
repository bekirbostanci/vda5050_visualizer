<script setup lang="ts">
import { ref, toRaw, onMounted, onUnmounted, computed } from "vue";
import config from "@/utils/configs";
import { VDA5050Visualizer } from "@/controllers/vda5050-visualizer.controller";
import VDA5050Card from "@/components/vda5050-agv-card/vda5050-agv-card.component.vue";
import SkeletonCard from "@/components/skeleton-card.vue";
import { getMqttClientState } from "@/controllers/vda5050.controller";
import { MqttClientState } from "@/types/mqtt.types";
import { throttle } from "lodash";
import { loadSavedConfig, saveConfig } from "@/types/mqtt-config";
import mqtt from "mqtt";
import { sharedMqttClient } from "@/utils/shared-mqtt-client";


// Define interfaces locally to avoid import issues
interface AgvId {
  manufacturer: string;
  serialNumber: string;
}

// Initialize refs with saved values or defaults
const brokerIp = ref(
  loadSavedConfig().brokerIp || import.meta.env.VITE_MQTT_HOST
);
const brokerPort = ref(
  loadSavedConfig().brokerPort || import.meta.env.VITE_MQTT_PORT
);
const basepath = ref(
  loadSavedConfig().basepath || import.meta.env.VITE_BASEPATH
);
const interfaceName = ref(
  loadSavedConfig().interfaceName || import.meta.env.VITE_VDA_INTERFACE
);
const username = ref(loadSavedConfig().username || "");
const password = ref(loadSavedConfig().password || "");
let vda5050Visualizer: VDA5050Visualizer | undefined;
const version = ref(import.meta.env.VITE_VDA_VERSION);
const settings = ref(false);

// Add new refs for MQTT status
const mqttStatus = ref(MqttClientState.OFFLINE);
const mqttMessages = ref<any[]>([]);
const websocketClient = ref<mqtt.MqttClient | null>(null);

// Add new refs for filtering and pagination
const filterText = ref("");
const itemsPerPage = ref("-1");
const currentPage = ref(1);
const paginationOptions = [
  { label: "Show All", value: "-1" },
  { label: "10 per page", value: "10" },
  { label: "100 per page", value: "100" },
];

const connectionType = ref("websocket");

// Add options for connection type
const connectionOptions = [
  { label: "MQTT", value: "mqtt" },
  { label: "WebSocket", value: "websocket" },
];

function updateBroker() {
  version.value += 1;

  // Save current configuration
  saveConfig({
    brokerIp: brokerIp.value,
    brokerPort: brokerPort.value,
    basepath: basepath.value,
    interfaceName: interfaceName.value,
    username: username.value,
    password: password.value,
    connectionType: connectionType.value,
  });

  vda5050Visualizer = new VDA5050Visualizer({
    host: brokerIp.value,
    port: brokerPort.value,
    basePath: basepath.value,
    interfaceName: interfaceName.value,
    username: username.value,
    password: password.value,
    connectionType: connectionType.value,
  });

  if (connectionType.value === "mqtt") {
    vda5050Visualizer
      .mqttConnect(
        brokerIp.value,
        brokerPort.value.toString(),
        basepath.value,
        interfaceName.value,
        username.value,
        password.value
      )
      .catch((error) => {
        console.error("Failed to connect to MQTT:", error);
      });
  } else if (connectionType.value === "websocket") {
    // Handle WebSocket connection using the shared MQTT client
    const mqttUrl = `ws://${brokerIp.value}:${brokerPort.value}/ws`;
    
    try {
      // Create a new client
      websocketClient.value = mqtt.connect(mqttUrl, {
        clientId: `vda5050_client_${Math.random().toString(16).slice(2, 8)}`,
        username: username.value || undefined,
        password: password.value || undefined,
      });
      
      // Set the client in the shared service
      sharedMqttClient.setClient(websocketClient.value);
      
      websocketClient.value.on("connect", () => {
        console.log("WebSocket connected");
        mqttStatus.value = MqttClientState.CONNECTED;
        
        // Subscribe to topics after connecting
        const topics = [
          `${interfaceName.value}/+/+/+/connection`,
          `${interfaceName.value}/+/+/+/instantActions`,
          `${interfaceName.value}/+/+/+/order`,
          `${interfaceName.value}/+/+/+/state`,
          `${interfaceName.value}/+/+/+/visualization`,
        ];
        
        websocketClient.value?.subscribe(topics, (err?: Error) => {
          if (err) {
            console.error("WebSocket Subscription error:", err);
          } else {
            console.log("Subscribed to WebSocket topics:", topics);
          }
        });
      });
      
      websocketClient.value.on("error", (error: Error) => {
        console.error("WebSocket connection error:", error);
        mqttStatus.value = MqttClientState.OFFLINE;
      });
      
      websocketClient.value.on("close", () => {
        console.log("WebSocket connection closed");
        mqttStatus.value = MqttClientState.OFFLINE;
      });
      
      websocketClient.value.on("reconnect", () => {
        console.log("WebSocket reconnecting");
        mqttStatus.value = MqttClientState.RECONNECTING;
      });
      
      websocketClient.value.on("message", (topic: string, message: Buffer) => {
        try {
          const messageString = new TextDecoder().decode(message);
          const messageObject = JSON.parse(messageString);
          mqttMessages.value.push({ topic, message: messageObject });
          
          // Handle connection messages to update robot list
          if (topic.includes("/connection") && vda5050Visualizer) {
            const agvId = extractAgvIdFromTopic(topic);
            if (agvId && !robotExists(agvId)) {
              vda5050Visualizer.robotList.value.push(agvId);
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      mqttStatus.value = MqttClientState.OFFLINE;
    }
  }
}

// Setup MQTT event listeners
onMounted(() => {
  if (connectionType.value === "mqtt") {
    window.electron.ipcRenderer.on("mqtt-connected", () => {
      console.log("MQTT Connected in component");
      mqttStatus.value = MqttClientState.CONNECTED;
    });

    window.electron.ipcRenderer.on("mqtt-message", (data) => {
      mqttMessages.value.push(data);
    });

    window.electron.ipcRenderer.on("mqtt-error", (error) => {
      console.error("MQTT Error in component:", error);
      mqttStatus.value = MqttClientState.OFFLINE;
    });
  }
});

// Clean up event listeners
onUnmounted(() => {
  if (connectionType.value === "mqtt" && window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.removeAllListeners("mqtt-connected");
    window.electron.ipcRenderer.removeAllListeners("mqtt-message");
    window.electron.ipcRenderer.removeAllListeners("mqtt-error");
  }

  // Disconnect WebSocket client if it exists
  if (websocketClient.value) {
    websocketClient.value.end();
    websocketClient.value = null;
  }

  // Clear graph data
  totalNodes.value = {};
  totalEdges.value = {};
  totalLayouts.value = { nodes: {} };
});

function convertToNestedObject<T extends { [key: string]: any }>(
  array: T[]
): any {
  const result: any = {};

  for (const item of array) {
    for (const key in item) {
      result[key] = item[key];
    }
  }

  return result;
}

var agvs = ref([]);
var skipUnwrap = { itemRefs: agvs };

// Computed properties to combine all nodes, edges, and layouts from all AGVs
const totalNodes = ref();
const totalEdges = ref();
const totalLayouts = ref();

// Throttle the graph updates to reduce memory usage
const updateGraph = throttle(() => {
  if (agvs.value.length > 0) {
    totalNodes.value = agvs.value.map((agv: any) => toRaw(agv.agv.nodes.value));
    totalNodes.value = convertToNestedObject(toRaw(totalNodes.value));
    totalEdges.value = agvs.value.map((agv: any) => toRaw(agv.agv.edges.value));
    totalEdges.value = convertToNestedObject(toRaw(totalEdges.value));
    totalLayouts.value = agvs.value.map((agv: any) =>
      toRaw(agv.agv.layouts.value["nodes"])
    );
    totalLayouts.value = {
      nodes: convertToNestedObject(toRaw(totalLayouts.value)),
    };
  }
}, 500); // Update at most every 500ms

setInterval(updateGraph, 200);

// Add computed property for filtered and paginated robots
const filteredAndPaginatedRobots = computed(() => {
  if (!vda5050Visualizer?.robotList.value) return [];

  let filtered = vda5050Visualizer.robotList.value;

  // Apply filter
  if (filterText.value) {
    filtered = filtered.filter(
      (robot) =>
        robot.serialNumber
          .toLowerCase()
          .includes(filterText.value.toLowerCase()) ||
        robot.manufacturer
          .toLowerCase()
          .includes(filterText.value.toLowerCase())
    );
  }

  // Apply pagination if not showing all
  const perPage = parseInt(itemsPerPage.value);
  if (perPage > 0) {
    const start = (currentPage.value - 1) * perPage;
    const end = start + perPage;
    return filtered.slice(start, end);
  }

  return filtered;
});

// Add computed property for total pages
const totalPages = computed(() => {
  if (!vda5050Visualizer?.robotList.value) return 1;
  const perPage = parseInt(itemsPerPage.value);
  if (perPage <= 0) return 1;
  return Math.ceil(vda5050Visualizer.robotList.value.length / perPage);
});

// Add function to handle page changes
function changePage(page: number) {
  currentPage.value = page;
}

function openGithub() {
  window.open("https://github.com/bekirbostanci/vda5050_visualizer", "_blank");
}

// Helper functions for WebSocket connection
function extractAgvIdFromTopic(topic: string): AgvId | null {
  const parts = topic.split("/");
  return parts.length >= 4
    ? {
        manufacturer: parts[2],
        serialNumber: parts[3],
      }
    : null;
}

function robotExists(agvId: AgvId): boolean {
  if (!vda5050Visualizer) return false;
  return vda5050Visualizer.robotList.value.some(
    (robot) =>
      robot.serialNumber === agvId.serialNumber &&
      robot.manufacturer === agvId.manufacturer
  );
}
</script>
<template>
  <div style="padding: 10px" :key="version">
    <div class="mb">
      <ui-grid>
        <ui-grid-cell columns="3">
          <ui-textfield class="mr w100" outlined v-model="brokerIp">
            Broker IP
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="1">
          <ui-textfield class="mr w100" outlined v-model="brokerPort">
            Broker PORT
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="1">
          <ui-textfield class="mr w100" outlined v-model="basepath">
            Basepath
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="1">
          <ui-textfield class="mr w100" outlined v-model="interfaceName">
            Interface Name
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="2">
          <ui-select
            class="mr w100"
            outlined
            v-model="connectionType"
            :options="connectionOptions"
          >
            Connection Type
          </ui-select>
        </ui-grid-cell>

        <ui-grid-cell
          :columns="{ default: 2, tablet: 2, phone: 2 }"
          v-if="getMqttClientState() == MqttClientState.CONNECTED"
        >
          <ui-button
            class="w100 not-clickable"
            style="height: 56px; color: green"
            outlined
            icon="wifi_tethering"
          >
            {{ getMqttClientState() }}</ui-button
          >
        </ui-grid-cell>
        <ui-grid-cell
          :columns="{ default: 2, tablet: 2, phone: 2 }"
          v-else-if="getMqttClientState() == MqttClientState.OFFLINE"
        >
          <ui-button
            disabled
            class="w100 not-clickable"
            style="height: 55px"
            outlined
            icon="wifi_tethering_off"
          >
            {{ getMqttClientState() }}</ui-button
          >
        </ui-grid-cell>
        <ui-grid-cell
          :columns="{ default: 2, tablet: 2, phone: 2 }"
          v-else-if="getMqttClientState() == MqttClientState.RECONNECTING"
        >
          <ui-button class="w100 not-clickable" style="height: 55px" outlined>
            {{ getMqttClientState() }}</ui-button
          >
        </ui-grid-cell>
        <ui-grid-cell
          style="display: flex"
          :columns="{ default: 2, tablet: 6, phone: 2 }"
        >
          <ui-button
            class="w100"
            style="color: black; height: 55px; margin-right: 20px"
            outlined
            @click="updateBroker()"
            >Start</ui-button
          >
          <ui-fab
            style="
              min-width: 55px;
              background-color: white;
              border-style: solid;
              border-width: 1px;
              border-color: gray;
              box-shadow: none;
            "
            @click="settings = !settings"
            icon="settings"
          ></ui-fab>
        </ui-grid-cell>
        <ui-grid-cell
          columns="12"
          v-if="settings"
          style="display: flex; align-items: center"
        >
          <ui-textfield class="mr w100" outlined v-model="username">
            Username
          </ui-textfield>
          <ui-textfield class="mr w100" outlined v-model="password">
            Password
          </ui-textfield>
          <ui-fab
            style="
              min-width: 55px;
              background-color: white;
              border-style: solid;
              border-width: 1px;
              border-color: gray;
              box-shadow: none;
            "
            @click="openGithub()"
            icon="help"
          ></ui-fab>
        </ui-grid-cell>
      </ui-grid>
    </div>
    <ui-card
      outlined
      style="padding: 10px; margin-bottom: 20px"
      v-if="agvs.length > 0"
    >
      <v-network-graph
        style="height: 750px; background-color: white"
        zoom-level="100"
        :nodes="totalNodes"
        :edges="totalEdges"
        :layouts="totalLayouts"
        :configs="config"
      >
      </v-network-graph>
    </ui-card>
    <div
      v-if="
        vda5050Visualizer !== undefined &&
        vda5050Visualizer?.robotList.value.length > 0
      "
    >
      <ui-grid class="mb">
        <ui-grid-cell columns="8">
          <ui-textfield
            class="w100"
            outlined
            v-model="filterText"
            icon="search"
          >
            Filter Robots
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="4">
          <ui-select
            class="w100"
            outlined
            v-model="itemsPerPage"
            :options="paginationOptions"
          >
            Items per page
          </ui-select>
        </ui-grid-cell>
      </ui-grid>

      <div
        v-for="agv in filteredAndPaginatedRobots"
        v-bind:key="'robot-card-' + agv.serialNumber"
      >
        <VDA5050Card
          :manufacturer="agv.manufacturer"
          :serialNumber="agv.serialNumber"
          :ref="skipUnwrap.itemRefs"
        />
      </div>

      <!-- Pagination controls -->
      <div class="pagination-controls" v-if="itemsPerPage !== '-1'">
        <ui-button
          icon="chevron_left"
          outlined
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        ></ui-button>
        <span class="page-info"
          >Page {{ currentPage }} of {{ totalPages }}</span
        >
        <ui-button
          icon="chevron_right"
          outlined
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        ></ui-button>
      </div>
    </div>
    <SkeletonCard v-else></SkeletonCard>
    <div style="text-align: center; margin-top: 20px; font-size: 15px">
      <p>
        Developed by Bekir Bostanci -
        <a href="https://github.com/bekirbostanci">GitHub</a>
      </p>
    </div>
  </div>
</template>

<style lang="scss">
.mr {
  margin-right: 10px;
}

.mb {
  margin-bottom: 10px;
}

.w100 {
  width: 100%;
}

.not-clickable {
  pointer-events: none;
}

.material-icons.mdc-fab__icon {
  color: black !important;
}

.pagination {
  margin-top: 10px;
  text-align: center;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 10px;
}

.page-info {
  margin: 0 10px;
}
</style>
