import type { Edges, Layouts, Nodes } from "v-network-graph";
import { ref } from "vue";
import randomColor from "randomcolor";
import type {
  IVDA5050Agv,
  ColorSchema,
} from "../types/vda5050.types";
import { Topic } from "../types/mqtt.types";
import mqtt from "mqtt";
import { sharedMqttClient } from "../utils/shared-mqtt-client";

export class VDA5050Agv implements IVDA5050Agv {
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
  public colors: ColorSchema;
  public mqttTopic: string;
  private mqttClient: mqtt.MqttClient | null = null;

  constructor(
    manufacturer: string,
    serialNumber: string,
    private readonly basePath: string = "vda5050",
    private readonly mqttConfig?: { host: string; port: string; username?: string; password?: string }
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

    // If using WebSocket, use the shared MQTT client
    if (sharedMqttClient.connected) {
      this.setupSharedMqttClient(topics);
    } else if (this.mqttConfig) {
      // If we have mqttConfig but no shared client, connect using the shared client
      this.connectWebSocketMqtt(topics);
    } else if (window.electron?.ipcRenderer) {
      // Fallback to Electron IPC if available
      topics.forEach((topic) => {
        window.electron.ipcRenderer.send("subscribe-topic", topic);
      });
    } else {
      console.warn("No MQTT connection method available");
    }
  }

  private setupSharedMqttClient(topics: string[]): void {
    // Subscribe to topics using the shared client
    sharedMqttClient.subscribe(topics);
    
    // Subscribe to messages
    sharedMqttClient.subscribeToMessages((topic, message) => {
      // Only process messages for this AGV
      if (topic.includes(`${this.agvId.manufacturer}/${this.agvId.serialNumber}`)) {
        this.handleMqttMessage(topic, message);
      }
    });
  }

  private connectWebSocketMqtt(topics: string[]): void {
    if (!this.mqttConfig) return;
    
    const { host, port, username, password } = this.mqttConfig;
    
    // Use the shared MQTT client
    sharedMqttClient.connect(
      host, 
      port, 
      `vda5050_client_${this.agvId.serialNumber}_${Math.random().toString(16).slice(2, 8)}`,
      username,
      password
    ).then(() => {
      this.setupSharedMqttClient(topics);
    }).catch(error => {
      console.error(`Failed to connect to WebSocket MQTT for AGV ${this.agvId.serialNumber}:`, error);
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

  // Clean up resources when the component is destroyed
  public disconnect(): void {
    // No need to disconnect the shared client
    // Just unsubscribe from messages if needed
    if (sharedMqttClient.connected) {
      const topics = [
        `${this.mqttTopic}/${Topic.InstantActions}`,
        `${this.mqttTopic}/${Topic.Order}`,
        `${this.mqttTopic}/${Topic.State}`,
        `${this.mqttTopic}/${Topic.Connection}`,
        `${this.mqttTopic}/${Topic.Visualization}`,
      ];
      
      // Unsubscribe from topics if needed
      // Note: We don't actually unsubscribe here to avoid affecting other components
      // that might be using the same topics
      
      console.log(`Disconnected AGV ${this.agvId.serialNumber}`);
    }
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
