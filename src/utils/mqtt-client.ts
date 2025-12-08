import mqtt from "mqtt";
import { ref } from "vue";
import type { MessageSubscriber } from "../types/mqtt.types";

export class MqttWebSocketClient {
  private client: mqtt.MqttClient | null = null;
  private messageSubscribers = ref<MessageSubscriber[]>([]);
  private isConnected = ref(false);
  private isConnecting = false;

  constructor(
    private readonly host: string,
    private readonly port: string,
    private readonly clientId: string = `mqtt_client_${Math.random()
      .toString(16)
      .slice(2, 8)}`,
    private readonly username?: string,
    private readonly password?: string
  ) {}

  public async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected.value) return;
    this.isConnecting = true;

    try {
      const mqttUrl = `ws://${this.host}:${this.port}/ws`;

      this.client = mqtt.connect(mqttUrl, {
        clientId: this.clientId,
        username: this.username,
        password: this.password,
      });

      this.client.on("connect", () => {
        console.log("WebSocket MQTT connected");
        this.isConnected.value = true;
      });

      this.client.on("message", (topic, message) => {
        try {
          const messageString = new TextDecoder().decode(message);
          const messageObject = JSON.parse(messageString);
          this.notifySubscribers(topic, messageObject);
        } catch (error) {
          console.error("Error processing WebSocket MQTT message:", error);
        }
      });

      this.client.on("error", (error) => {
        console.error("WebSocket MQTT connection error:", error);
        this.isConnected.value = false;
      });

      this.client.on("close", () => {
        console.log("WebSocket MQTT connection closed");
        this.isConnected.value = false;
      });
    } catch (error) {
      console.error("Failed to connect to WebSocket MQTT:", error);
      this.isConnected.value = false;
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
      const messageStr =
        typeof message === "object" ? JSON.stringify(message) : message;
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

// Create a singleton instance
let mqttWebSocketClient: MqttWebSocketClient | null = null;

export const createMqttWebSocketClient = (
  host: string,
  port: string,
  clientId?: string,
  username?: string,
  password?: string
): MqttWebSocketClient => {
  if (!mqttWebSocketClient) {
    mqttWebSocketClient = new MqttWebSocketClient(
      host,
      port,
      clientId,
      username,
      password
    );
  }
  return mqttWebSocketClient;
};

export const getMqttWebSocketClient = (): MqttWebSocketClient | null => {
  return mqttWebSocketClient;
};
