import { getMasterController } from "@/controllers/vda5050.controller";
import type { AgvId, MasterController } from "vda-5050-lib";
import { ref } from "vue";
export class VDA5050Visualizer {
  public robotList = ref<AgvId[]>([]);
  public mc: MasterController | undefined;
  constructor() {
    this.mc = getMasterController();
    this.mc.trackAgvs((agvId: AgvId) => {
      if (
        this.robotList.value?.find(
          (agv) =>
            agv.serialNumber == agvId.serialNumber &&
            agv.manufacturer == agvId.manufacturer
        ) == undefined
      ) {
        this.robotList.value?.push(agvId);
      }
    });
  }
}
