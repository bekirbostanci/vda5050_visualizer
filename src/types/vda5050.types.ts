import type { Edges, Layouts, Nodes } from "v-network-graph";
import type { Ref } from "vue";

export interface VDA5050Error {
  errorType: string;
  errorDescription: string;
  errorLevel: "warning" | "fatal";
  errorReference?: string;
}

export interface AgvState {
  position: { x: number; y: number; theta: number };
  velocity: number;
  batteryLevel: number;
  errors: VDA5050Error[];
  loads: any[];
  agvPosition: { x: number; y: number; theta: number };
  operatingMode: string;
  nodeStates: any[];
  edgeStates: any[];
  lastNodeId: string;
  lastNodeSequenceId: number;
  driving: boolean;
  timestamp: string;
}

export interface ColorSchema {
  nodeStandard: string;
  nodeAction: string;
  edgeStandard: string;
  edgeAction: string;
  robot: string;
}

export interface IVDA5050Agv {
  readonly agvId: { manufacturer: string; serialNumber: string };
  readonly orderInfo: Ref<any>;
  readonly instantActionsInfo: Ref<any>;
  readonly stateInfo: Ref<any>;
  readonly connectionInfo: Ref<any>;
  readonly visualizationInfo: Ref<any>;
  readonly nodes: Ref<Nodes>;
  readonly edges: Ref<Edges>;
  readonly layouts: Ref<Layouts>;
  readonly color: string;
  colors: ColorSchema;
  mqttTopic: string;
  handleMqttMessage(topic: string, message: any): void;
  disconnect(): void;
}

export interface AGVInstance {
  agv: IVDA5050Agv;
  topics: string[];
  credentials?: {
    username?: string;
    password?: string;
  };
}

export interface AgvId {
  manufacturer: string;
  serialNumber: string;
}

export enum ConnectionState {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  CONNECTIONBROKEN = "CONNECTIONBROKEN",
}
