<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import VDA5050AgvToMaster from "@/components/vda5050-agv-card/vda5050-agv-to-master.component.vue";
import VDA5050MasterToAgv from "@/components/vda5050-agv-card/vda5050-master-to-agv.component.vue";
import { ConnectionState, type AgvId } from "vda-5050-lib";

const props = defineProps({
  manufacturer: { type: String, required: true },
  serialNumber: { type: String, required: true },
});
const agvId: AgvId = {
  manufacturer: props.manufacturer,
  serialNumber: props.serialNumber,
};

let agv: VDA5050Agv = new VDA5050Agv(agvId);
defineExpose({
  agv,
});
</script>

<template>
  <ui-card outlined style="padding: 10px; margin-bottom: 20px">
    <div>
      <div class="col-12 card-board">
        <div class="card-header-div">
          <div class="card-font-bold">
            {{ agvId.manufacturer }} -> {{ agvId.serialNumber }}
          </div>
          <ui-chips class="flex-right">
            <ui-chip icon="gps_fixed">
              x: {{ agv.visualizationInfo.value?.agvPosition?.x.toFixed(2) }},
              y: {{ agv.visualizationInfo.value?.agvPosition?.y.toFixed(2) }},
              θ:
              {{ agv.visualizationInfo.value?.agvPosition?.theta.toFixed(2) }}
            </ui-chip>
            <ui-chip icon="speed">
              x:
              {{
                (
                  Math.round(agv.visualizationInfo.value?.velocity?.vx! * 100) /
                  100
                ).toFixed(2)
              }}, x:
              {{
                (
                  Math.round(agv.visualizationInfo.value?.velocity?.vy! * 100) /
                  100
                ).toFixed(2)
              }}, ω:
              {{
                (
                  Math.round(
                    agv.visualizationInfo.value?.velocity?.omega! * 100
                  ) / 100
                ).toFixed(2)
              }},
            </ui-chip>
            <ui-chip
              icon="signal_wifi_0_bar"
              v-if="
                agv.connectionInfo.value?.connectionState ==
                ConnectionState.Online
              "
              >Online</ui-chip
            >
            <ui-chip
              icon="signal_wifi_bad"
              v-else-if="
                agv.connectionInfo.value?.connectionState ==
                ConnectionState.Offline
              "
              >Offline</ui-chip
            >
            <ui-chip
              icon="signal_wifi_statusbar_null"
              v-else-if="
                agv.connectionInfo.value?.connectionState ==
                ConnectionState.Connectionbroken
              "
              >Connection Broken</ui-chip
            >
            <ui-chip icon="auto_mode" v-if="agv.stateInfo.value">
              {{ agv.stateInfo.value?.operatingMode.toLocaleLowerCase() }}
            </ui-chip>
            <ui-chip icon="map" v-if="agv.stateInfo.value">
              {{ agv.stateInfo.value?.agvPosition?.mapId }}
            </ui-chip>
            <ui-chip icon="av_timer" style="width: 250px">
              {{ agv.visualizationInfo.value?.timestamp }}
            </ui-chip>
          </ui-chips>
        </div>
        <VDA5050AgvToMaster
          :agv="agv"
          v-if="agv.stateInfo.value"
        ></VDA5050AgvToMaster>
        <VDA5050MasterToAgv
          :agv="agv"
          v-if="agv.orderInfo.value || agv.stateInfo.value"
        ></VDA5050MasterToAgv>
      </div>
    </div>
    <ui-card-content> </ui-card-content>
  </ui-card>
</template>

<style lang="scss" scoped></style>
