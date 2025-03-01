import { createMqttWebSocketClient } from './mqtt-client';
import { Topic } from '../types/mqtt.types';

/**
 * Example of how to use the WebSocket MQTT client without Electron IPC
 */
export async function connectToMqttWithWebSocket(
  host: string,
  port: string,
  basePath: string = 'vda5050',
  manufacturer: string = 'example',
  serialNumber: string = 'agv1',
  username?: string,
  password?: string
): Promise<void> {
  // Create and connect the WebSocket MQTT client
  const mqttClient = createMqttWebSocketClient(
    host,
    port,
    `vda5050_client_${manufacturer}_${serialNumber}`,
    username,
    password
  );
  
  // Connect to the MQTT broker
  await mqttClient.connect();
  
  // Subscribe to topics
  const topics = [
    `${basePath}/${manufacturer}/${serialNumber}/${Topic.Connection}`,
    `${basePath}/${manufacturer}/${serialNumber}/${Topic.InstantActions}`,
    `${basePath}/${manufacturer}/${serialNumber}/${Topic.Order}`,
    `${basePath}/${manufacturer}/${serialNumber}/${Topic.State}`,
    `${basePath}/${manufacturer}/${serialNumber}/${Topic.Visualization}`,
  ];
  
  mqttClient.subscribe(topics);
  
  // Subscribe to messages
  mqttClient.subscribeToMessages((topic, message) => {
    console.log(`Received message on topic ${topic}:`, message);
    
    // Handle different message types based on the topic
    const topicType = topic.split('/').pop() as Topic;
    
    switch (topicType) {
      case Topic.Connection:
        console.log('Connection message:', message);
        break;
      case Topic.InstantActions:
        console.log('Instant Actions message:', message);
        break;
      case Topic.Order:
        console.log('Order message:', message);
        break;
      case Topic.State:
        console.log('State message:', message);
        break;
      case Topic.Visualization:
        console.log('Visualization message:', message);
        break;
      default:
        console.log('Unknown message type:', topicType);
    }
  });
  
  // Example of publishing a message
  const connectionMessage = {
    headerId: 1,
    timestamp: new Date().toISOString(),
    version: '1.0',
    manufacturer,
    serialNumber,
    connectionState: 'ONLINE'
  };
  
  mqttClient.publish(
    `${basePath}/${manufacturer}/${serialNumber}/${Topic.Connection}`,
    connectionMessage
  );
  
  console.log('Connected to MQTT broker via WebSocket');
}

/**
 * Example of how to disconnect from the MQTT broker
 */
export function disconnectFromMqtt(): void {
  const mqttClient = createMqttWebSocketClient('', ''); // Use existing instance
  mqttClient.disconnect();
  console.log('Disconnected from MQTT broker');
} 