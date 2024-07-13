import {
  getMasterController,
  getMqttClient,
} from "@/controllers/vda5050.controller";
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
} from "vda-5050-lib";
import { ref } from "vue";
import type mqtt from "mqtt";
import randomColor from "randomcolor";

export interface ColorSchema {
  nodeStandard: string;
  nodeAction: string;
  edgeStandard: string;
  edgeAction: string;
  robot: string;
}

export class VDA5050Agv {
  public mc: MasterController;
  public agvClient: AgvClient;
  public agvId: AgvId;
  public orderInfo = ref<Order>();
  public instantActionsInfo = ref<InstantActions>();
  public stateInfo = ref<State>();
  public connectionInfo = ref<Connection>();
  public visualizationInfo = ref<Visualization>();
  private connectionState: ConnectionState | undefined =
    ConnectionState.Offline;
  public nodes = ref<Nodes>({});
  public edges = ref<Edges>({});
  public layouts = ref<Layouts>({ nodes: {} });
  private mqttClient: mqtt.MqttClient;
  private mqttTopic: string = "";
  private colors: ColorSchema;
  constructor(agvId: AgvId) {
    this.mc = getMasterController();
    this.mqttClient = getMqttClient();
    this.agvClient = new AgvClient(agvId, this.mc.clientOptions);
    this.agvId = agvId;
    this.mqttTopic =
      this.mc.clientOptions.interfaceName +
      "/v" +
      this.mc.clientOptions.vdaVersion.substring(0, 1) +
      "/" +
      this.agvId.manufacturer +
      "/" +
      this.agvId.serialNumber +
      "/";

    this.subscribeAGV();
    this.subscribeMaster();
    this.colors = this.generateColors();
  }

  private generateColors() {
    const templateColor = randomColor();
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

  private async subscribeAGV() {
    // AGV Topics
    // State
    // Connection
    // Visualization
    this.subscribeState();
    this.subscribeConnection();
    this.subscribeVisualization();
  }

  private async subscribeMaster() {
    // Master Topics
    // Order
    // Instant Action
    // Factsheet

    // We need client robot
    this.mqttClient.subscribe(this.mqttTopic + Topic.InstantActions);
    this.mqttClient.subscribe(this.mqttTopic + Topic.Order);
    this.mqttClient.on("message", (topic, message) => {
      switch (topic) {
        case this.mqttTopic + Topic.InstantActions:
          this.callbackInstantActions(message);
          break;
        case this.mqttTopic + Topic.Order:
          this.callbackOrder(message);
          break;
        default:
          break;
      }
    });
  }

  private callbackOrder(message: Buffer) {
    const order: Order = JSON.parse(message.toString());
    this.orderInfo.value = order;
    this.edges.value = {};
    this.nodes.value = {};
    this.layouts.value = { nodes: {} };

    order.nodes.map((node: Node) => {
      if (this.nodes.value[this.agvId.serialNumber + node.nodeId]) {
        this.nodes.value[this.agvId.serialNumber + node.nodeId] = {
          name:
            this.nodes.value[this.agvId.serialNumber + node.nodeId].name +
            ", " +
            node.sequenceId.toString() +
            (node.actions.length > 0
              ? " -> " +
                Object.values(node.actions).map(
                  (nodeAction) => nodeAction.actionType
                )
              : ""),
          color:
            this.nodes.value[this.agvId.serialNumber + node.nodeId].color ==
              this.colors.edgeAction || node.actions.length > 0
              ? this.colors.nodeAction
              : this.colors.nodeStandard,
          zIndex: 1,
        };
      } else {
        this.nodes.value[this.agvId.serialNumber + node.nodeId] = {
          name:
            this.agvClient.agvId.serialNumber +
            " - " +
            node.sequenceId.toString() +
            (node.actions.length > 0
              ? " -> " +
                Object.values(node.actions).map(
                  (nodeAction) => nodeAction.actionType
                )
              : ""),
          color:
            node.actions.length > 0
              ? this.colors.nodeAction
              : this.colors.nodeStandard,
          zIndex: 1,
        };
      }
      this.layouts.value!.nodes[this.agvId.serialNumber + node.nodeId] = {
        fixed: true,
        x: node.nodePosition!.x,
        y: -node.nodePosition!.y,
      };
    });
    order.edges.map((edge: Edge) => {
      this.edges.value[edge.edgeId] = {
        source: this.agvId.serialNumber + edge.endNodeId,
        target: this.agvId.serialNumber + edge.startNodeId,
        color: edge.actions.length > 0 ? "#1abc9c" : "#bdc3c7",
        label:
          this.agvClient.agvId +
          " " +
          edge.sequenceId +
          (edge.actions.length > 0
            ? " -> " +
              Object.values(edge.actions).map(
                (nodeAction) => nodeAction.actionType
              )
            : ""),
      };
    });
    this.nodes.value["robot_" + this.agvId.serialNumber] = {
      name: this.agvId.serialNumber,
      color: this.colors.robot,
      zIndex: 100,
    };
  }

  private callbackInstantActions(message: Buffer) {
    this.instantActionsInfo.value = JSON.parse(message.toString());
  }

  private async subscribeState() {
    await this.mc.subscribe(Topic.State, this.agvId, (state) => {
      this.stateInfo.value = state;
    });
  }

  private async subscribeVisualization() {
    await this.mc.subscribe(Topic.Visualization, this.agvId, (vis) => {
      this.visualizationInfo.value = vis;
      if (!vis.agvPosition || !vis.agvPosition.x || !vis.agvPosition.y) {
        return;
      }
      this.layouts.value.nodes["robot_" + this.agvId.serialNumber] = {
        x: vis.agvPosition.x,
        y: -vis.agvPosition.y,
      };
    });
  }

  private async subscribeConnection() {
    await this.mc.subscribe(Topic.Connection, this.agvId, (connection) => {
      this.connectionInfo.value = connection;
    });
  }
}
