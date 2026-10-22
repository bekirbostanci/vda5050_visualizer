import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useOfflineVisualizer } from "@/composables/useOfflineVisualizer";
import { useMqttStore } from "@/stores/mqtt";

describe("useOfflineVisualizer", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("controls sidebar offline visualizer state", () => {
    const {
      showSidebarOffline,
      requestOpenLeftSidebar,
      open,
      close,
      openSidebarOffline,
      closeSidebarOffline,
    } = useOfflineVisualizer();

    expect(showSidebarOffline.value).toBe(false);

    open();
    expect(showSidebarOffline.value).toBe(true);
    expect(requestOpenLeftSidebar.value).toBe(true);

    close();
    expect(showSidebarOffline.value).toBe(false);

    openSidebarOffline();
    expect(showSidebarOffline.value).toBe(true);

    closeSidebarOffline();
    expect(showSidebarOffline.value).toBe(false);
  });

  it("visualizes an Order message directly", () => {
    const { visualizeOffline } = useOfflineVisualizer();
    const mqttStore = useMqttStore();

    const sampleOrder = {
      headerId: 1,
      version: "2.0.0",
      manufacturer: "AcmeRobotics",
      serialNumber: "bot_101",
      orderId: "order_999",
      nodes: [
        {
          nodeId: "n1",
          sequenceId: 0,
          released: true,
          actions: [],
          nodePosition: { x: 5, y: 10, mapId: "mapA" },
        },
        {
          nodeId: "n2",
          sequenceId: 2,
          released: true,
          actions: [],
          nodePosition: { x: 15, y: 10, mapId: "mapA" },
        },
      ],
      edges: [
        {
          edgeId: "e1",
          sequenceId: 1,
          released: true,
          startNodeId: "n1",
          endNodeId: "n2",
          actions: [],
        },
      ],
    };

    const result = visualizeOffline({
      order: sampleOrder,
      setInitialStateFromOrder: true,
    });

    expect(result.success).toBe(true);
    expect(result.agvId.manufacturer).toBe("AcmeRobotics");
    expect(result.agvId.serialNumber).toBe("bot_101");

    // Robot should be registered in store
    expect(mqttStore.robotList).toHaveLength(1);
    expect(mqttStore.robotList[0]).toEqual({
      manufacturer: "AcmeRobotics",
      serialNumber: "bot_101",
    });

    // Selected AGV should not be auto-selected by default to avoid opening unwanted sidebars
    expect(mqttStore.selectedAgv).toBeNull();

    // AGV data should be populated
    const agvData = mqttStore.getAgvData(result.agvId);
    expect(agvData).toBeDefined();
    expect(agvData?.orderInfo?.orderId).toBe("order_999");
    expect(agvData?.nodes["n1"]).toBeDefined();
    expect(agvData?.nodes["n2"]).toBeDefined();
    expect(agvData?.edges["e1"]).toBeDefined();

    // Robot node and position should be set at start node
    expect(agvData?.nodes["robot_bot_101"]).toBeDefined();
    expect(agvData?.layouts.nodes["robot_bot_101"]).toEqual({
      x: 5,
      y: -10,
    });
  });

  it("visualizes a State message directly", () => {
    const { visualizeOffline } = useOfflineVisualizer();
    const mqttStore = useMqttStore();

    const sampleState = {
      headerId: 1,
      version: "2.0.0",
      manufacturer: "TestCorp",
      serialNumber: "agv_42",
      operatingMode: "AUTOMATIC",
      agvPosition: {
        x: 12.5,
        y: 8.5,
        theta: 3.14,
        mapId: "warehouse",
        positionInitialized: true,
      },
      batteryState: {
        batteryCharge: 77,
        charging: false,
      },
    };

    const result = visualizeOffline({
      state: sampleState,
    });

    expect(result.success).toBe(true);
    const agvData = mqttStore.getAgvData(result.agvId);
    expect(agvData?.stateInfo?.operatingMode).toBe("AUTOMATIC");
    expect(agvData?.stateInfo?.batteryState?.batteryCharge).toBe(77);
    expect(agvData?.layouts.nodes["robot_agv_42"]).toEqual({
      x: 12.5,
      y: -8.5,
    });
  });

  it("throws error if neither Order nor State is provided", () => {
    const { visualizeOffline } = useOfflineVisualizer();
    expect(() => visualizeOffline({})).toThrow(
      "Please provide at least an Order message or a State message."
    );
  });

  it("edits an existing robot and loads its order and state into editor", () => {
    const { visualizeOffline, editRobot, orderJson, stateJson, activeTab, showSidebarOffline } =
      useOfflineVisualizer();

    const order = {
      headerId: 1,
      version: "2.0.0",
      manufacturer: "FleetX",
      serialNumber: "bot_99",
      orderId: "order_initial",
      nodes: [{ nodeId: "n1", sequenceId: 0, nodePosition: { x: 1, y: 2 } }],
    };
    const state = {
      headerId: 1,
      version: "2.0.0",
      manufacturer: "FleetX",
      serialNumber: "bot_99",
      operatingMode: "MANUAL",
    };

    visualizeOffline({ order, state });

    // Call editRobot
    editRobot({ manufacturer: "FleetX", serialNumber: "bot_99" });

    expect(showSidebarOffline.value).toBe(true);
    expect(activeTab.value).toBe("order");
    expect(orderJson.value).toContain("order_initial");
    expect(stateJson.value).toContain("MANUAL");
  });

  it("handles successive updates to the same robot", () => {
    const { visualizeOffline } = useOfflineVisualizer();
    const mqttStore = useMqttStore();

    // Initial state at position (0, 0)
    visualizeOffline({
      state: {
        headerId: 1,
        manufacturer: "FleetX",
        serialNumber: "bot_99",
        agvPosition: { x: 0, y: 0 },
      },
    });

    const agvId = { manufacturer: "FleetX", serialNumber: "bot_99" };
    expect(mqttStore.getAgvData(agvId)?.layouts.nodes["robot_bot_99"]).toEqual({
      x: 0,
      y: -0,
    });

    // Update state to position (25, 30)
    visualizeOffline({
      state: {
        headerId: 2,
        manufacturer: "FleetX",
        serialNumber: "bot_99",
        agvPosition: { x: 25, y: 30 },
      },
    });

    expect(mqttStore.getAgvData(agvId)?.layouts.nodes["robot_bot_99"]).toEqual({
      x: 25,
      y: -30,
    });
  });

  it("selects AGV and triggers requestOpenRightSidebar when selectAgv is true", () => {
    const { visualizeOffline, requestOpenRightSidebar } = useOfflineVisualizer();
    const mqttStore = useMqttStore();

    expect(requestOpenRightSidebar.value).toBe(false);

    visualizeOffline({
      state: {
        headerId: 1,
        manufacturer: "FleetX",
        serialNumber: "bot_123",
        agvPosition: { x: 10, y: 10 },
      },
      selectAgv: true,
    });

    expect(mqttStore.selectedAgv).toEqual({
      manufacturer: "FleetX",
      serialNumber: "bot_123",
    });
    expect(requestOpenRightSidebar.value).toBe(true);
  });
});
