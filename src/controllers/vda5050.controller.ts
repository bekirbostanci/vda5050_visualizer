import { ref } from "vue";
import { VDA5050Agv } from "./vda5050-agv.controller";
import type { AGVInstance, IVDA5050Agv } from "../types/vda5050.types";
import {
  MqttClientState,
  Topic,
  type MessageSubscriber,
} from "../types/mqtt.types";

// Then use an interface instead of importing it
interface MqttConnectionConfig {
  host: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  topics: string[];
}

class VDA5050Controller {
  private static instance: VDA5050Controller;
  private readonly agvs = ref<AGVInstance[]>([]);
  private readonly clientState = ref<MqttClientState>(MqttClientState.OFFLINE);
  private readonly messageSubscribers = ref<MessageSubscriber[]>([]);
  private isConnecting = false;
  private readonly mqttConfig = ref<MqttConnectionConfig | null>(null);

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): VDA5050Controller {
    if (!VDA5050Controller.instance) {
      VDA5050Controller.instance = new VDA5050Controller();
    }
    return VDA5050Controller.instance;
  }

  public subscribeToMessages(callback: MessageSubscriber): void {
    this.messageSubscribers.value.push(callback);
  }

  public async connectMqtt(
    mqttIp: string,
    mqttPort: string,
    basepath: string,
    interfaceName: string,
    username: string = "",
    password: string = ""
  ): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      // Just clean the host without adding protocol or port
      const cleanHost = mqttIp
        .replace(/^mqtt:\/\/|^tcp:\/\//, "")
        .replace(/:.*$/, "");

      const config: MqttConnectionConfig = {
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
    } catch (error) {
      console.error("MQTT Connection Error:", error);
      this.clientState.value = MqttClientState.OFFLINE;
    } finally {
      this.isConnecting = false;
    }
  }

  private setupMqttListeners(): void {
    window.electron.ipcRenderer.on("mqtt-connected", () => {
      this.clientState.value = MqttClientState.CONNECTED;
    });

    window.electron.ipcRenderer.on("mqtt-disconnected", () => {
      this.clientState.value = MqttClientState.OFFLINE;
    });

    window.electron.ipcRenderer.on("mqtt-reconnecting", () => {
      this.clientState.value = MqttClientState.RECONNECTING;
    });

    window.electron.ipcRenderer.on("mqtt-error", () => {
      this.clientState.value = MqttClientState.OFFLINE;
    });

    window.electron.ipcRenderer.on(
      "mqtt-message",
      this.handleMqttMessage.bind(this)
    );
  }

  private handleMqttMessage(data: { topic: string; message: any }): void {
    try {
      const message =
        typeof data.message === "string"
          ? JSON.parse(data.message)
          : data.message;

      this.notifySubscribers(data.topic, message);
      this.forwardMessageToAgv(data.topic, message);
    } catch (error) {
      console.error("Error processing MQTT message:", error);
    }
  }

  private notifySubscribers(topic: string, message: any): void {
    this.messageSubscribers.value.forEach((subscriber) => {
      subscriber(topic, message);
    });
  }

  private forwardMessageToAgv(topic: string, message: any): void {
    const [, manufacturer, serialNumber] = topic.split("/");

    const agvInstance = this.agvs.value.find(
      (instance) =>
        instance.agv.agvId.manufacturer === manufacturer &&
        instance.agv.agvId.serialNumber === serialNumber
    );

    if (agvInstance) {
      agvInstance.agv.handleMqttMessage(topic, message);
    }
  }

  public getMqttClientState(): MqttClientState {
    return this.clientState.value;
  }

  public getAgvs(): IVDA5050Agv[] {
    return this.agvs.value.map((instance) => instance.agv);
  }

  public publishMessage(
    topic: string,
    message: any,
    credentials?: { username: string; password: string }
  ): void {
    window.electron.ipcRenderer.send("publish-message", {
      topic,
      message: typeof message === "string" ? message : JSON.stringify(message),
      credentials,
    });
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
    username: string = "",
    password: string = ""
  ): Promise<IVDA5050Agv> {
    const agv = new VDA5050Agv(manufacturer, serialNumber, basePath);

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

    // Connect to MQTT via Electron with AGV-specific topics and credentials
    window.electron.ipcRenderer.send("connect-mqtt", {
      host: mqttIp,
      port: Number(mqttPort),
      clientId: `vda5050_agv_${manufacturer}_${serialNumber}_${Math.random()
        .toString(16)
        .slice(2, 8)}`,
      username,
      password,
      topics,
    });

    return agv;
  }

  public reconnectAgv(manufacturer: string, serialNumber: string): void {
    const agvInstance = this.agvs.value.find(
      (instance) =>
        instance.agv.agvId.manufacturer === manufacturer &&
        instance.agv.agvId.serialNumber === serialNumber
    );

    if (agvInstance) {
      window.electron.ipcRenderer.send("connect-mqtt", {
        host: this.mqttConfig.value?.host || "",
        port: Number(this.mqttConfig.value?.port || ""),
        clientId: `vda5050_agv_${manufacturer}_${serialNumber}_${Math.random()
          .toString(16)
          .slice(2, 8)}`,
        username: agvInstance.credentials?.username,
        password: agvInstance.credentials?.password,
        topics: agvInstance.topics,
      });
    }
  }
}

// Create and export the singleton instance
export const vda5050Controller = VDA5050Controller.getInstance();

// Export the methods
export const getMqttClientState = (): MqttClientState =>
  vda5050Controller.getMqttClientState();
export const getAgvs = (): IVDA5050Agv[] => vda5050Controller.getAgvs();
export const publishMessage = (
  topic: string,
  message: any,
  credentials?: { username: string; password: string }
): void => vda5050Controller.publishMessage(topic, message, credentials);
export const subscribeToMessages = (callback: MessageSubscriber): void =>
  vda5050Controller.subscribeToMessages(callback);
export const connectMqtt = (
  mqttIp: string,
  mqttPort: string,
  basepath: string,
  interfaceName: string,
  username?: string,
  password?: string
): Promise<void> =>
  vda5050Controller.connectMqtt(
    mqttIp,
    mqttPort,
    basepath,
    interfaceName,
    username,
    password
  );
export const createAgv = (
  manufacturer: string,
  serialNumber: string,
  x: number,
  y: number,
  mqttIp: string,
  mqttPort: string,
  basePath: string,
  interfaceName: string,
  username?: string,
  password?: string
): Promise<IVDA5050Agv> =>
  vda5050Controller.createAgv(
    manufacturer,
    serialNumber,
    x,
    y,
    mqttIp,
    mqttPort,
    basePath,
    interfaceName,
    username,
    password
  );
export const reconnectAgv = (
  manufacturer: string,
  serialNumber: string
): void => vda5050Controller.reconnectAgv(manufacturer, serialNumber);
