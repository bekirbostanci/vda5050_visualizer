export interface MqttConfig {
  brokerIp: string;
  brokerPort: string;
  basepath: string;
  interfaceName: string;
  username: string;
  password: string;
}

export const defaultConfig: MqttConfig = {
  brokerIp: '',
  brokerPort: '',
  basepath: '',
  interfaceName: '',
  username: '',
  password: '',
};

export function saveConfig(config: MqttConfig): void {
  localStorage.setItem('mqttConfig', JSON.stringify(config));
}

export function loadSavedConfig(): MqttConfig {
  const savedConfig = localStorage.getItem('mqttConfig');
  if (savedConfig) {
    return JSON.parse(savedConfig);
  }
  return defaultConfig;
} 