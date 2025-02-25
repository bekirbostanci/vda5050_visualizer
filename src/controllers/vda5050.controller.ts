import { ref } from "vue";
import { VDA5050Agv, type ColorSchema } from './vda5050-agv.controller';
import { ConnectionState } from "vda-5050-lib";
import type { Ref } from 'vue';

// Define a type for our AGV instance
type AGVInstance = {
  agv: VDA5050Agv;
  topics: string[];
}

// Change the ref type to store AGVInstance objects
const agvs = ref<AGVInstance[]>([]);
let isConnecting = false;

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
  Visualization = "visualization"
}

const clientState = ref<MqttClientState>(MqttClientState.OFFLINE);

// Add a type for subscribers
type MessageSubscriber = (topic: string, message: any) => void;
const messageSubscribers = ref<MessageSubscriber[]>([]);

// Add function to register subscribers
export function subscribeToMessages(callback: MessageSubscriber) {
  messageSubscribers.value.push(callback);
}

export async function connectMqtt(
  mqttIp: string,
  mqttPort: string,
  basepath: string,
  interfaceName: string,
  username: string = "",
  password: string = ""
) {
  if (isConnecting) return;
  isConnecting = true;

  try {
    const cleanIp = mqttIp.replace(/^mqtt:\/\/|^tcp:\/\//, '');
    
    window.electron.ipcRenderer.send('connect-mqtt', {
      host: cleanIp,
      port: Number(mqttPort),
      clientId: `vda5050_client_${Math.random().toString(16).slice(2, 8)}`,
      username,
      password,
      topics: [
        `${basepath}/${interfaceName}/+/+/connection`,
        `${basepath}/${interfaceName}/+/+/instantActions`,
        `${basepath}/${interfaceName}/+/+/order`,
        `${basepath}/${interfaceName}/+/+/state`,
        `${basepath}/${interfaceName}/+/+/visualization`
      ]
    });

    setupMqttListeners();

  } catch (error) {
    clientState.value = MqttClientState.OFFLINE;
  } finally {
    isConnecting = false;
  }
}

function setupMqttListeners() {
  window.electron.ipcRenderer.on('mqtt-connected', () => {
    clientState.value = MqttClientState.CONNECTED;
  });

  window.electron.ipcRenderer.on('mqtt-disconnected', () => {
    clientState.value = MqttClientState.OFFLINE;
  });

  window.electron.ipcRenderer.on('mqtt-reconnecting', () => {
    clientState.value = MqttClientState.RECONNECTING;
  });

  window.electron.ipcRenderer.on('mqtt-error', (error) => {
    clientState.value = MqttClientState.OFFLINE;
  });

  window.electron.ipcRenderer.on('mqtt-message', (data) => {
    try {
      const message = typeof data.message === 'string' ? 
        JSON.parse(data.message) : data.message;

      // Notify all subscribers
      messageSubscribers.value.forEach(subscriber => {
        subscriber(data.topic, message);
      });

      const topicParts = data.topic.split('/');
      const manufacturer = topicParts[1];
      const serialNumber = topicParts[2];
      const topicType = topicParts[topicParts.length - 1] as Topic;

      // Forward message to any registered handlers
      window.electron.ipcRenderer.send('mqtt-message-processed', {
        type: topicType,
        message: message,
        topic: data.topic
      });

      // Find the correct AGV instance by both manufacturer and serialNumber
      const agvInstance = agvs.value.find(instance => 
        instance.agv.agvId.manufacturer === manufacturer &&
        instance.agv.agvId.serialNumber === serialNumber
      );

      if (agvInstance) {
        agvInstance.agv.handleMqttMessage(data.topic, message);
      }

    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });
}

export function getMqttClientState(): MqttClientState {
  return clientState.value;
}

export function getAgvs(): VDA5050Agv[] {
  return agvs.value.map(instance => instance.agv);
}

export async function createAgv(
  manufacturer: string,
  serialNumber: string,
  x: number,
  y: number,
  mqttIp: string,
  mqttPort: string
) {
  const agv = new VDA5050Agv(manufacturer, serialNumber);
  
  const topics = [
    `uagv/${manufacturer}/${serialNumber}/${Topic.Connection}`,
    `uagv/${manufacturer}/${serialNumber}/${Topic.InstantActions}`,
    `uagv/${manufacturer}/${serialNumber}/${Topic.Order}`,
    `uagv/${manufacturer}/${serialNumber}/${Topic.State}`,
    `uagv/${manufacturer}/${serialNumber}/${Topic.Visualization}`
  ];

  // Store both the AGV instance and its topics
  agvs.value.push({
    agv,
    topics
  });

  // Connect to MQTT via Electron with AGV-specific topics
  window.electron.ipcRenderer.send('connect-mqtt', {
    host: mqttIp,
    port: Number(mqttPort),
    clientId: `vda5050_agv_${manufacturer}_${serialNumber}_${Math.random().toString(16).slice(2, 8)}`,
    topics
  });

  return agv;
}

export function publishMessage(topic: string, message: any) {
  console.log('Publishing MQTT message:', {
    topic,
    messagePreview: JSON.stringify(message).substring(0, 100) + '...'
  });
  
  window.electron.ipcRenderer.send('publish-message', {
    topic,
    message: typeof message === 'string' ? message : JSON.stringify(message)
  });
}
