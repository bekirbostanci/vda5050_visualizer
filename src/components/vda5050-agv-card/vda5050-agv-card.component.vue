<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import VDA5050AgvToMaster from "./vda5050-agv-to-master.component.vue";
import VDA5050MasterToAgv from "./vda5050-master-to-agv.component.vue";
import { ConnectionState, type AgvId } from "vda-5050-lib";
import { onMounted, onUnmounted, computed } from "vue";
import { subscribeToMessages } from "@/controllers/vda5050.controller";

const props = defineProps({
  manufacturer: { type: String, required: true },
  serialNumber: { type: String, required: true },
});

const agvId: AgvId = {
  manufacturer: props.manufacturer,
  serialNumber: props.serialNumber,
};

let agv: VDA5050Agv = new VDA5050Agv(props.manufacturer, props.serialNumber);

// Use computed properties to reduce reactivity overhead
const position = computed(() => {
  const pos = agv.visualizationInfo.value?.agvPosition;
  return pos
    ? {
        x: pos.x.toFixed(2),
        y: pos.y.toFixed(2),
        theta: pos.theta.toFixed(2),
      }
    : null;
});

const velocity = computed(() => {
  const vel = agv.visualizationInfo.value?.velocity;
  return vel
    ? {
        vx: (Math.round(vel.vx * 100) / 100).toFixed(2),
        vy: (Math.round(vel.vy * 100) / 100).toFixed(2),
        omega: (Math.round(vel.omega * 100) / 100).toFixed(2),
      }
    : null;
});

onMounted(() => {
  // Subscribe to MQTT messages
  subscribeToMessages((topic, message) => {
    if (topic.includes(props.serialNumber)) {
      agv.handleMqttMessage(topic, message);
    }
  });
});

onUnmounted(() => {
  // Clean up any subscriptions or listeners
});

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
            <ui-chip icon="gps_fixed" v-if="position">
              x: {{ position.x }}, y: {{ position.y }}, θ: {{ position.theta }}
            </ui-chip>
            <ui-chip icon="speed" v-if="velocity">
              x: {{ velocity.vx }}, y: {{ velocity.vy }}, ω:
              {{ velocity.omega }}
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
            <ui-chip
              icon="av_timer"
              style="width: 230px"
              v-if="agv.visualizationInfo.value"
            >
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

<style lang="scss" scoped>
.card-board {
  contain: content; /* Add CSS containment */
}
</style>
