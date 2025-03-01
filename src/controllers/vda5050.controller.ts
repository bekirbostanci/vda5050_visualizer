import { ref } from "vue";
import { VDA5050Agv } from "./vda5050-agv.controller";
import type { IVDA5050Agv } from "../types/vda5050.types";
import {
  MqttClientState,
  Topic,
  type MessageSubscriber,
} from "../types/mqtt.types";
import mqtt from "mqtt";
import { sharedMqttClient } from "../utils/shared-mqtt-client";
import type { 
  AGVControllerInstance, 
  MqttControllerConfig, 
  IVDA5050Controller 
} from "../types/vda5050-controller.types";

class VDA5050Controller implements IVDA5050Controller {
  private static instance: VDA5050Controller;
  private mqttConfig = ref<MqttControllerConfig | null>(null);
  private clientState = ref<MqttClientState>(MqttClientState.OFFLINE);
  private agvs = ref<AGVControllerInstance[]>([]);
  private subscribers = ref<MessageSubscriber[]>([]);
  private isConnecting = false;
  private messageUnsubscriber: (() => void) | null = null;

  private constructor() {
    this.setupMqttListeners();
  }

  public static getInstance(): VDA5050Controller {
    if (!VDA5050Controller.instance) {
      VDA5050Controller.instance = new VDA5050Controller();
    }
    return VDA5050Controller.instance;
  }

