import { ref, computed, toRaw } from "vue";
import { VDA5050Visualizer } from "@/controllers/vda5050-visualizer.controller";
import { MqttClientState } from "@/types/mqtt.types";
import { loadSavedConfig, saveConfig } from "@/types/mqtt-config";
import mqtt from "mqtt";
import { sharedMqttClient } from "@/utils/shared-mqtt-client";
import { useMqttStore } from "@/stores/mqtt";

// Define interfaces
export interface AgvId {
  manufacturer: string;
  serialNumber: string;
}

// Global state - these are still used for configuration
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
const connectionType = ref(
  loadSavedConfig().connectionType ||
    (typeof window.electron !== "undefined" ? "mqtt" : "websocket")
);
const version = ref(0);
const websocketClient = ref<mqtt.MqttClient | null>(null);

let vda5050Visualizer: VDA5050Visualizer | undefined;

export function useVDA5050() {
  const isElectronAvailable = typeof window.electron !== "undefined";
  const mqttStore = useMqttStore();

  // Initialize store config with current values
  mqttStore.setConfig({
    brokerIp: brokerIp.value,
    brokerPort: brokerPort.value,
    basepath: basepath.value,
    interfaceName: interfaceName.value,
    username: username.value,
    password: password.value,
    connectionType: connectionType.value as "mqtt" | "websocket",
  });

  // Initialize visualizer if needed
  if (!vda5050Visualizer) {
    vda5050Visualizer = new VDA5050Visualizer({
      host: brokerIp.value,
      port: brokerPort.value,
      basePath: basepath.value,
      interfaceName: interfaceName.value,
      username: username.value,
      password: password.value,
      connectionType: connectionType.value,
    });
  }

  // Use Pinia store for robot list
  const robotList = computed(() => mqttStore.robotList);

  // Use Pinia store for AGV controllers
  const agvControllers = computed(() => mqttStore.agvControllers);

  function updateBroker() {
    version.value += 1;
    const config = {
      brokerIp: brokerIp.value,
      brokerPort: brokerPort.value,
      basepath: basepath.value,
      interfaceName: interfaceName.value,
      username: username.value,
      password: password.value,
      connectionType: connectionType.value as "mqtt" | "websocket",
    };

    saveConfig(config);

    // Update Pinia store config
    mqttStore.setConfig(config);

    // Re-init visualizer
    vda5050Visualizer = new VDA5050Visualizer({
      host: brokerIp.value,
      port: brokerPort.value,
      basePath: basepath.value,
      interfaceName: interfaceName.value,
      username: username.value,
      password: password.value,
      connectionType: connectionType.value,
    });

    connect();
  }

  function connect() {
    if (connectionType.value === "mqtt") {
      vda5050Visualizer
        ?.mqttConnect(
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
      connectWebsocket();
    }
  }

  function connectWebsocket() {
    const mqttUrl = `ws://${brokerIp.value}:${brokerPort.value}/ws`;
    try {
      if (websocketClient.value) {
        websocketClient.value.end();
      }

      websocketClient.value = mqtt.connect(mqttUrl, {
        clientId: `vda5050_client_${Math.random().toString(16).slice(2, 8)}`,
        username: username.value || undefined,
        password: password.value || undefined,
      });

      sharedMqttClient.setClient(websocketClient.value);

      websocketClient.value.on("connect", () => {
        console.log("WebSocket connected");
        mqttStore.setConnectionState(MqttClientState.CONNECTED);
        subscribeTopics();
      });

      websocketClient.value.on("error", (error: Error) => {
        console.error("WebSocket connection error:", error);
        mqttStore.setConnectionState(MqttClientState.OFFLINE);
      });

      websocketClient.value.on("close", () => {
        console.log("WebSocket connection closed");
        mqttStore.setConnectionState(MqttClientState.OFFLINE);
      });

      websocketClient.value.on("message", handleMessage);
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      mqttStore.setConnectionState(MqttClientState.OFFLINE);
    }
  }

  function subscribeTopics() {
    const interfaceNameToUse = interfaceName.value || "+";
    const topics = [
      `${interfaceNameToUse}/+/+/+/connection`,
      `${interfaceNameToUse}/+/+/+/instantActions`,
      `${interfaceNameToUse}/+/+/+/order`,
      `${interfaceNameToUse}/+/+/+/state`,
      `${interfaceNameToUse}/+/+/+/visualization`,
    ];
    websocketClient.value?.subscribe(topics, (err?: Error) => {
      if (err) console.error("WebSocket Subscription error:", err);
    });
  }

  function handleMessage(topic: string, message: Buffer) {
    try {
      const messageString = new TextDecoder().decode(message);
      const messageObject = JSON.parse(messageString);

      // Handle connection messages for robot list
      // Use store's addRobot with createController=true to create AGV controller
      if (topic.includes("/connection") && vda5050Visualizer) {
        const agvId = extractAgvIdFromTopic(topic);
        if (agvId && !robotExists(agvId)) {
          vda5050Visualizer.robotList.value.push(agvId);
          // Add robot and create controller via Pinia store
          mqttStore.addRobot(agvId, true);
        }
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }

  function extractAgvIdFromTopic(topic: string): AgvId | null {
    const parts = topic.split("/");
    return parts.length >= 4
      ? { manufacturer: parts[2], serialNumber: parts[3] }
      : null;
  }

  function robotExists(agvId: AgvId): boolean {
    return (
      vda5050Visualizer?.robotList.value.some(
        (robot) =>
          robot.serialNumber === agvId.serialNumber &&
          robot.manufacturer === agvId.manufacturer
      ) || false
    );
  }

  function convertToNestedObject(array: any[]) {
    const result: any = {};
    for (const item of array) {
      for (const key in item) {
        result[key] = item[key];
      }
    }
    return result;
  }

  // Computed properties that read from Pinia store
  const mqttStatus = computed(() => mqttStore.connectionState);
  const selectedAgv = computed({
    get: () => mqttStore.selectedAgv,
    set: (value) => mqttStore.setSelectedAgv(value),
  });

  // Graph state computed from store
  const totalNodes = computed(() => {
    const agvList = Array.from(mqttStore.agvDataMap.values());
    if (agvList.length === 0) return {};
    const nodes = agvList
      .filter((agv) => agv?.nodes)
      .map((agv) => toRaw(agv.nodes));
    return convertToNestedObject(nodes);
  });

  const totalEdges = computed(() => {
    const agvList = Array.from(mqttStore.agvDataMap.values());
    if (agvList.length === 0) return {};
    const edges = agvList
      .filter((agv) => agv?.edges)
      .map((agv) => toRaw(agv.edges));
    return convertToNestedObject(edges);
  });

  const totalLayouts = computed(() => {
    const agvList = Array.from(mqttStore.agvDataMap.values());
    if (agvList.length === 0) return { nodes: {} };
    const layouts = agvList
      .filter((agv) => agv?.layouts?.nodes)
      .map((agv) => toRaw(agv.layouts.nodes));
    return { nodes: convertToNestedObject(layouts) };
  });

  return {
    brokerIp,
    brokerPort,
    basepath,
    interfaceName,
    username,
    password,
    connectionType,
    mqttStatus,
    robotList,
    selectedAgv,
    totalNodes,
    totalEdges,
    totalLayouts,
    agvControllers,
    updateBroker,
    connect,
    isElectronAvailable,
    vda5050Visualizer,
    mqttStore, // Expose store for direct access if needed
  };
}
