<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import VDA5050AgvToMaster from "./vda5050-agv-to-master.component.vue";
import VDA5050MasterToAgv from "./vda5050-master-to-agv.component.vue";
import { ConnectionState, type AgvId } from "@/types/vda5050.types";
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

// Add computed property for sequence progress
const sequenceProgress = computed(() => {
  const orderInfo = agv.orderInfo.value;
  const stateInfo = agv.stateInfo.value;
  
  if (!orderInfo || !stateInfo) return null;
  
  const lastNodeSequenceId = orderInfo.nodes.length > 0 ? 
    Math.max(...orderInfo.nodes.map((node: { sequenceId: number }) => node.sequenceId)) : 0;
  
  const currentNodeSequenceId = stateInfo.lastNodeSequenceId || 0;
  
  return {
    current: currentNodeSequenceId,
    total: lastNodeSequenceId,
    percentage: lastNodeSequenceId > 0 ? 
      Math.round((currentNodeSequenceId / lastNodeSequenceId) * 100) : 0
  };
});

onMounted(() => {
  // Subscribe to MQTT messages
  subscribeToMessages((topic, message) => {
    const topicParts = topic.split("/");
    const topicSerialNumber = topicParts[3]; // Assuming the serial number is the third part of the topic
    if (topicSerialNumber === props.serialNumber) {
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
                ConnectionState.ONLINE
              "
              >Online</ui-chip
            >
            <ui-chip
              icon="signal_wifi_bad"
              v-else-if="
                agv.connectionInfo.value?.connectionState ==
                ConnectionState.OFFLINE
              "
              >Offline</ui-chip
            >
            <ui-chip
              icon="signal_wifi_statusbar_null"
              v-else-if="
                agv.connectionInfo.value?.connectionState ==
                ConnectionState.CONNECTIONBROKEN
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
        
        <!-- Add Order Progress Bar -->
        <div class="order-progress-container" v-if="sequenceProgress && sequenceProgress.total > 0">
          <div class="progress-label">
            <span class="progress-text">Order Progress: {{ sequenceProgress.current }} / {{ sequenceProgress.total }}</span>
            <span class="progress-percentage">{{ sequenceProgress.percentage }}%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: sequenceProgress.percentage + '%' }"></div>
          </div>
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

.order-progress-container {
  margin: 10px 0;
  padding: 5px 10px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.progress-text {
  font-weight: 500;
}

.progress-percentage {
  font-weight: bold;
}

.progress-bar-container {
  width: 100%;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: #808080;
  border-radius: 5px;
  transition: width 0.3s ease;
}
</style>
