import type { Ref } from "vue";
import type { IVDA5050Agv } from "./vda5050.types";

/**
 * Interface for AGV instances in the controller
 * This is a wrapper around IVDA5050Agv that includes additional properties
 * needed by the controller
 */
export interface AGVControllerInstance {
  agv: IVDA5050Agv;
  topics: string[];
  credentials?: {
    username?: string;
    password?: string;
  };
}

/**
 * Interface for MQTT connection configuration
 */
export interface MqttControllerConfig {
  host: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  topics: string[];
}

/**
 * Interface for the VDA5050 controller
 */
export interface IVDA5050Controller {
  getMqttClientState(): string;
  getAgvs(): IVDA5050Agv[];
  createAgv(
    manufacturer: string,
    serialNumber: string,
    x: number,
    y: number,
    mqttIp: string,
    mqttPort: string,
    basePath: string,
    interfaceName: string,
    username?: string,
    password?: string,
    connectionType?: string
  ): Promise<IVDA5050Agv>;
  connectMqtt(
    mqttIp: string,
    mqttPort: string,
    basepath: string,
    interfaceName: string,
    username?: string,
    password?: string,
    connectionType?: string
  ): Promise<void>;
  disconnect(): void;
} 