import { ref } from "vue";

const agvs = ref<any[]>([]);
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
    // Remove any protocol prefix from IP if present
    const cleanIp = mqttIp.replace(/^mqtt:\/\/|^tcp:\/\//, '');
    
    console.log('Connecting to MQTT:', { host: cleanIp, port: mqttPort });
    
    window.electron.ipcRenderer.send('connect-mqtt', {
      host: cleanIp, // Use clean IP without protocol
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
    console.error('Error connecting to MQTT:', error);
    clientState.value = MqttClientState.OFFLINE;
  } finally {
    isConnecting = false;
  }
}

function setupMqttListeners() {
  window.electron.ipcRenderer.on('mqtt-connected', () => {
    console.log('MQTT Connected');
    clientState.value = MqttClientState.CONNECTED;
  });

  window.electron.ipcRenderer.on('mqtt-disconnected', () => {
    console.log('MQTT Disconnected');
    clientState.value = MqttClientState.OFFLINE;
  });

  window.electron.ipcRenderer.on('mqtt-reconnecting', () => {
    console.log('MQTT Reconnecting');
    clientState.value = MqttClientState.RECONNECTING;
  });

  window.electron.ipcRenderer.on('mqtt-error', (error) => {
    console.error('MQTT Error in controller:', error);
    clientState.value = MqttClientState.OFFLINE;
  });

  window.electron.ipcRenderer.on('mqtt-message', (data) => {
    console.log('MQTT Message in controller:', {
      topic: data.topic,
      messageType: typeof data.message,
      messagePreview: JSON.stringify(data.message).substring(0, 100) + '...'
    });

    try {
      const message = typeof data.message === 'string' ? 
        JSON.parse(data.message) : data.message;

      const topicParts = data.topic.split('/');
      const topicType = topicParts[topicParts.length - 1] as Topic;

      window.electron.ipcRenderer.send('mqtt-message-processed', {
        type: topicType,
        message: message
      });

    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });
}

export function getMqttClientState(): MqttClientState {
  return clientState.value;
}

export function getAgvs(): any[] {
  return agvs.value;
}

export async function createAgv(
  serial: string,
  mapId: string,
  x: number,
  y: number,
  mqttIp: string,
  mqttPort: string
) {
  const agv = {
    id: serial,
    mapId,
    position: { x, y, theta: 0.0 },
    state: {
      velocity: 0.75,
      lastNodeId: "",
      batteryLevel: 100,
      operatingMode: "AUTOMATIC",
      errors: [],
      loads: []
    },
    agv: {
      nodes: ref({}),
      edges: ref({}),
      layouts: ref({ nodes: {} })
    }
  };

  // Connect to MQTT via Electron with AGV-specific topics
  window.electron.ipcRenderer.send('connect-mqtt', {
    host: mqttIp,
    port: Number(mqttPort),
    clientId: `vda5050_agv_${serial}_${Math.random().toString(16).slice(2, 8)}`,
    topics: [
      `uagv/${serial}/${Topic.Connection}`,
      `uagv/${serial}/${Topic.InstantActions}`,
      `uagv/${serial}/${Topic.Order}`,
      `uagv/${serial}/${Topic.State}`,
      `uagv/${serial}/${Topic.Visualization}`
    ]
  });

  agvs.value.push(agv);
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
