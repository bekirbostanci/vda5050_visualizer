import mqtt from "mqtt";
import { ref } from "vue";
import type { MessageSubscriber } from "../types/mqtt.types";

// Singleton MQTT client that can be shared across the application
class SharedMqttClient {
  private static instance: SharedMqttClient;
  private client: mqtt.MqttClient | null = null;
  private messageSubscribers = ref<MessageSubscriber[]>([]);
  private isConnected = ref(false);
  private isConnecting = false;

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): SharedMqttClient {
    if (!SharedMqttClient.instance) {
      SharedMqttClient.instance = new SharedMqttClient();
    }
    return SharedMqttClient.instance;
  }

  public getClient(): mqtt.MqttClient | null {
    return this.client;
  }

  public setClient(client: mqtt.MqttClient): void {
    this.client = client;
    this.isConnected.value = true;
    
    // Set up message handler
    this.client.on("message", (topic, message) => {
      try {
        const messageString = new TextDecoder().decode(message);
        const messageObject = JSON.parse(messageString);
        this.notifySubscribers(topic, messageObject);
      } catch (error) {
        console.error("Error processing MQTT message:", error);
      }
    });
  }

  public async connect(
    host: string,
    port: string,
    clientId: string = `mqtt_client_${Math.random().toString(16).slice(2, 8)}`,
    username?: string,
    password?: string
  ): Promise<mqtt.MqttClient> {
    if (this.isConnecting) {
      throw new Error("Connection already in progress");
    }
    
    if (this.isConnected.value && this.client) {
      return this.client;
    }
    
    this.isConnecting = true;

    try {
      const mqttUrl = `ws://${host}:${port}/ws`;
      
      this.client = mqtt.connect(mqttUrl, {
        clientId,
        username,
        password,
      });

      this.client.on("connect", () => {
        console.log("WebSocket MQTT connected");
        this.isConnected.value = true;
      });

      this.client.on("error", (error) => {
        console.error("WebSocket MQTT connection error:", error);
        this.isConnected.value = false;
      });

      this.client.on("close", () => {
        console.log("WebSocket MQTT connection closed");
        this.isConnected.value = false;
      });

      this.client.on("message", (topic, message) => {
        try {
          const messageString = new TextDecoder().decode(message);
          const messageObject = JSON.parse(messageString);
          this.notifySubscribers(topic, messageObject);
        } catch (error) {
          console.error("Error processing MQTT message:", error);
        }
      });

      return this.client;
    } catch (error) {
      console.error("Failed to connect to WebSocket MQTT:", error);
      this.isConnected.value = false;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public subscribe(topics: string[]): void {
    if (!this.client || !this.isConnected.value) {
      console.error("Cannot subscribe: MQTT client not connected");
      return;
    }

    this.client.subscribe(topics, (error?: Error) => {
      if (error) {
        console.error("WebSocket MQTT Subscription error:", error);
      } else {
        console.log("Subscribed to WebSocket MQTT topics:", topics);
      }
    });
  }

  public publish(topic: string, message: any): void {
    if (!this.client || !this.isConnected.value) {
      console.error("Cannot publish: MQTT client not connected");
      return;
    }

    try {
      const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;
      this.client.publish(topic, messageStr, (error?: Error) => {
        if (error) {
          console.error(`Failed to publish to ${topic}:`, error);
        }
      });
    } catch (error) {
      console.error("Failed to publish message:", error);
    }
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected.value = false;
    }
  }

  public subscribeToMessages(callback: MessageSubscriber): void {
    this.messageSubscribers.value.push(callback);
  }

  private notifySubscribers(topic: string, message: any): void {
    this.messageSubscribers.value.forEach((subscriber) => {
      subscriber(topic, message);
    });
  }

  public get connected(): boolean {
    return this.isConnected.value;
  }
}

// Export the singleton instance
export const sharedMqttClient = SharedMqttClient.getInstance(); 