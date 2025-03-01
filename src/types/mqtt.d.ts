declare module 'mqtt' {
  import { EventEmitter } from 'events';

  export interface IClientOptions {
    clientId?: string;
    username?: string;
    password?: string;
    clean?: boolean;
    reconnectPeriod?: number;
    connectTimeout?: number;
    rejectUnauthorized?: boolean;
    protocol?: string;
    [key: string]: any;
  }

  export interface IClientPublishOptions {
    qos?: 0 | 1 | 2;
    retain?: boolean;
    dup?: boolean;
  }

  export interface IClientSubscribeOptions {
    qos?: 0 | 1 | 2;
  }

  export type PacketCallback = (error?: Error) => void;

  export class MqttClient extends EventEmitter {
    constructor(streamBuilder: any, options: IClientOptions);
    
    public on(event: 'connect', callback: () => void): this;
    public on(event: 'reconnect', callback: () => void): this;
    public on(event: 'close', callback: () => void): this;
    public on(event: 'disconnect', callback: () => void): this;
    public on(event: 'offline', callback: () => void): this;
    public on(event: 'error', callback: (error: Error) => void): this;
    public on(event: 'message', callback: (topic: string, message: Buffer) => void): this;
    public on(event: 'packetsend' | 'packetreceive', callback: (packet: any) => void): this;
    
    public subscribe(
      topic: string | string[],
      options?: IClientSubscribeOptions | ((error?: Error) => void),
      callback?: (error?: Error) => void
    ): this;
    
    public unsubscribe(
      topic: string | string[],
      options?: any,
      callback?: (error?: Error) => void
    ): this;
    
    public publish(
      topic: string,
      message: string | Buffer,
      options?: IClientPublishOptions | ((error?: Error) => void),
      callback?: (error?: Error) => void
    ): this;
    
    public end(force?: boolean, options?: any, callback?: () => void): this;
    public removeOutgoingMessage(mid: number): void;
    public reconnect(): void;
    public handleMessage(packet: any): void;
    public connected: boolean;
    public disconnected: boolean;
    public reconnecting: boolean;
  }

  export function connect(url: string, options?: IClientOptions): MqttClient;
  export function connectAsync(url: string, options?: IClientOptions): Promise<MqttClient>;
} 