  private setupMqttListeners(): void {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.on("mqtt-connected", () => {
        console.log("MQTT Connected");
        this.clientState.value = MqttClientState.CONNECTED;
      });

      window.electron.ipcRenderer.on("mqtt-message", (data) => {
        this.notifySubscribers(data.topic, data.message);
        this.forwardMessageToAgv(data.topic, data.message);
      });

      window.electron.ipcRenderer.on("mqtt-error", (error) => {
        console.error("MQTT Error:", error);
        this.clientState.value = MqttClientState.OFFLINE;
      });

      window.electron.ipcRenderer.on("mqtt-reconnect", () => {
        console.log("MQTT Reconnecting");
        this.clientState.value = MqttClientState.RECONNECTING;
      });

      window.electron.ipcRenderer.on("mqtt-close", () => {
        console.log("MQTT Connection Closed");
        this.clientState.value = MqttClientState.OFFLINE;
      });
    }
  }

  private forwardMessageToAgv(topic: string, message: any): void {
    // Find the AGV that should receive this message
    const agvInstance = this.agvs.value.find((instance) =>
      instance.topics.some((t) => topic.startsWith(t.split("/#")[0]))
    );

    if (agvInstance) {
      agvInstance.agv.handleMqttMessage(topic, message);
    }
  }

  public subscribeToMessages(callback: MessageSubscriber): () => void {
    this.subscribers.value.push(callback);
    
    // Return a function to unsubscribe
    return () => {
      const index = this.subscribers.value.indexOf(callback);
      if (index !== -1) {
        this.subscribers.value.splice(index, 1);
      }
    };
  }

  private notifySubscribers(topic: string, message: any): void {
    this.subscribers.value.forEach((subscriber) => {
      try {
        subscriber(topic, message);
      } catch (error) {
        console.error("Error in message subscriber:", error);
      }
    });
  }

  public async connectMqtt(
    mqttIp: string,
    mqttPort: string,
    basepath: string,
    interfaceName: string,
    username: string = "",
    password: string = "",
    connectionType: string = "mqtt"
  ): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      if (connectionType === "websocket") {
        // Use the shared MQTT client for WebSocket connections
        if (!sharedMqttClient.connected) {
          // Clean up any existing subscription first
          if (this.messageUnsubscriber) {
            this.messageUnsubscriber();
            this.messageUnsubscriber = null;
          }
          
          const client = await sharedMqttClient.connect(
            mqttIp,
            mqttPort,
            `vda5050_controller_${Math.random().toString(16).slice(2, 8)}`,
            username || undefined,
            password || undefined
          );
          
          this.clientState.value = MqttClientState.CONNECTED;
          
          // Subscribe to topics
          const topics = [
            `${interfaceName}/+/+/+/connection`,
            `${interfaceName}/+/+/+/instantActions`,
            `${interfaceName}/+/+/+/order`,
            `${interfaceName}/+/+/+/state`,
            `${interfaceName}/+/+/+/visualization`,
          ];
          
          sharedMqttClient.subscribe(topics);
          
          // Set up message handling
          this.messageUnsubscriber = sharedMqttClient.subscribeToMessages((topic, message) => {
            this.notifySubscribers(topic, message);
            this.forwardMessageToAgv(topic, message);
          });
        }
      }
      else if (connectionType === "mqtt") {
        const cleanHost = mqttIp
          .replace(/^mqtt:\/\/|^tcp:\/\//, "")
          .replace(/:.*$/, "");

        const config: MqttControllerConfig = {
          host: cleanHost, // Just the clean IP/hostname
          port: Number(mqttPort),
          clientId: `vda5050_client_${Math.random().toString(16).slice(2, 8)}`,
          username: username || undefined,
          password: password || undefined,
          topics: [
            `${interfaceName}/+/+/+/connection`,
            `${interfaceName}/+/+/+/instantActions`,
            `${interfaceName}/+/+/+/order`,
            `${interfaceName}/+/+/+/state`,
            `${interfaceName}/+/+/+/visualization`,
          ],
        };

        console.log("Connecting to MQTT with config:", {
          ...config,
          password: config.password ? "****" : undefined,
        });

        this.mqttConfig.value = config;
        window.electron.ipcRenderer.send("connect-mqtt", config);
        this.setupMqttListeners();
      }
      else {
        console.error("Invalid connection type:", connectionType);
        this.clientState.value = MqttClientState.OFFLINE;
      }
    } catch (error) {
      console.error("MQTT Connection Error:", error);
      this.clientState.value = MqttClientState.OFFLINE;
    } finally {
      this.isConnecting = false;
    }
  }

  public getMqttClientState(): MqttClientState {
    return this.clientState.value;
  }

  public getAgvs(): IVDA5050Agv[] {
    return this.agvs.value.map((instance) => instance.agv);
  }

  public async createAgv(
    manufacturer: string,
    serialNumber: string,
    x: number,
    y: number,
    mqttIp: string,
    mqttPort: string,
    basePath: string,
    interfaceName: string,
    username?: string,
    password?: string,
    connectionType: string = "mqtt"
  ): Promise<IVDA5050Agv> {
    // Create AGV with MQTT config if using WebSocket
    const mqttConfig = connectionType === "websocket" 
      ? { host: mqttIp, port: mqttPort, username, password }
      : undefined;
    
    const agv = new VDA5050Agv(manufacturer, serialNumber, basePath, mqttConfig);

    const topics = [
      `${interfaceName}/${manufacturer}/${serialNumber}/${Topic.Connection}`,
      `${interfaceName}/${manufacturer}/${serialNumber}/${Topic.InstantActions}`,
      `${interfaceName}/${manufacturer}/${serialNumber}/${Topic.Order}`,
      `${interfaceName}/${manufacturer}/${serialNumber}/${Topic.State}`,
      `${interfaceName}/${manufacturer}/${serialNumber}/${Topic.Visualization}`,
    ];

    // Store AGV instance with credentials
    this.agvs.value.push({
      agv,
      topics,
      credentials: username || password ? { username, password } : undefined,
    });

    // If using Electron IPC, connect via Electron
    if (connectionType === "mqtt" && window.electron?.ipcRenderer) {
      // Connect to MQTT via Electron with AGV-specific topics and credentials
      window.electron.ipcRenderer.send("connect-mqtt", {
        host: mqttIp,
        port: Number(mqttPort),
        clientId: `vda5050_client_${manufacturer}_${serialNumber}_${Math.random()
          .toString(16)
          .slice(2, 8)}`,
        username: username || undefined,
        password: password || undefined,
        topics,
      });
    }

    return agv;
  }

  public disconnect(): void {
    // Clean up message subscription for WebSocket
    if (this.messageUnsubscriber) {
      this.messageUnsubscriber();
      this.messageUnsubscriber = null;
    }
    
    // Note: We don't disconnect the shared client here
    // as other components might still be using it
    
    // Disconnect all AGVs
    this.agvs.value.forEach(instance => {
      if (instance.agv.disconnect) {
        instance.agv.disconnect();
      }
    });
    
    // Clear AGV list
    this.agvs.value = [];
  }
}

// Export singleton instance
const vda5050Controller = VDA5050Controller.getInstance();

// Export functions that use the singleton
export function getMqttClientState(): MqttClientState {
  return vda5050Controller.getMqttClientState();
}

export function connectMqtt(
  mqttIp: string,
  mqttPort: string,
  basepath: string,
  interfaceName: string,
  username: string = "",
  password: string = "",
  connectionType: string = "mqtt"
): Promise<void> {
  return vda5050Controller.connectMqtt(
    mqttIp,
    mqttPort,
    basepath,
    interfaceName,
    username,
    password,
    connectionType
  );
}

export function createAgv(
  manufacturer: string,
  serialNumber: string,
  x: number,
  y: number,
  mqttIp: string,
  mqttPort: string,
  basePath: string,
  interfaceName: string,
  username?: string,
  password?: string,
  connectionType: string = "mqtt"
): Promise<IVDA5050Agv> {
  return vda5050Controller.createAgv(
    manufacturer,
    serialNumber,
    x,
    y,
    mqttIp,
    mqttPort,
    basePath,
    interfaceName,
    username,
    password,
    connectionType
  );
}

export function subscribeToMessages(callback: MessageSubscriber): () => void {
  return vda5050Controller.subscribeToMessages(callback);
}

export function disconnect(): void {
  vda5050Controller.disconnect();
}
