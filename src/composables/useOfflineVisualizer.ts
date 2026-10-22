import { ref, toRef } from "vue";
import { useMqttStore } from "@/stores/mqtt";
import { useLayoutStore } from "@/stores/layout";
import type { AgvId } from "@/types/vda5050.types";

const isOpen = ref(false);

// Persistent editor state across opens and closes
const orderJson = ref("");
const stateJson = ref("");
const activeTab = ref<"order" | "state">("order");

export interface OfflineVisualizationPayload {
  order?: any;
  state?: any;
  manufacturer?: string;
  serialNumber?: string;
  setInitialStateFromOrder?: boolean;
  selectAgv?: boolean;
}

export function useOfflineVisualizer() {
  const mqttStore = useMqttStore();
  const layoutStore = useLayoutStore();

  const open = () => {
    layoutStore.openOfflineSidebar();
  };

  const close = () => {
    isOpen.value = false;
    layoutStore.closeOfflineSidebar();
  };

  const openSidebarOffline = () => {
    layoutStore.openOfflineSidebar();
  };

  const closeSidebarOffline = () => {
    layoutStore.closeOfflineSidebar();
  };

  const editRobot = (agvId: AgvId) => {
    const agvData = mqttStore.getAgvData(agvId);
    if (agvData) {
      if (agvData.orderInfo) {
        orderJson.value = JSON.stringify(agvData.orderInfo, null, 2);
      }
      if (agvData.stateInfo) {
        stateJson.value = JSON.stringify(agvData.stateInfo, null, 2);
      }

      if (agvData.orderInfo) {
        activeTab.value = "order";
      } else if (agvData.stateInfo) {
        activeTab.value = "state";
      }
    }
    openSidebarOffline();
  };

  const resetEditor = () => {
    orderJson.value = "";
    stateJson.value = "";
  };

  const visualizeOffline = (payload: OfflineVisualizationPayload) => {
    const { order, state, setInitialStateFromOrder = true } = payload;

    if (!order && !state) {
      throw new Error("Please provide at least an Order message or a State message.");
    }

    // Determine manufacturer and serialNumber
    const manufacturer =
      payload.manufacturer?.trim() ||
      order?.manufacturer?.trim() ||
      state?.manufacturer?.trim() ||
      "offline_mfg";

    const serialNumber =
      payload.serialNumber?.trim() ||
      order?.serialNumber?.trim() ||
      state?.serialNumber?.trim() ||
      "offline_agv_1";

    const agvId: AgvId = { manufacturer, serialNumber };

    // Ensure robot and controller exist in Pinia store
    mqttStore.addRobot(agvId, true);
    const controller = mqttStore.ensureControllerForRobot(agvId);

    if (!controller) {
      throw new Error("Failed to initialize AGV controller for offline visualization.");
    }

    const version = order?.version || state?.version || "2.0.0";
    const baseTopic = `uagv/v2/${manufacturer}/${serialNumber}`;

    // 1. Mark AGV as online via connection topic
    const connTopic = `${baseTopic}/connection`;
    const connectionMessage = {
      headerId: 1,
      timestamp: new Date().toISOString(),
      version,
      manufacturer,
      serialNumber,
      connectionState: "ONLINE",
    };
    controller.handleMqttMessage(connTopic, connectionMessage);
    mqttStore.addMessage(connTopic, connectionMessage);

    // 2. Handle Order message if provided
    if (order) {
      // Ensure matching identifiers
      const orderToApply = {
        ...order,
        manufacturer,
        serialNumber,
        version: order.version || version,
        timestamp: order.timestamp || new Date().toISOString(),
      };

      const orderTopic = `${baseTopic}/order`;
      controller.handleMqttMessage(orderTopic, orderToApply);
      mqttStore.addMessage(orderTopic, orderToApply);
    }

    // 3. Handle State message if provided
    if (state) {
      const stateToApply = {
        ...state,
        manufacturer,
        serialNumber,
        version: state.version || version,
        timestamp: state.timestamp || new Date().toISOString(),
      };

      const stateTopic = `${baseTopic}/state`;
      controller.handleMqttMessage(stateTopic, stateToApply);
      mqttStore.addMessage(stateTopic, stateToApply);
    } else if (order && setInitialStateFromOrder) {
      // If no explicit state was provided, derive an initial state from the first node
      if (Array.isArray(order.nodes) && order.nodes.length > 0) {
        const firstNode = order.nodes[0];
        const pos = firstNode.nodePosition || { x: 0, y: 0 };

        const generatedState = {
          headerId: 1,
          timestamp: new Date().toISOString(),
          version,
          manufacturer,
          serialNumber,
          orderId: order.orderId || `order_${Date.now()}`,
          orderUpdateId: order.orderUpdateId ?? 0,
          lastNodeId: firstNode.nodeId || "0",
          lastNodeSequenceId: firstNode.sequenceId ?? 0,
          agvPosition: {
            x: pos.x ?? 0,
            y: pos.y ?? 0,
            theta: 0,
            mapId: pos.mapId || "default",
            positionInitialized: true,
          },
          velocity: {
            vx: 0,
            vy: 0,
            omega: 0,
          },
          batteryState: {
            batteryCharge: 100,
            charging: false,
          },
          operatingMode: "AUTOMATIC",
          driving: false,
          paused: false,
          errors: [],
          information: [],
          actionStates: [],
          loads: [],
        };

        const stateTopic = `${baseTopic}/state`;
        controller.handleMqttMessage(stateTopic, generatedState);
        mqttStore.addMessage(stateTopic, generatedState);
      }
    }

    // 4. Optionally select the AGV and open right sidebar if requested
    if (payload.selectAgv) {
      mqttStore.setSelectedAgv(agvId);
      layoutStore.openRightSidebar();
    }

    return {
      success: true,
      agvId,
    };
  };

  return {
    isOpen,
    open,
    close,
    showSidebarOffline: toRef(layoutStore, "showSidebarOffline"),
    openSidebarOffline,
    closeSidebarOffline,
    visualizeOffline,
    orderJson,
    stateJson,
    activeTab,
    editRobot,
    resetEditor,
  };
}
