import { sharedMqttClient } from "./shared-mqtt-client";
import { Topic } from "../types/mqtt.types";

/**
 * Example of how to use the shared MQTT client
 * This approach allows multiple components to use the same MQTT connection
 */
export async function connectToMqttWithSharedClient(
  host: string,
  port: string,
  basePath: string = "vda5050",
  manufacturer: string = "example",
  serialNumber: string = "agv1",
  username?: string,
  password?: string
): Promise<void> {
  try {
    // Connect to the MQTT broker using the shared client
    // If already connected, this will return the existing client
    await sharedMqttClient.connect(
      host,
      port,
      `vda5050_client_${Math.random().toString(16).slice(2, 8)}`,
      username,
      password
    );

    // Subscribe to topics
    const topics = [
      `${basePath}/${manufacturer}/${serialNumber}/${Topic.Connection}`,
      `${basePath}/${manufacturer}/${serialNumber}/${Topic.InstantActions}`,
      `${basePath}/${manufacturer}/${serialNumber}/${Topic.Order}`,
      `${basePath}/${manufacturer}/${serialNumber}/${Topic.State}`,
      `${basePath}/${manufacturer}/${serialNumber}/${Topic.Visualization}`,
    ];

    sharedMqttClient.subscribe(topics);

    // Subscribe to messages
    sharedMqttClient.subscribeToMessages((topic, message) => {
      // Only process messages for this AGV
      // Use a more precise matching method to avoid substring matching issues
      const topicParts = topic.split("/");
      const manufacturerIndex = topicParts.findIndex(
        (part) => part === manufacturer
      );

      if (
        manufacturerIndex !== -1 &&
        manufacturerIndex + 1 < topicParts.length &&
        topicParts[manufacturerIndex + 1] === serialNumber
      ) {
        console.log(`Received message on topic ${topic}:`, message);

        // Handle different message types based on the topic
        const topicType = topic.split("/").pop() as Topic;

        switch (topicType) {
          case Topic.Connection:
            console.log("Connection message:", message);
            break;
          case Topic.InstantActions:
            console.log("Instant Actions message:", message);
            break;
          case Topic.Order:
            console.log("Order message:", message);
            break;
          case Topic.State:
            console.log("State message:", message);
            break;
          case Topic.Visualization:
            console.log("Visualization message:", message);
            break;
          default:
            console.log("Unknown message type:", topicType);
        }
      }
    });

    // Example of publishing a message
    const connectionMessage = {
      headerId: 1,
      timestamp: new Date().toISOString(),
      version: "1.0",
      manufacturer,
      serialNumber,
      connectionState: "ONLINE",
    };

    sharedMqttClient.publish(
      `${basePath}/${manufacturer}/${serialNumber}/${Topic.Connection}`,
      connectionMessage
    );

    console.log("Connected to MQTT broker via shared WebSocket client");
  } catch (error) {
    console.error("Failed to connect to MQTT broker:", error);
  }
}

/**
 * Example of how to disconnect from the MQTT broker
 * Note: This will disconnect all components using the shared client
 * Only call this when the application is shutting down
 */
export function disconnectSharedMqtt(): void {
  sharedMqttClient.disconnect();
  console.log("Disconnected from MQTT broker");
}
