import { defineStore } from "pinia";
import { ref, computed, markRaw } from "vue";
import type { Ref } from "vue";
import type { Edges, Layouts, Nodes } from "v-network-graph";
import { MqttClientState } from "@/types/mqtt.types";
import { isValidVDA5050Topic } from "@/utils/vda5050-topics";
import type { AgvId } from "@/types/vda5050.types";
import { Topic } from "@/types/mqtt.types";
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";

export interface MqttMessage {
  topic: string;
  message: any;
  timestamp: number;
}

export interface AgvData {
  agvId: AgvId;
  orderInfo: any | null;
  instantActionsInfo: any | null;
  stateInfo: any | null;
  connectionInfo: any | null;
  visualizationInfo: any | null;
  nodes: Nodes;
  edges: Edges;
  layouts: Layouts;
  color: string;
  colors: {
    nodeStandard: string;
    nodeAction: string;
    edgeStandard: string;
    edgeAction: string;
    robot: string;
  };
}

export const useMqttStore = defineStore("mqtt", () => {
  // Connection state
  const connectionState = ref<MqttClientState>(MqttClientState.OFFLINE);

  // All MQTT messages
  const messages = ref<MqttMessage[]>([]);

  // Robot list
  const robotList = ref<AgvId[]>([]);

  // AGV data map: key is "manufacturer/serialNumber"
  const agvDataMap = ref<Map<string, AgvData>>(new Map());

  // Selected AGV
  const selectedAgv = ref<AgvId | null>(null);

  // AGV Controllers Map: key is "manufacturer/serialNumber"
  const agvControllers = ref<Map<string, VDA5050Agv>>(new Map());

  // Connection configuration
  const config = ref({
    brokerIp: "",
    brokerPort: "",
    basepath: "",
    interfaceName: "",
    username: "",
    password: "",
    connectionType: "websocket" as "mqtt" | "websocket",
  });

  // Flag to check if Electron IPC listener is registered
  let electronIpcRegistered = false;

  // Computed properties
  const connected = computed(
    () => connectionState.value === MqttClientState.CONNECTED
  );

  const agvList = computed(() => Array.from(agvDataMap.value.values()));

  const getAgvData = computed(() => (agvId: AgvId) => {
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
    return agvDataMap.value.get(key);
  });

  const getAgvController = computed(() => (agvId: AgvId) => {
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
    return agvControllers.value.get(key);
  });

  // Actions
  function setConnectionState(state: MqttClientState) {
    connectionState.value = state;
  }

  function addMessage(topic: string, message: any) {
    const mqttMessage: MqttMessage = {
      topic,
      message,
      timestamp: Date.now(),
    };
    messages.value.push(mqttMessage);

    // Keep only last 1000 messages to prevent memory issues
    if (messages.value.length > 1000) {
      messages.value = messages.value.slice(-1000);
    }
  }

  function addRobot(agvId: AgvId, createController = false) {
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
    const exists = robotList.value.some(
      (robot) =>
        robot.serialNumber === agvId.serialNumber &&
        robot.manufacturer === agvId.manufacturer
    );

    if (!exists) {
      robotList.value.push(agvId);
    }

    // Create controller if requested and doesn't exist
    if (createController && !agvControllers.value.has(key)) {
      createAgvController(agvId);
    }
  }

  function createAgvController(agvId: AgvId): VDA5050Agv | null {
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;

    // Return existing controller if already created
    if (agvControllers.value.has(key)) {
      return (agvControllers.value.get(key) as unknown as VDA5050Agv) || null;
    }

    console.log(`Creating controller for AGV: ${key}`);

    // Determine MQTT config based on connection type
    const mqttConfig =
      config.value.connectionType === "websocket"
        ? {
            host: config.value.brokerIp,
            port: config.value.brokerPort,
            username: config.value.username,
            password: config.value.password,
          }
        : undefined;

    const agv = new VDA5050Agv(
      agvId.manufacturer,
      agvId.serialNumber,
      config.value.basepath,
      mqttConfig
    );

    // Use markRaw to prevent Vue from proxying the controller instance
    // This is necessary because the controller has internal refs that shouldn't be double-proxied
    agvControllers.value.set(key, markRaw(agv) as any);

    // Setup Electron IPC listener for this AGV if using MQTT connection type
    const isElectronAvailable =
      typeof window !== "undefined" && typeof window.electron !== "undefined";
    if (config.value.connectionType === "mqtt" && isElectronAvailable) {
      setupElectronIpcForAgv(agv);
    }

    return agv;
  }

  function setupElectronIpcForAgv(agv: VDA5050Agv): void {
    // Register a global IPC listener if not already done
    if (!electronIpcRegistered && window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on("mqtt-message", (data: any) => {
        // Route message to appropriate controller
        const topic = data?.topic;
        if (!topic) return;

        // Check if this is a valid VDA5050 topic
        if (isValidVDA5050Topic(topic)) {
          // Extract AGV ID from topic and ensure robot exists
          const parts = topic.split("/");
          if (parts.length >= 4) {
            const agvId: AgvId = {
              manufacturer: parts[2],
              serialNumber: parts[3],
            };

            // Ensure robot is added and controller exists
            addRobot(agvId, true);
          }
        }

        // Route message to appropriate controller
        // Extract AGV ID from topic to avoid substring matching issues (e.g., "s1" matching "s10")
        const topicParts = topic.split("/");
        const topicAgvId: AgvId | null =
          topicParts.length >= 4
            ? {
                manufacturer: topicParts[2],
                serialNumber: topicParts[3],
              }
            : null;

        if (topicAgvId) {
          agvControllers.value.forEach((controller) => {
            try {
              if (
                controller?.agvId?.serialNumber &&
                controller?.agvId?.manufacturer &&
                controller.agvId.serialNumber === topicAgvId.serialNumber &&
                controller.agvId.manufacturer === topicAgvId.manufacturer
              ) {
                controller.handleMqttMessage(topic, data.message);
              }
            } catch (error) {
              console.error(
                "Error handling MQTT message for controller:",
                error
              );
            }
          });
        }
      });
      electronIpcRegistered = true;
    }
  }

  function ensureControllerForRobot(agvId: AgvId): VDA5050Agv | null {
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
    if (!agvControllers.value.has(key)) {
      return createAgvController(agvId);
    }
    return (agvControllers.value.get(key) as unknown as VDA5050Agv) || null;
  }

  function removeRobot(agvId: AgvId) {
    const index = robotList.value.findIndex(
      (robot) =>
        robot.serialNumber === agvId.serialNumber &&
        robot.manufacturer === agvId.manufacturer
    );

    if (index !== -1) {
      robotList.value.splice(index, 1);
    }

    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;

    // Disconnect and remove controller
    const controller = agvControllers.value.get(key);
    if (controller) {
      controller.disconnect();
      agvControllers.value.delete(key);
    }

    // Also remove from agvDataMap
    agvDataMap.value.delete(key);
  }

  function initializeAgvData(
    agvId: AgvId,
    color: string,
    colors: AgvData["colors"]
  ) {
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;

    if (!agvDataMap.value.has(key)) {
      agvDataMap.value.set(key, {
        agvId,
        orderInfo: null,
        instantActionsInfo: null,
        stateInfo: null,
        connectionInfo: null,
        visualizationInfo: null,
        nodes: {},
        edges: {},
        layouts: { nodes: {} },
        color,
        colors,
      });
    }
  }

  function updateAgvData(
    agvId: AgvId,
    updates: Partial<Omit<AgvData, "agvId" | "color" | "colors">>
  ) {
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
    const agvData = agvDataMap.value.get(key);

    if (agvData) {
      // Create a new object to trigger Vue reactivity
      const updatedData = { ...agvData, ...updates };
      agvDataMap.value.set(key, updatedData);
      // Force reactivity by creating a new Map reference
      agvDataMap.value = new Map(agvDataMap.value);
    }
  }

  function updateAgvMessage(agvId: AgvId, topic: string, message: any) {
    const topicType = topic.split("/").pop() as Topic;
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
    const agvData = agvDataMap.value.get(key);

    if (!agvData) {
      console.warn(`AGV data not found for ${key}`);
      return;
    }

    switch (topicType) {
      case Topic.Connection:
        agvData.connectionInfo = message;
        break;
      case Topic.State:
        agvData.stateInfo = message;
        break;
      case Topic.Order:
        agvData.orderInfo = message;
        break;
      case Topic.InstantActions:
        agvData.instantActionsInfo = message;
        break;
      case Topic.Visualization:
        agvData.visualizationInfo = message;
        break;
    }
  }

  function setSelectedAgv(agvId: AgvId | null) {
    selectedAgv.value = agvId;
  }

  function setConfig(newConfig: Partial<typeof config.value>) {
    Object.assign(config.value, newConfig);
  }

  function clearMessages() {
    messages.value = [];
  }

  function clearAll() {
    messages.value = [];
    robotList.value = [];
    agvDataMap.value.clear();
    selectedAgv.value = null;

    // Disconnect and clear all controllers
    agvControllers.value.forEach((controller) => {
      controller.disconnect();
    });
    agvControllers.value.clear();
  }

  return {
    // State
    connectionState,
    messages,
    robotList,
    agvDataMap,
    agvControllers,
    selectedAgv,
    config,

    // Computed
    connected,
    agvList,
    getAgvData,
    getAgvController,

    // Actions
    setConnectionState,
    addMessage,
    addRobot,
    removeRobot,
    createAgvController,
    ensureControllerForRobot,
    initializeAgvData,
    updateAgvData,
    updateAgvMessage,
    setSelectedAgv,
    setConfig,
    clearMessages,
    clearAll,
  };
});
