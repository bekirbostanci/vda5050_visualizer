export interface MqttConnectionConfig {
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

export type MessageSubscriber = (topic: string, message: any) => void;

export interface MqttConfig {
  host: string;
  port: string;
  basePath: string;
  interfaceName: string;
  username: string;
  password: string;
}
