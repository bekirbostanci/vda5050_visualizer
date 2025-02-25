import {
  getMqttClientState,
  createAgv,
  MqttClientState,
  connectMqtt
} from "./vda5050.controller";
import { ref } from "vue";

interface AgvId {
  manufacturer: string;
  serialNumber: string;
}

export class VDA5050Visualizer {
  robotList = ref<AgvId[]>([]);
  mqttConfig = {
    host: '',
    port: '',
    basePath: 'uagv',
    interfaceName: 'v2'
  };

  constructor() {
    this.init();
  }

  async init() {
    window.electron.ipcRenderer.on('mqtt-message', (data) => {
      if (data.topic.includes('/connection')) {
        try {
          const agvId = this.extractAgvIdFromTopic(data.topic);
          if (agvId && !this.robotExists(agvId)) {
            this.robotList.value.push(agvId);
          }
        } catch (error) {
          console.error('Error processing connection message:', error);
        }
      }
    });
  }

  async connect(host: string, port: string) {
    this.mqttConfig.host = host;
    this.mqttConfig.port = port;
    
    await connectMqtt(
      host,
      port,
      this.mqttConfig.basePath,
      this.mqttConfig.interfaceName
    );
  }

  private extractAgvIdFromTopic(topic: string): AgvId | null {
    const parts = topic.split('/');
    if (parts.length >= 4) {
      return {
        manufacturer: parts[2],
        serialNumber: parts[3]
      };
    }
    return null;
  }

  private robotExists(agvId: AgvId): boolean {
    return this.robotList.value.some(
      robot => robot.serialNumber === agvId.serialNumber && 
               robot.manufacturer === agvId.manufacturer
    );
  }

  async addRobot(serial: string, mapId: string, x: number, y: number) {
    if (getMqttClientState() !== MqttClientState.CONNECTED) {
      throw new Error('MQTT not connected');
    }

    const agv = await createAgv(
      serial,
      mapId,
      x,
      y,
      this.mqttConfig.host,
      this.mqttConfig.port
    );

    return agv;
  }

  updateState(state: any) {
    // Implement state update logic here
  }

  updateVisualization(visualization: any) {
    // Implement visualization update logic here
  }
}
