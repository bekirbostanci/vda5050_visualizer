import type { Edges, Layouts, Nodes } from "v-network-graph";
import { Topic } from "vda-5050-lib";
import { ref } from "vue";
import randomColor from "randomcolor";
import { publishMessage } from "./vda5050.controller";

export interface ColorSchema {
  nodeStandard: string;
  nodeAction: string;
  edgeStandard: string;
  edgeAction: string;
  robot: string;
}

interface VDA5050Error {
  errorType: string;
  errorDescription: string;
  errorLevel: "warning" | "fatal";
  errorReference?: string;
}

interface AgvState {
  position: { x: number; y: number; theta: number };
  velocity: number;
  batteryLevel: number;
  errors: VDA5050Error[];
  loads: any[];
  agvPosition: { x: number; y: number; theta: number };
  operatingMode: string;
  nodeStates: any[];
  edgeStates: any[];
  lastNodeId: string;
  lastNodeSequenceId: number;
  driving: boolean;
  timestamp: string;
}

export class VDA5050AgvController {
  state = ref({
    position: { x: 0, y: 0, theta: 0 },
    velocity: 0,
    batteryLevel: 100,
    errors: [] as VDA5050Error[],
    loads: [],
    agvPosition: { x: 0, y: 0, theta: 0 },
    operatingMode: "AUTOMATIC",
    nodeStates: [],
    edgeStates: [],
    lastNodeId: "",
    lastNodeSequenceId: 0,
    driving: false,
    timestamp: new Date().toISOString(),
  });

  constructor(private serial: string, private basePath: string = "uagv") {}

  publishState() {
    publishMessage(
      `${this.basePath}/${this.serial}/${Topic.State}`,
      this.state.value
    );
  }

  updatePosition(x: number, y: number, theta: number = 0) {
    this.state.value.position = { x, y, theta };
    this.publishState();
  }

  updateBatteryLevel(level: number) {
    this.state.value.batteryLevel = level;
    this.publishState();
  }

  addError(error: VDA5050Error) {
    this.state.value.errors.push(error);
    this.publishState();
  }

  clearErrors() {
    this.state.value.errors = [];
    this.publishState();
  }
}

export class VDA5050Agv {
  public readonly agvId: { manufacturer: string; serialNumber: string };
  public readonly orderInfo = ref<any>();
  public readonly instantActionsInfo = ref<any>();
  public readonly stateInfo = ref<any>();
  public readonly connectionInfo = ref<any>();
  public readonly visualizationInfo = ref<any>();
  public readonly nodes = ref<Nodes>({});
  public readonly edges = ref<Edges>({});
  public readonly layouts = ref<Layouts>({ nodes: {} });
  public readonly color: string;
  private readonly colors: ColorSchema;
  private readonly mqttTopic: string;

  constructor(
    manufacturer: string,
    serialNumber: string,
    private readonly basePath: string = "vda5050"
  ) {
    this.agvId = { manufacturer, serialNumber };
    this.mqttTopic = `${this.basePath}/${this.agvId.manufacturer}/${this.agvId.serialNumber}`;
    this.color = randomColor();
    this.colors = this.generateColors();
    this.subscribeToTopics();
  }

  private subscribeToTopics(): void {
    const topics = [
      `${this.mqttTopic}/${Topic.InstantActions}`,
      `${this.mqttTopic}/${Topic.Order}`,
      `${this.mqttTopic}/${Topic.State}`,
      `${this.mqttTopic}/${Topic.Connection}`,
      `${this.mqttTopic}/${Topic.Visualization}`,
    ];

    topics.forEach((topic) => {
      window.electron.ipcRenderer.send("subscribe-topic", topic);
    });
  }

  private cleanupOldData(): void {
    // Keep only the last 100 messages
    const maxMessages = 100;
    if (this.orderInfo.value?.length > maxMessages) {
      this.orderInfo.value = this.orderInfo.value.slice(-maxMessages);
    }
    if (this.instantActionsInfo.value?.length > maxMessages) {
      this.instantActionsInfo.value = this.instantActionsInfo.value.slice(
        -maxMessages
      );
    }
  }

