import type { Edges, Layouts, Nodes } from "v-network-graph";
import {
  Topic,
  AgvClient,
  ConnectionState,
  MasterController,
  type AgvId,
  type Order,
  type InstantActions,
  type State,
  type Connection,
  type Visualization,
  type Node,
  type Edge,
  VirtualAgvAdapter,
} from "vda-5050-lib";
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
  errorLevel: 'warning' | 'fatal';
  errorReference?: string;
}

export class VDA5050AgvController {
  state = ref({
    position: { x: 0, y: 0, theta: 0 },
    velocity: 0,
    batteryLevel: 100,
    errors: [] as VDA5050Error[],
    loads: [],
    agvPosition: { x: 0, y: 0, theta: 0 },
    operatingMode: 'AUTOMATIC',
    nodeStates: [],
    edgeStates: [],
    lastNodeId: '',
    lastNodeSequenceId: 0,
    driving: false,
    timestamp: new Date().toISOString()
  });

  constructor(
    private serial: string,
    private basePath: string = 'uagv'
  ) {}

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
  public agvId: AgvId;
  public orderInfo = ref<any>();
  public instantActionsInfo = ref<any>();
  public stateInfo = ref<any>();
  public connectionInfo = ref<any>();
  public visualizationInfo = ref<any>();
  private connectionState: ConnectionState | undefined = ConnectionState.Offline;
  public nodes = ref<Nodes>({});
  public edges = ref<Edges>({});
  public layouts = ref<Layouts>({ nodes: {} });
  public color: string;
  private colors: ColorSchema;
  private mqttTopic: string;

  constructor(
    manufacturer: string,
    serialNumber: string,
    private basePath: string = 'uagv'
  ) {
    this.agvId = { manufacturer, serialNumber };
    this.mqttTopic = `${this.basePath}/${this.agvId.manufacturer}/${this.agvId.serialNumber}`;
    this.color = randomColor();
    this.colors = this.generateColors();
    this.init();
  }

  init() {
    // Subscribe to topics via Electron IPC
    const topics = [
      `${this.mqttTopic}/${Topic.InstantActions}`,
      `${this.mqttTopic}/${Topic.Order}`,
      `${this.mqttTopic}/${Topic.State}`,
      `${this.mqttTopic}/${Topic.Connection}`,
      `${this.mqttTopic}/${Topic.Visualization}`
    ];

    topics.forEach(topic => {
      window.electron.ipcRenderer.send('subscribe-topic', topic);
    });

    // Listen for MQTT messages
    window.electron.ipcRenderer.on('mqtt-message', (data) => {
      if (data.topic.startsWith(this.mqttTopic)) {
        this.handleMqttMessage(data.topic, data.message);
      }
    });
  }

  private handleMqttMessage(topic: string, message: any) {
    const topicType = topic.split('/').pop() as Topic;
    
    switch (topicType) {
      case Topic.InstantActions:
        this.instantActionsInfo.value = message;
        break;
      case Topic.Order:
        this.handleOrderMessage(message);
        break;
      case Topic.State:
        this.handleStateMessage(message);
        break;
      case Topic.Connection:
        this.connectionInfo.value = message;
        break;
      case Topic.Visualization:
        this.handleVisualizationMessage(message);
        break;
    }
  }

  private handleStateMessage(state: any) {
    this.stateInfo.value = state;
    if (state.agvPosition?.x != null && state.agvPosition?.y != null) {
      this.layouts.value.nodes[`robot_${this.agvId.serialNumber}`] = {
        x: state.agvPosition.x,
        y: -state.agvPosition.y,
      };
    }
  }

  private handleVisualizationMessage(vis: any) {
    this.visualizationInfo.value = vis;
    if (vis.agvPosition?.x != null && vis.agvPosition?.y != null) {
      this.layouts.value.nodes[`robot_${this.agvId.serialNumber}`] = {
        x: vis.agvPosition.x,
        y: -vis.agvPosition.y,
      };
    }
  }

  private handleOrderMessage(order: any) {
    this.orderInfo.value = order;
    this.updateGraphFromOrder(order);
  }

  private updateGraphFromOrder(order: any) {
    // Reset graph data
    this.edges.value = {};
    this.nodes.value = {};
    this.layouts.value = { nodes: {} };

    // Add nodes
    order.nodes?.forEach((node: any) => {
      const nodeId = node.nodeId;
      const hasActions = node.actions?.length > 0;
      const actionTypes = hasActions ? 
        node.actions.map((action: any) => action.actionType).join(', ') : '';

      this.nodes.value[nodeId] = {
        name: `${this.agvId.serialNumber} - ${node.sequenceId}${actionTypes ? ` -> ${actionTypes}` : ''}`,
        color: hasActions ? this.colors.nodeAction : this.colors.nodeStandard,
        zIndex: 1
      };

      if (node.nodePosition) {
        this.layouts.value.nodes[nodeId] = {
          fixed: true,
          x: node.nodePosition.x,
          y: -node.nodePosition.y
        };
      }
    });

    // Add robot node
    this.nodes.value[`robot_${this.agvId.serialNumber}`] = {
      name: this.agvId.serialNumber,
      color: "#000",
      zIndex: 100
    };

    // Add edges
    order.edges?.forEach((edge: any) => {
      const hasActions = edge.actions?.length > 0;
      const actionTypes = hasActions ?
        edge.actions.map((action: any) => action.actionType).join(', ') : '';

      this.edges.value[edge.edgeId] = {
        source: edge.endNodeId,
        target: edge.startNodeId,
        color: hasActions ? "#1abc9c" : "#bdc3c7",
        label: `${this.agvId.serialNumber} - ${edge.sequenceId}${actionTypes ? ` -> ${actionTypes}` : ''}`
      };
    });
  }

  private generateColors() {
    const templateColor = randomColor({
      hue: Math.random() * 200,
    });
    const colorType = {
      count: 5,
      hue: templateColor,
    };
    const generatedColors = randomColor(colorType);

    return {
      nodeStandard: generatedColors[0],
      nodeAction: generatedColors[1],
      edgeStandard: generatedColors[2],
      edgeAction: generatedColors[3],
      robot: generatedColors[4],
    };
  }
}
