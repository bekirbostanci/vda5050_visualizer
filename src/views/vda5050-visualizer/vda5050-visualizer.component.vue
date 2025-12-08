<script setup lang="ts">
import { ref, toRaw, onMounted, onUnmounted, computed, watch } from "vue";
import { useColorMode } from "@vueuse/core";
import { createConfigs } from "@/utils/configs";
import { VDA5050Visualizer } from "@/controllers/vda5050-visualizer.controller";
import VDA5050Card from "@/components/vda5050-agv-card/vda5050-agv-card.component.vue";
import SkeletonCard from "@/components/vda5050-agv-card/skeleton-card.vue";
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
const showInstantActionModal = ref(false);

// Dark mode support for network graph
const mode = useColorMode({
  selector: "html",
  attribute: "class",
  modes: {
    dark: "dark",
    light: "",
  },
});
const config = computed(() => createConfigs(mode.value === "dark"));

// Check if Electron is available
const isElectronAvailable = ref(typeof window.electron !== "undefined");

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

// Set default connection type based on Electron availability
const connectionType = ref(isElectronAvailable.value ? "mqtt" : "websocket");

// Add options for connection type based on Electron availability
const connectionOptions = computed(() => {
  const options = [{ label: "WebSocket", value: "websocket" }];

  // Only add MQTT option if Electron is available
  if (isElectronAvailable.value) {
    options.unshift({ label: "MQTT", value: "mqtt" });
  }

  return options;
});

