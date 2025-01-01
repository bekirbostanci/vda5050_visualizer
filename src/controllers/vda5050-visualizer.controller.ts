import {
  getMasterController,
  getMqttClient,
} from "@/controllers/vda5050.controller";
import type { AgvId, MasterController } from "vda-5050-lib";
import { ref } from "vue";
export class VDA5050Visualizer {
  public robotList = ref<AgvId[]>([]);
  public mc: MasterController | undefined;
  constructor() {
    this.mc = getMasterController();

    const mqttTopic =
      this.mc.clientOptions.interfaceName +
      "/v" +
      this.mc.clientOptions.vdaVersion.substring(0, 1);

    const mqttClient = getMqttClient();
    mqttClient.subscribe(mqttTopic + "/#");

    mqttClient.on("message", (topic: string) => {
      if (topic.indexOf(mqttTopic) != -1) {
        const topic_split = topic.split("/");

        const agvId = {
          manufacturer: topic_split[2],
          serialNumber: topic_split[3],
        };

        if (
          this.robotList.value?.find(
            (agv) =>
              agv.serialNumber == agvId.serialNumber &&
              agv.manufacturer == agvId.manufacturer
          ) == undefined
        ) {
          this.robotList.value?.push(agvId);
        }
      }
    });
  }
}
