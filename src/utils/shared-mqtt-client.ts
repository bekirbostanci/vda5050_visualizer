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
  private subscribedTopics = ref<Set<string>>(new Set());
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds

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
    this.reconnectAttempts = 0;
    
    // Set up message handler
    this.client.on("message", (topic, message) => {
      try {
        const messageString = new TextDecoder().decode(message);
        const messageObject = JSON.parse(messageString);
        this.notifySubscribers(topic, messageObject);
      } catch (error) {
        console.error("Error processing MQTT message:", error);
        // Still notify subscribers with the raw message if JSON parsing fails
        this.notifySubscribers(topic, message);
      }
    });

    // Re-subscribe to all previously subscribed topics
    if (this.subscribedTopics.value.size > 0) {
      const topics = Array.from(this.subscribedTopics.value);
      this.subscribe(topics);
    }
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
        reconnectPeriod: this.reconnectDelay,
        connectTimeout: 30000, // 30 seconds
      });

      this.client.on("connect", () => {
        console.log("WebSocket MQTT connected");
        this.isConnected.value = true;
        this.reconnectAttempts = 0;
      });

      this.client.on("error", (error) => {
        console.error("WebSocket MQTT connection error:", error);
        this.isConnected.value = false;
      });

      this.client.on("close", () => {
        console.log("WebSocket MQTT connection closed");
        this.isConnected.value = false;
      });

      this.client.on("reconnect", () => {
        console.log(`WebSocket MQTT reconnecting (attempt ${++this.reconnectAttempts})`);
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping reconnect.`);
          this.client?.end();
          this.client = null;
        }
      });

      this.client.on("message", (topic, message) => {
        try {
          const messageString = new TextDecoder().decode(message);
          const messageObject = JSON.parse(messageString);
          this.notifySubscribers(topic, messageObject);
        } catch (error) {
          console.error("Error processing MQTT message:", error);
          // Still notify subscribers with the raw message if JSON parsing fails
          this.notifySubscribers(topic, message);
        }
      });

      // Wait for the client to connect
      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
          this.client?.removeListener("connect", connectHandler);
          this.client?.removeListener("error", errorHandler);
        }, 10000); // 10 seconds timeout

        const connectHandler = () => {
          clearTimeout(connectTimeout);
          this.client?.removeListener("error", errorHandler);
          resolve(this.client!);
        };

        const errorHandler = (err: Error) => {
          clearTimeout(connectTimeout);
          this.client?.removeListener("connect", connectHandler);
          reject(err);
        };

        this.client?.once("connect", connectHandler);
        this.client?.once("error", errorHandler);
      });
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

    // Add topics to the set of subscribed topics
    topics.forEach(topic => this.subscribedTopics.value.add(topic));

    this.client.subscribe(topics, (error?: Error) => {
      if (error) {
        console.error("WebSocket MQTT Subscription error:", error);
      } else {
        console.log("Subscribed to WebSocket MQTT topics:", topics);
      }
    });
  }

  public unsubscribe(topics: string[]): void {
    if (!this.client || !this.isConnected.value) {
      console.error("Cannot unsubscribe: MQTT client not connected");
      return;
    }

    // Remove topics from the set of subscribed topics
    topics.forEach(topic => this.subscribedTopics.value.delete(topic));

    this.client.unsubscribe(topics, (error?: Error) => {
      if (error) {
        console.error("WebSocket MQTT Unsubscription error:", error);
      } else {
        console.log("Unsubscribed from WebSocket MQTT topics:", topics);
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
      this.subscribedTopics.value.clear();
    }
  }

  public subscribeToMessages(callback: MessageSubscriber): () => void {
    this.messageSubscribers.value.push(callback);
    
    // Return a function to unsubscribe
    return () => {
      const index = this.messageSubscribers.value.indexOf(callback);
      if (index !== -1) {
        this.messageSubscribers.value.splice(index, 1);
      }
    };
  }

  private notifySubscribers(topic: string, message: any): void {
    this.messageSubscribers.value.forEach((subscriber) => {
      try {
        subscriber(topic, message);
      } catch (error) {
        console.error("Error in message subscriber:", error);
      }
    });
  }

  public get connected(): boolean {
    return this.isConnected.value;
  }

  public get subscribedTopicsList(): string[] {
    return Array.from(this.subscribedTopics.value);
  }
}

// Export the singleton instance
export const sharedMqttClient = SharedMqttClient.getInstance(); 