import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Ref } from "vue";
import type { Edges, Layouts, Nodes } from "v-network-graph";
import { MqttClientState } from "@/types/mqtt.types";
import type { AgvId } from "@/types/vda5050.types";
import { Topic } from "@/types/mqtt.types";

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

  // Computed properties
  const connected = computed(
    () => connectionState.value === MqttClientState.CONNECTED
  );

  const agvList = computed(() => Array.from(agvDataMap.value.values()));

  const getAgvData = computed(() => (agvId: AgvId) => {
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
    return agvDataMap.value.get(key);
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

  function addRobot(agvId: AgvId) {
    const exists = robotList.value.some(
      (robot) =>
        robot.serialNumber === agvId.serialNumber &&
        robot.manufacturer === agvId.manufacturer
    );

    if (!exists) {
      robotList.value.push(agvId);
    }
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

    // Also remove from agvDataMap
    const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
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
  }

  return {
    // State
    connectionState,
    messages,
    robotList,
    agvDataMap,
    selectedAgv,
    config,

    // Computed
    connected,
    agvList,
    getAgvData,

    // Actions
    setConnectionState,
    addMessage,
    addRobot,
    removeRobot,
    initializeAgvData,
    updateAgvData,
    updateAgvMessage,
    setSelectedAgv,
    setConfig,
    clearMessages,
    clearAll,
  };
});
