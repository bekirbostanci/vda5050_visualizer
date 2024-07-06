import {
  AgvController,
  MasterController,
  VdaVersion,
  VirtualAgvAdapter,
  type AgvId,
  type ClientOptions,
  type VirtualAgvAdapterOptions,
} from "vda-5050-lib";
import mqtt from "mqtt";
import { ref } from "vue";
let mc: MasterController;
let client: mqtt.MqttClient;
const agvs: VirtualAgvAdapter[] = [];

export enum MqttClientState {
  OFFLINE = "offline",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
}
const clientState = ref<MqttClientState>(MqttClientState.OFFLINE);

export async function masterController(
  mqttIp: string,
  mqttPort: string,
  basepath: string,
  interfaceName: string,
  vdaVersion: VdaVersion,
  username: string = "",
  password: string = "",
) {
  if (mc) {
    mc.stop();
    client.end();
  }
  client = mqtt.connect("ws://" + mqttIp + ":" + mqttPort + "/" + basepath, {username:username, password:password});
  clientStateHandlers();
  mc = new MasterController(
    {
      interfaceName: interfaceName,
      transport: {
        brokerUrl: "ws://" + mqttIp + ":" + mqttPort + "/" + basepath,
        username: username,
        password: password,
      },
      vdaVersion: vdaVersion,
    },
    {}
  );

  await mc.start();
}
function clientStateHandlers() {
  client.on("connect", () => {
    clientState.value = MqttClientState.CONNECTED;
  });
  client.on("reconnect", () => {
    clientState.value = MqttClientState.RECONNECTING;
  });
  client.on("offline", () => {
    clientState.value = MqttClientState.OFFLINE;
  });
}

export function getMqttClientState(): MqttClientState {
  return clientState.value;
}
export function getMasterController(): MasterController {
  return mc;
}
export function getMqttClient(): mqtt.MqttClient {
  return client;
}
export function getAgvs(): VirtualAgvAdapter[] {
  return agvs;
}

export async function agvController(
  serial: string,
  mapId: string,
  x: number,
  y: number,
  mqttIp: string,
  mqttPort: string
): Promise<VirtualAgvAdapter> {
  // Use minimal client options: communication namespace and broker endpoint address.
  const agvClientOptions: ClientOptions = {
    interfaceName: "uagv",
    transport: { brokerUrl: "ws://" + mqttIp + ":" + mqttPort },
    vdaVersion: "2.0.0",
  };

  // The target AGV.
  const agvId: AgvId = { manufacturer: "x", serialNumber: serial };

  // Specify associated adapter type; use defaults for all other AGV controller options.

  const agvControllerOptions = {
    agvAdapterType: VirtualAgvAdapter,
    publishVisualizationInterval: 20,
  };

  // Use defaults for all adapter options of Virtual AGV adapter.
  const agvAdapterOptions: VirtualAgvAdapterOptions = {
    vehicleSpeed: 0.75,
    timeLapse: 5,
    tickRate: 20,
    agvNormalDeviationThetaTolerance: 10,
    agvNormalDeviationXyTolerance: 1,
    initialPosition: { mapId: mapId, x: x, y: y, theta: 0.0, lastNodeId: "" },
  };

  // Create instance of AGV Controller with client, controller, and adapter options.
  const agvController = new AgvController(
    agvId,
    agvClientOptions,
    agvControllerOptions,
    agvAdapterOptions
  );

  // Start client interaction, connect to MQTT broker.
  await agvController.start();

  const adapter: VirtualAgvAdapter = new VirtualAgvAdapter(
    agvController,
    agvAdapterOptions,
    agvController.debug
  );

  agvs.push(adapter);
  return adapter;
}
