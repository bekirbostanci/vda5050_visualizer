export {};

declare global {
  interface Window {
    electron: any;
    handleMqttMessage?: (topic: string, message: any) => void;
  }
} 