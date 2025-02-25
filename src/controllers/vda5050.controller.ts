import { ref } from "vue";
import { VDA5050Agv } from "./vda5050-agv.controller";

interface AGVInstance {
  agv: VDA5050Agv;
  topics: string[];
}

interface MqttConnectionConfig {
  host: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  topics: string[];
}

export enum MqttClientState {
  OFFLINE = "offline",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
}

export enum Topic {
  Connection = "connection",
  InstantActions = "instantActions",
  Order = "order",
  State = "state",
  Visualization = "visualization",
}

type MessageSubscriber = (topic: string, message: any) => void;

class VDA5050Controller {
  private static instance: VDA5050Controller;
  private readonly agvs = ref<AGVInstance[]>([]);
  private readonly clientState = ref<MqttClientState>(MqttClientState.OFFLINE);
  private readonly messageSubscribers = ref<MessageSubscriber[]>([]);
  private isConnecting = false;

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
      const config: MqttConnectionConfig = {
        host: mqttIp.replace(/^mqtt:\/\/|^tcp:\/\//, ""),
        port: Number(mqttPort),
        clientId: `vda5050_client_${Math.random().toString(16).slice(2, 8)}`,
        username,
        password,
        topics: [
          `${basepath}/${interfaceName}/+/+/connection`,
          `${basepath}/${interfaceName}/+/+/instantActions`,
          `${basepath}/${interfaceName}/+/+/order`,
          `${basepath}/${interfaceName}/+/+/state`,
          `${basepath}/${interfaceName}/+/+/visualization`,
        ],
      };

      window.electron.ipcRenderer.send("connect-mqtt", config);
      this.setupMqttListeners();
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

  public getAgvs(): VDA5050Agv[] {
    return this.agvs.value.map((instance) => instance.agv as VDA5050Agv);
  }

  public publishMessage(topic: string, message: any): void {
    window.electron.ipcRenderer.send("publish-message", {
      topic,
      message: typeof message === "string" ? message : JSON.stringify(message),
    });
  }

  public async createAgv(
    manufacturer: string,
    serialNumber: string,
    x: number,
    y: number,
    mqttIp: string,
    mqttPort: string
  ): Promise<VDA5050Agv> {
    const agv = new VDA5050Agv(manufacturer, serialNumber);

    const topics = [
      `uagv/${manufacturer}/${serialNumber}/${Topic.Connection}`,
      `uagv/${manufacturer}/${serialNumber}/${Topic.InstantActions}`,
      `uagv/${manufacturer}/${serialNumber}/${Topic.Order}`,
      `uagv/${manufacturer}/${serialNumber}/${Topic.State}`,
      `uagv/${manufacturer}/${serialNumber}/${Topic.Visualization}`,
    ];

    // Store both the AGV instance and its topics
    this.agvs.value.push({
      agv: agv as VDA5050Agv,
      topics,
    });

    // Connect to MQTT via Electron with AGV-specific topics
    window.electron.ipcRenderer.send("connect-mqtt", {
      host: mqttIp,
      port: Number(mqttPort),
      clientId: `vda5050_agv_${manufacturer}_${serialNumber}_${Math.random()
        .toString(16)
        .slice(2, 8)}`,
      topics,
    });

    return agv;
  }
}

// Create and export the singleton instance
export const vda5050Controller = VDA5050Controller.getInstance();

// Export the methods
export const getMqttClientState = (): MqttClientState =>
  vda5050Controller.getMqttClientState();
export const getAgvs = (): VDA5050Agv[] => vda5050Controller.getAgvs();
export const publishMessage = (topic: string, message: any): void =>
  vda5050Controller.publishMessage(topic, message);
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
  mqttPort: string
): Promise<VDA5050Agv> =>
  vda5050Controller.createAgv(
    manufacturer,
    serialNumber,
    x,
    y,
    mqttIp,
    mqttPort
  );
