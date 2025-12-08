import {
  getMqttClientState,
  createAgv,
  connectMqtt,
} from "./vda5050.controller";
import { ref } from "vue";
import { MqttClientState } from "../types/mqtt.types";
import mqtt from "mqtt";
import { sharedMqttClient } from "../utils/shared-mqtt-client";
import { useMqttStore } from "../stores/mqtt";

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
  private messageUnsubscriber: (() => void) | null = null;

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
      // Use the shared MQTT client for WebSocket connections
      // Clean up any existing subscription first
      if (this.messageUnsubscriber) {
        this.messageUnsubscriber();
        this.messageUnsubscriber = null;
      }

      // Subscribe to messages with the new unsubscribe function
      this.messageUnsubscriber = sharedMqttClient.subscribeToMessages(
        (topic, message) => {
          if (topic.includes("/connection")) {
            this.handleConnectionMessage(topic);
          }
        }
      );
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
      this.mqttConfig.password,
      "mqtt" // Explicitly set connection type
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

    // If the shared client is not connected, connect it
    if (!sharedMqttClient.connected) {
      try {
        await sharedMqttClient.connect(
          host,
          port,
          `vda5050_visualizer_${Math.random().toString(16).slice(2, 8)}`,
          username,
          password
        );

        // Subscribe to connection topics
        const interfaceNameToUse = this.mqttConfig.interfaceName || "+";
        const topics = [
          `${interfaceNameToUse}/+/+/+/connection`,
          `${interfaceNameToUse}/+/+/+/instantActions`,
          `${interfaceNameToUse}/+/+/+/order`,
          `${interfaceNameToUse}/+/+/+/state`,
          `${interfaceNameToUse}/+/+/+/visualization`,
        ];

        sharedMqttClient.subscribe(topics);
      } catch (error) {
        console.error("Failed to connect to WebSocket MQTT:", error);
      }
    }
  }

  private handleConnectionMessage(topic: string): void {
    try {
      const agvId = this.extractAgvIdFromTopic(topic);
      if (agvId && !this.robotExists(agvId)) {
        this.robotList.value.push(agvId);

        // Also add to Pinia store
        try {
          const store = useMqttStore();
          store.addRobot(agvId);
        } catch (error) {
          console.debug("MQTT store not available:", error);
        }
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

  // Clean up resources when the component is destroyed
  public disconnect(): void {
    // Clean up message subscription
    if (this.messageUnsubscriber) {
      this.messageUnsubscriber();
      this.messageUnsubscriber = null;
    }

    // Note: We don't disconnect the shared client here
    // as other components might still be using it
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
      this.mqttConfig.password,
      this.mqttConfig.connectionType
    );

    return agv;
  }
}
