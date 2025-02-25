import {
  getMqttClientState,
  createAgv,
  MqttClientState,
  connectMqtt,
} from "./vda5050.controller";
import { ref } from "vue";

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
}

export class VDA5050Visualizer {
  public readonly robotList = ref<AgvId[]>([]);
  private readonly mqttConfig: MqttConfig = {
    host: "",
    port: "",
    basePath: "",
    interfaceName: "",
    username: "",
    password: "",
  };

  constructor() {
    this.setupMessageHandler();
  }

  private setupMessageHandler(): void {
    window.electron.ipcRenderer.on("mqtt-message", (data) => {
      if (data.topic.includes("/connection")) {
        this.handleConnectionMessage(data.topic);
      }
    });
  }

  public async connect(
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

  public updateVisualization(payload: any): void {
    // Handle visualization update logic here
  }

  public updateState(payload: any): void {
    // Handle state update logic here
  }
}
