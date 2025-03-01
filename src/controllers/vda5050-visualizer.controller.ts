import {
  getMqttClientState,
  createAgv,
  connectMqtt,
} from "./vda5050.controller";
import { ref } from "vue";
import { MqttClientState } from "../types/mqtt.types";
import mqtt from "mqtt";
// Define interfaces locally to avoid import issues
interface AgvId {
  manufacturer: string;
  serialNumber: string;
}

interface MqttConfig {
  host: string;
  port: string;
  basePath: string;
  interfaceName: string;
  username: string;
  password: string;
  connectionType: string;
}

export class VDA5050Visualizer {
  public readonly robotList = ref<AgvId[]>([]);
  private mqttConfig: MqttConfig = {
    host: "",
    port: "",
    basePath: "",
    interfaceName: "",
    username: "",
    password: "",
    connectionType: "",
  };

  constructor(mqttConfig: MqttConfig) {
    this.setupMessageHandler(mqttConfig);
  }

  private setupMessageHandler(mqttConfig: MqttConfig): void {
    this.mqttConfig = mqttConfig;
    if (mqttConfig.connectionType === "mqtt") {
      window.electron.ipcRenderer.on("mqtt-message", (data) => {
        if (data.topic.includes("/connection")) {
          this.handleConnectionMessage(data.topic);
        }
      });
    } else if (mqttConfig.connectionType === "websocket") {
      // Implement WebSocket message handling here
      // dont use electron for websocket
      
      const mqttUrl = `ws://${this.mqttConfig.host}:${this.mqttConfig.port}/ws`;
      const client = mqtt.connect(mqttUrl, {
        clientId: `vda5050_client_${Math.random().toString(16).slice(2, 8)}`,
        username: this.mqttConfig.username || undefined,
        password: this.mqttConfig.password || undefined,
      });
      client.on("connect", () => {
        console.log("WebSocket connected");
        // Subscribe to topics after connecting
        const topics = [
          `${this.mqttConfig.interfaceName}/+/+/+/connection`,
          `${this.mqttConfig.interfaceName}/+/+/+/instantActions`,
          `${this.mqttConfig.interfaceName}/+/+/+/order`,
          `${this.mqttConfig.interfaceName}/+/+/+/state`,
          `${this.mqttConfig.interfaceName}/+/+/+/visualization`,
        ];
        client.subscribe(topics, (err) => {
          if (err) {
            console.error("WebSocket Subscription error:", err);
          } else {
            console.log("Subscribed to WebSocket topics:", topics);
          }
        });
      });
    }
  }

  public async mqttConnect(
    host: string,
    port: string,
    basePath: string,
    interfaceName: string,
    username: string,
    password: string
  ): Promise<void> {
    this.mqttConfig.host = host;
    this.mqttConfig.port = port;
    this.mqttConfig.basePath = basePath;
    this.mqttConfig.interfaceName = interfaceName;
    this.mqttConfig.username = username;
    this.mqttConfig.password = password;
    await connectMqtt(
      host,
      port,
      this.mqttConfig.basePath,
      this.mqttConfig.interfaceName,
      this.mqttConfig.username,
      this.mqttConfig.password
    );
  }

  public async websocketConnect(
    host: string,
    port: string,
    basePath: string,
    interfaceName: string,
    username: string,
    password: string
  ): Promise<void> {
    this.mqttConfig.host = host;
    this.mqttConfig.port = port;
    this.mqttConfig.basePath = basePath;
    this.mqttConfig.interfaceName = interfaceName;
    this.mqttConfig.username = username;
    this.mqttConfig.password = password;
    this.mqttConfig.connectionType = "websocket";

    await connectMqtt(
      host,
      port,
      this.mqttConfig.basePath,
      this.mqttConfig.interfaceName,
      this.mqttConfig.username,
      this.mqttConfig.password,
      this.mqttConfig.connectionType
    );
  }

  private handleConnectionMessage(topic: string): void {
    try {
      const agvId = this.extractAgvIdFromTopic(topic);
      if (agvId && !this.robotExists(agvId)) {
        this.robotList.value.push(agvId);
      }
    } catch (error) {
      console.error("Error processing connection message:", error);
    }
  }

  private extractAgvIdFromTopic(topic: string): AgvId | null {
    const parts = topic.split("/");
    return parts.length >= 4
      ? {
          manufacturer: parts[2],
          serialNumber: parts[3],
        }
      : null;
  }

  private robotExists(agvId: AgvId): boolean {
    return this.robotList.value.some(
      (robot) =>
        robot.serialNumber === agvId.serialNumber &&
        robot.manufacturer === agvId.manufacturer
    );
  }

  async addRobot(serial: string, mapId: string, x: number, y: number) {
    if (getMqttClientState() !== MqttClientState.CONNECTED) {
      throw new Error("MQTT not connected");
    }

    const agv = await createAgv(
      serial,
      mapId,
      x,
      y,
      this.mqttConfig.host,
      this.mqttConfig.port,
      this.mqttConfig.basePath,
      this.mqttConfig.interfaceName,
      this.mqttConfig.username,
      this.mqttConfig.password
    );

    return agv;
  }
}