// Watch for changes in connection type to ensure it's valid
onMounted(() => {
  // If Electron is not available and connection type is set to mqtt, change it to websocket
  if (!isElectronAvailable.value && connectionType.value === "mqtt") {
    connectionType.value = "websocket";
  }
});

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
        const interfaceNameToUse = interfaceName.value || "+";
        const topics = [
          `${interfaceNameToUse}/+/+/+/connection`,
          `${interfaceNameToUse}/+/+/+/instantActions`,
          `${interfaceNameToUse}/+/+/+/order`,
          `${interfaceNameToUse}/+/+/+/state`,
          `${interfaceNameToUse}/+/+/+/visualization`,
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

// VDA5050 Action Types Definition
const actionTypes = [
  {
    actionType: "startPause",
    counterAction: "stopPause",
    description:
      "Activates the pause mode. A linked state is required because many AGVs can be paused by using a hardware switch. No more AGV driving movements - reaching next node is not necessary. Actions can continue. Order is resumable.",
    important: true,
    parameters: [],
    linkedState: "paused",
    instant: true,
    node: false,
    edge: false,
  },
  {
    actionType: "stopPause",
    counterAction: "startPause",
    description:
      "Deactivates the pause mode. Movement and all other actions will be resumed (if any). A linked state is required because many AGVs can be paused by using a hardware switch. stopPause can also restart vehicles that were stopped with a hardware button that triggered startPause (if configured).",
    important: true,
    parameters: [],
    linkedState: "paused",
    instant: true,
    node: false,
    edge: false,
  },
  {
    actionType: "startCharging",
    counterAction: "stopCharging",
    description:
      "Activates the charging process. Charging can be done on a charging spot (vehicle standing) or on a charging lane (while driving). Protection against overcharging is responsibility of the vehicle.",
    important: true,
    parameters: [],
    linkedState: ".batteryState.charging",
    instant: true,
    node: true,
    edge: false,
  },
  {
    actionType: "stopCharging",
    counterAction: "startCharging",
    description:
      'Deactivates the charging process to send a new order. The charging process can also be interrupted by the vehicle / charging station e.g. if the battery is full. Battery state is only allowed to be "false" when AGV is ready to receive orders.',
    important: true,
    parameters: [],
    linkedState: ".batteryState.charging",
    instant: true,
    node: true,
    edge: false,
  },
  {
    actionType: "initPosition",
    counterAction: "",
    description:
      "Resets (overrides) the pose of the AGV with the given paramaters.",
    important: true,
    parameters: [
      { key: "x", value: "0", type: "float64", optional: false },
      { key: "y", value: "0", type: "float64", optional: false },
      { key: "theta", value: "0.0", type: "float64", optional: false },
      { key: "mapId", value: "webots", type: "string", optional: false },
      { key: "lastNodeId", value: "node_001", type: "string", optional: false },
    ],
    linkedState:
      ".agvPosition.x, .agvPosition.y, .agvPosition.theta, .agvPosition.mapId, .lastNodeId",
    instant: true,
    node: true,
    edge: false,
  },
  {
    actionType: "stateRequest",
    counterAction: "",
    description: "Requests the AGV to send a new state report",
    important: true,
    parameters: [],
    linkedState: "-",
    instant: true,
    node: false,
    edge: false,
  },
  {
    actionType: "logReport",
    counterAction: "",
    description: "Requests the AGV to generate and store a log report.",
    important: true,
    parameters: [{ key: "reason", value: "", type: "string", optional: false }],
    linkedState: "-",
    instant: true,
    node: false,
    edge: false,
  },
  {
    actionType: "pick",
    counterAction: "drop",
    description:
      "Request the AGV to pick a load. AGVs with multiple load handling devices can process multiple pick operations in parallel. In this case, the paramater lhd needs to be present (e.g. LHD1).",
    important: false,
    parameters: [
      { key: "lhd", value: "", type: "String", optional: true },
      { key: "stationType", value: "", type: "String", optional: false },
      { key: "stationName", value: "", type: "String", optional: true },
      { key: "loadType", value: "", type: "String", optional: false },
      { key: "loadId", value: "", type: "String", optional: true },
      { key: "height", value: "", type: "float64", optional: true },
      { key: "depth", value: "", type: "float64", optional: true },
      { key: "side", value: "", type: "string", optional: true },
    ],
    linkedState: ".load",
    instant: false,
    node: true,
    edge: true,
  },
  {
    actionType: "drop",
    counterAction: "pick",
    description:
      "Request the AGV to drop a load. See action pick for more details.",
    important: false,
    parameters: [
      { key: "lhd", value: "", type: "String", optional: true },
      { key: "stationType", value: "", type: "String", optional: true },
      { key: "stationName", value: "", type: "String", optional: true },
      { key: "loadType", value: "", type: "String", optional: true },
      { key: "loadId", value: "", type: "String", optional: true },
      { key: "height", value: "", type: "float64", optional: true },
      { key: "depth", value: "", type: "float64", optional: true },
    ],
    linkedState: ".load",
    instant: false,
    node: true,
    edge: true,
  },
  {
    actionType: "detectObject",
    counterAction: "",
    description:
      "AGV detects object (e.g. load, charging spot, free parking position).",
    important: true,
    parameters: [
      { key: "objectType", value: "", type: "String", optional: true },
    ],
    linkedState: "-",
    instant: false,
    node: true,
    edge: true,
  },
  {
    actionType: "finePositioning",
    counterAction: "",
    description:
      "On a node, AGV will position exactly on a target. The AGV is allowed to deviate from its node position. On an edge, AGV will e.g. align on stationary equipment while traversing an edge. InstantAction: AGV starts positioning exactly on a target.",
    important: true,
    parameters: [
      { key: "stationType", value: "", type: "String", optional: true },
      { key: "stationName", value: "", type: "String", optional: true },
    ],
    linkedState: "-",
    instant: false,
    node: true,
    edge: true,
  },
  {
    actionType: "waitForTrigger",
    counterAction: "",
    description:
      "AGV has to wait for a trigger on the AGV (e.g. button press, manual loading). Master control is responsible to handle the timeout and has to cancel the order if necessary.",
    important: true,
    parameters: [
      { key: "triggerType", value: "", type: "String", optional: false },
    ],
    linkedState: "-",
    instant: false,
    node: true,
    edge: false,
  },
  {
    actionType: "cancelOrder",
    counterAction: "",
    description:
      "AGV stops as soon as possible. This could be immediately or on the next node. Then the order is deleted. All actions are canceled.",
    important: true,
    parameters: [],
    linkedState: "-",
    instant: true,
    node: false,
    edge: false,
  },
];

// Instant action form data
const selectedAgv = ref<AgvId | null>(null);
const customActionType = ref("");
const instantActionData = ref({
  headerId: 12345,
  timestamp: new Date().toISOString(),
  version: "2.0.0",
  manufacturer: "",
  serialNumber: "",
  actions: [
    {
      actionId: "action_1",
      actionType: "initPosition",
      actionDescription: "Initialize AGV position",
      blockingType: "HARD",
      actionParameters: [
        { key: "x", value: "0", type: "float64", optional: false },
        { key: "y", value: "0", type: "float64", optional: false },
        { key: "theta", value: "0.0", type: "float64", optional: false },
        { key: "mapId", value: "webots", type: "string", optional: false },
        {
          key: "lastNodeId",
          value: "node_001",
          type: "string",
          optional: false,
        },
      ],
    },
  ],
});

// Function to open instant action modal
function openInstantActionModal(agvId?: AgvId) {
  showInstantActionModal.value = true;
  // Reset form with default values
  instantActionData.value.timestamp = new Date().toISOString();
  instantActionData.value.headerId = Math.floor(Math.random() * 100000);
  customActionType.value = "";

  // If agvId is provided, use it; otherwise use the first available AGV
  if (agvId) {
    selectedAgv.value = agvId;
    instantActionData.value.manufacturer = agvId.manufacturer;
    instantActionData.value.serialNumber = agvId.serialNumber;
  } else if (
    vda5050Visualizer &&
    vda5050Visualizer.robotList.value.length > 0
  ) {
    selectedAgv.value = vda5050Visualizer.robotList.value[0];
    instantActionData.value.manufacturer = selectedAgv.value.manufacturer;
    instantActionData.value.serialNumber = selectedAgv.value.serialNumber;
  }
}

// Function to handle instant action event from card
function handleCardInstantAction(agvId: AgvId) {
  openInstantActionModal(agvId);
}

// Function to close modal
function closeInstantActionModal() {
  showInstantActionModal.value = false;
}

// Function to send instant action
function sendInstantAction() {
  if (!selectedAgv.value) {
    alert("Please select an AGV");
    return;
  }

  // Handle custom action type
  let finalActionType = instantActionData.value.actions[0].actionType;
  if (finalActionType === "custom") {
    if (!customActionType.value || customActionType.value.trim() === "") {
      alert("Please enter a custom action type");
      return;
    }
    finalActionType = customActionType.value.trim();
  }

  // Validate action type
  if (!finalActionType || finalActionType.trim() === "") {
    alert("Please select or enter an action type");
    return;
  }

  // Update timestamp
  instantActionData.value.timestamp = new Date().toISOString();
  instantActionData.value.manufacturer = selectedAgv.value.manufacturer;
  instantActionData.value.serialNumber = selectedAgv.value.serialNumber;

  // Prepare the action data for sending (remove type and optional fields, filter empty parameters)
  const actionToSend = {
    ...instantActionData.value,
    actions: [
      {
        ...instantActionData.value.actions[0],
        actionType: finalActionType,
        actionParameters: instantActionData.value.actions[0].actionParameters
          .filter(
            (param: { key: string; value: string }) => param.key && param.value
          )
          .map((param: { key: string; value: string }) => ({
            key: param.key,
            value: param.value,
          })),
      },
    ],
  };

  // Get VDA5050 version from env or default to 2.0.0
  const vdaVersion = import.meta.env.VITE_VDA_VERSION || "2.0.0";
  const majorVersion = `v${vdaVersion.split(".")[0]}`;

  // Construct MQTT topic: interfaceName/majorVersion/manufacturer/serialNumber/instantActions
  const topic = `${interfaceName.value}/${majorVersion}/${selectedAgv.value.manufacturer}/${selectedAgv.value.serialNumber}/instantActions`;

  // Send via MQTT
  if (connectionType.value === "websocket") {
    if (sharedMqttClient.connected) {
      sharedMqttClient.publish(topic, actionToSend);
      console.log("Instant action sent:", topic, actionToSend);
      alert("Instant action sent successfully!");
      closeInstantActionModal();
    } else {
      alert("MQTT client is not connected. Please connect first.");
    }
  } else if (connectionType.value === "mqtt" && window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send("publish-message", {
      topic,
      message: JSON.stringify(actionToSend),
    });
    console.log("Instant action sent via Electron:", topic, actionToSend);
    alert("Instant action sent successfully!");
    closeInstantActionModal();
  } else {
    alert("MQTT client is not connected. Please connect first.");
  }
}

// Watch selected AGV to update form
function onAgvSelected() {
  if (selectedAgv.value) {
    instantActionData.value.manufacturer = selectedAgv.value.manufacturer;
    instantActionData.value.serialNumber = selectedAgv.value.serialNumber;
  }
}

// Function to handle action type change
function onActionTypeChange() {
  // If custom is selected, allow manual entry
  if (instantActionData.value.actions[0].actionType === "custom") {
    // Update the actual action type with custom value
    if (customActionType.value) {
      instantActionData.value.actions[0].actionType = customActionType.value;
    }
    // Keep existing description and parameters, but ensure at least one parameter exists
    if (instantActionData.value.actions[0].actionParameters.length === 0) {
      instantActionData.value.actions[0].actionParameters.push({
        key: "",
        value: "",
        type: "",
        optional: false,
      });
    }
    return;
  }

  // Reset custom action type when switching to standard action
  customActionType.value = "";

  const selectedActionType = actionTypes.find(
    (at: (typeof actionTypes)[0]) =>
      at.actionType === instantActionData.value.actions[0].actionType
  );

  if (selectedActionType) {
    // Update description
    instantActionData.value.actions[0].actionDescription =
      selectedActionType.description;

    // Update parameters
    instantActionData.value.actions[0].actionParameters =
      selectedActionType.parameters.map(
        (param: {
          key: string;
          value: string;
          type: string;
          optional: boolean;
        }) => ({
          key: param.key,
          value: param.value,
          type: param.type,
          optional: param.optional,
        })
      );

    // If no parameters, ensure at least one empty parameter exists
    if (instantActionData.value.actions[0].actionParameters.length === 0) {
      instantActionData.value.actions[0].actionParameters.push({
        key: "",
        value: "",
        type: "",
        optional: false,
      });
    }
  }
}

// Function to add action parameter
function addActionParameter() {
  instantActionData.value.actions[0].actionParameters.push({
    key: "",
    value: "",
    type: "",
    optional: false,
  });
}

// Function to remove action parameter
function removeActionParameter(index: number) {
  if (instantActionData.value.actions[0].actionParameters.length > 1) {
    instantActionData.value.actions[0].actionParameters.splice(index, 1);
  }
}

// Get action type options for select
const actionTypeOptions = [
  ...actionTypes.map((at: (typeof actionTypes)[0]) => ({
    label: at.actionType,
    value: at.actionType,
  })),
  { label: "Custom", value: "custom" },
];

// Check if current action is custom
const isCustomAction = computed(() => {
  return (
    instantActionData.value.actions[0].actionType === "custom" ||
    !actionTypes.some(
      (at: (typeof actionTypes)[0]) =>
        at.actionType === instantActionData.value.actions[0].actionType
    )
  );
});

// Computed property for preview JSON with custom action type
const previewJson = computed(() => {
  const previewData = JSON.parse(JSON.stringify(instantActionData.value));
  if (
    previewData.actions[0].actionType === "custom" &&
    customActionType.value
  ) {
    previewData.actions[0].actionType = customActionType.value;
  }
  // Filter out empty parameters and remove type/optional fields for preview
  previewData.actions[0].actionParameters =
    previewData.actions[0].actionParameters
      .filter(
        (param: { key: string; value: string }) => param.key && param.value
      )
      .map((param: { key: string; value: string }) => ({
        key: param.key,
        value: param.value,
      }));
  return previewData;
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
        class="bg-background"
        style="height: 750px"
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
          @send-instant-action="handleCardInstantAction"
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

    <!-- Instant Action Modal -->
    <div
      v-if="showInstantActionModal"
      class="modal-overlay"
      @click="closeInstantActionModal"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Send Instant Action</h2>
          <ui-icon-button
            @click="closeInstantActionModal"
            icon="close"
          ></ui-icon-button>
        </div>
        <div class="modal-body">
          <ui-grid>
            <ui-grid-cell columns="12">
              <ui-select
                class="w100 mb"
                outlined
                v-model="selectedAgv"
                @change="onAgvSelected"
                :options="
                  (vda5050Visualizer?.robotList.value || []).map((robot) => ({
                    label: `${robot.manufacturer} - ${robot.serialNumber}`,
                    value: robot,
                  }))
                "
              >
                Select AGV
              </ui-select>
            </ui-grid-cell>
            <ui-grid-cell columns="6">
              <ui-textfield
                class="w100 mb"
                outlined
                v-model.number="instantActionData.headerId"
              >
                Header ID
              </ui-textfield>
            </ui-grid-cell>
            <ui-grid-cell columns="6">
              <ui-textfield
                class="w100 mb"
                outlined
                v-model="instantActionData.version"
              >
                Version
              </ui-textfield>
            </ui-grid-cell>
            <ui-grid-cell columns="12">
              <h3 style="margin-top: 20px; margin-bottom: 10px">
                Action Details
              </h3>
            </ui-grid-cell>
            <ui-grid-cell columns="6">
              <ui-textfield
                class="w100 mb"
                outlined
                v-model="instantActionData.actions[0].actionId"
              >
                Action ID
              </ui-textfield>
            </ui-grid-cell>
            <ui-grid-cell
              columns="6"
              v-if="instantActionData.actions[0].actionType !== 'custom'"
            >
              <ui-select
                class="w100 mb"
                outlined
                v-model="instantActionData.actions[0].actionType"
                @change="onActionTypeChange"
                :options="actionTypeOptions"
              >
                Action Type
              </ui-select>
            </ui-grid-cell>
            <ui-grid-cell
              columns="6"
              v-if="instantActionData.actions[0].actionType === 'custom'"
            >
              <ui-textfield
                class="w100 mb"
                outlined
                v-model="customActionType"
                placeholder="Enter custom action type"
              >
                Custom Action Type
              </ui-textfield>
            </ui-grid-cell>
            <ui-grid-cell
              columns="6"
              v-if="instantActionData.actions[0].actionType === 'custom'"
            >
              <ui-button
                outlined
                @click="
                  instantActionData.actions[0].actionType = 'initPosition';
                  customActionType = '';
                  onActionTypeChange();
                "
                style="height: 56px; width: 100%"
              >
                Use Standard Action
              </ui-button>
            </ui-grid-cell>
            <ui-grid-cell columns="12">
              <ui-textfield
                class="w100 mb"
                outlined
                v-model="instantActionData.actions[0].actionDescription"
                :disabled="!isCustomAction"
                :placeholder="isCustomAction ? 'Enter action description' : ''"
              >
                Description
              </ui-textfield>
            </ui-grid-cell>
            <ui-grid-cell columns="12">
              <ui-select
                class="w100 mb"
                outlined
                v-model="instantActionData.actions[0].blockingType"
                :options="[
                  { label: 'HARD', value: 'HARD' },
                  { label: 'SOFT', value: 'SOFT' },
                  { label: 'NONE', value: 'NONE' },
                ]"
              >
                Blocking Type
              </ui-select>
            </ui-grid-cell>
            <ui-grid-cell columns="12">
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-top: 20px;
                  margin-bottom: 10px;
                "
              >
                <h3 style="margin: 0">Action Parameters</h3>
                <ui-button
                  outlined
                  icon="add"
                  @click="addActionParameter"
                  style="height: 36px"
                >
                  Add Parameter
                </ui-button>
              </div>
            </ui-grid-cell>
            <template
              v-for="(param, index) in instantActionData.actions[0]
                .actionParameters"
              :key="index"
            >
              <ui-grid-cell columns="4">
                <ui-textfield
                  class="w100 mb"
                  outlined
                  v-model="param.key"
                  :label="`Parameter ${index + 1} Key${
                    param.type ? ' (' + param.type + ')' : ''
                  }${param.optional ? ' (optional)' : ''}`"
                >
                </ui-textfield>
              </ui-grid-cell>
              <ui-grid-cell columns="4">
                <ui-textfield
                  class="w100 mb"
                  outlined
                  v-model="param.value"
                  :label="`Parameter ${index + 1} Value`"
                  :placeholder="
                    param.type === 'float64'
                      ? '0.0'
                      : param.type === 'String'
                      ? 'text'
                      : ''
                  "
                >
                </ui-textfield>
              </ui-grid-cell>
              <ui-grid-cell columns="2">
                <ui-textfield
                  class="w100 mb"
                  outlined
                  v-model="param.type"
                  label="Type"
                  disabled
                  style="font-size: 12px"
                >
                </ui-textfield>
              </ui-grid-cell>
              <ui-grid-cell columns="2">
                <ui-button
                  outlined
                  icon="delete"
                  @click="removeActionParameter(index)"
                  style="height: 56px; width: 100%"
                  :disabled="
                    instantActionData.actions[0].actionParameters.length <= 1 ||
                    (param.key && !param.optional)
                  "
                >
                  Remove
                </ui-button>
              </ui-grid-cell>
            </template>
            <ui-grid-cell columns="12">
              <div
                style="
                  margin-top: 20px;
                  padding: 15px;
                  background-color: #f5f5f5;
                  border-radius: 4px;
                "
              >
                <h4 style="margin-bottom: 10px">Preview JSON:</h4>
                <pre style="overflow-x: auto; font-size: 12px">{{
                  JSON.stringify(previewJson, null, 2)
                }}</pre>
              </div>
            </ui-grid-cell>
          </ui-grid>
        </div>
        <div class="modal-footer">
          <ui-button outlined @click="closeInstantActionModal"
            >Cancel</ui-button
          >
          <ui-button raised @click="sendInstantAction">Send Action</ui-button>
        </div>
      </div>
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 4px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}
</style>