  public handleMqttMessage(topic: string, message: any): void {
    const topicType = topic.split("/").pop() as Topic;

    const handlers: Partial<Record<Topic, (msg: any) => void>> = {
      [Topic.InstantActions]: (msg) => {
        this.instantActionsInfo.value = msg;
        this.cleanupOldData();
      },
      [Topic.Order]: (msg) => {
        this.handleOrderMessage(msg);
        this.cleanupOldData();
      },
      [Topic.State]: (msg) => this.handleStateMessage(msg),
      [Topic.Connection]: (msg) => (this.connectionInfo.value = msg),
      [Topic.Visualization]: (msg) => this.handleVisualizationMessage(msg),
    };

    handlers[topicType]?.(message);
  }

  private updateAgvPosition(position: { x: number; y: number }): void {
    this.layouts.value.nodes[`robot_${this.agvId.serialNumber}`] = {
      x: position.x,
      y: -position.y,
    };
  }

  private handleStateMessage(state: any): void {
    this.stateInfo.value = state;
    if (state.agvPosition?.x != null && state.agvPosition?.y != null) {
      this.updateAgvPosition(state.agvPosition);
    }
  }

  private handleVisualizationMessage(vis: any): void {
    this.visualizationInfo.value = vis;
    if (vis.agvPosition?.x != null && vis.agvPosition?.y != null) {
      this.updateAgvPosition(vis.agvPosition);
    }
  }

  private handleOrderMessage(order: any): void {
    this.orderInfo.value = order;
    this.updateGraphFromOrder(order);
  }

  private updateGraphFromOrder(order: any): void {
    this.resetGraph();
    this.addNodes(order.nodes || []);
    this.addRobot();
    this.addEdges(order.edges || []);
  }

  private addNodes(nodes: any[]): void {
    nodes.forEach((node) => {
      const nodeId = node.nodeId;
      const hasActions = node.actions?.length > 0;
      const actionTypes = hasActions
        ? node.actions.map((action: any) => action.actionType).join(", ")
        : "";

      this.nodes.value[nodeId] = {
        name: `${this.agvId.serialNumber} - ${node.sequenceId}${
          actionTypes ? ` -> ${actionTypes}` : ""
        }`,
        color: hasActions ? this.colors.nodeAction : this.colors.nodeStandard,
        zIndex: 1,
      };

      if (node.nodePosition) {
        this.layouts.value.nodes[nodeId] = {
          fixed: true,
          x: node.nodePosition.x,
          y: -node.nodePosition.y,
        };
      }
    });
  }

  private addRobot(): void {
    this.nodes.value[`robot_${this.agvId.serialNumber}`] = {
      name: this.agvId.serialNumber,
      color: "#000",
      zIndex: 100,
    };
  }

  private addEdges(edges: any[]): void {
    edges.forEach((edge) => {
      const hasActions = edge.actions?.length > 0;
      const actionTypes = hasActions
        ? edge.actions.map((action: any) => action.actionType).join(", ")
        : "";

      this.edges.value[edge.edgeId] = {
        source: edge.endNodeId,
        target: edge.startNodeId,
        color: hasActions ? "#1abc9c" : "#bdc3c7",
        label: `${this.agvId.serialNumber} - ${edge.sequenceId}${
          actionTypes ? ` -> ${actionTypes}` : ""
        }`,
      };
    });
  }

  private resetGraph(): void {
    this.edges.value = {};
    this.nodes.value = {};
    this.layouts.value = { nodes: {} };
  }

  private generateColors(): ColorSchema {
    const templateColor = randomColor({ hue: Math.random() * 200 });
    const generatedColors = randomColor({ count: 5, hue: templateColor });

    return {
      nodeStandard: generatedColors[0],
      nodeAction: generatedColors[1],
      edgeStandard: generatedColors[2],
      edgeAction: generatedColors[3],
      robot: generatedColors[4],
    };
  }
}
