<script setup lang="ts">
import { ref, toRaw } from "vue";
import config from "@/utils/configs";
import { VDA5050Visualizer } from "@/controllers/vda5050-visualizer.controller";
import VDA5050Card from "@/components/vda5050-agv-card/vda5050-agv-card.component.vue";
import SkeletonCard from "@/components/skeleton-card.vue";
import {
  MqttClientState,
  getMqttClientState,
  masterController,
} from "@/controllers/vda5050.controller";

const brokerIp = ref(import.meta.env.VITE_MQTT_HOST);
const username = ref("");
const password = ref("");
const brokerPort = ref(import.meta.env.VITE_MQTT_PORT);
const basepath = ref(import.meta.env.VITE_BASEPATH);
const interfaceName = ref(import.meta.env.VITE_VDA_INTERFACE);
const vdaVersion = ref(import.meta.env.VITE_VDA_VERSION);
let vda5050Visualizer: VDA5050Visualizer | undefined;
const version = ref(0);
const settings = ref(false);

function updateBroker() {
  version.value += 1;
  masterController(
    brokerIp.value,
    brokerPort.value,
    basepath.value,
    interfaceName.value,
    vdaVersion.value,
    username.value,
    password.value
  );
  vda5050Visualizer = new VDA5050Visualizer();
}

const options = [
  {
    label: "2.0.0",
    value: "2.0.0",
  },
  {
    label: "1.1.0",
    value: "1.1.0",
  },
];

function convertToNestedObject<T extends { [key: string]: any }>(
  array: T[]
): any {
  const result: any = {};

  for (const item of array) {
    for (const key in item) {
      result[key] = item[key];
    }
  }

  return result;
}

var agvs = ref({});
var skipUnwrap = { itemRefs: agvs };

// Computed properties to combine all nodes, edges, and layouts from all AGVs
const total_nodes = ref();
const total_edges = ref();
const total_layouts = ref();

setInterval(() => {
  if (agvs.value.length > 0) {
    total_nodes.value = agvs.value.map((agv) => toRaw(agv.agv.nodes.value));
    total_nodes.value = convertToNestedObject(toRaw(total_nodes.value));
    total_edges.value = agvs.value.map((agv) => toRaw(agv.agv.edges.value));
    total_edges.value = convertToNestedObject(toRaw(total_edges.value));
    total_layouts.value = agvs.value.map((agv) =>
      toRaw(agv.agv.layouts.value["nodes"])
    );
    total_layouts.value = {
      nodes: convertToNestedObject(toRaw(total_layouts.value)),
    };
  }
}, 200);
</script>
<template>
  <div style="padding: 10px" :key="version">
    <div class="mb">
      <ui-grid>
        <ui-grid-cell columns="3">
          <ui-textfield class="mr w100" outlined v-model="brokerIp">
            Broker IP
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="1">
          <ui-textfield class="mr w100" outlined v-model="brokerPort">
            Broker PORT
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="1">
          <ui-textfield class="mr w100" outlined v-model="basepath">
            Basepath
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="1">
          <ui-textfield class="mr w100" outlined v-model="interfaceName">
            Interface Name
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="2">
          <ui-select
            class="mr w100"
            v-model="vdaVersion"
            :options="options"
            outlined
          >
            VDA Version
          </ui-select>
        </ui-grid-cell>
        <ui-grid-cell
          :columns="{ default: 2, tablet: 2, phone: 2 }"
          v-if="getMqttClientState() == MqttClientState.CONNECTED"
        >
          <ui-button
            class="w100 not-clickable"
            style="height: 55px"
            outlined
            icon="wifi_tethering"
          >
            {{ getMqttClientState() }}</ui-button
          >
        </ui-grid-cell>
        <ui-grid-cell
          :columns="{ default: 2, tablet: 2, phone: 2 }"
          v-else-if="getMqttClientState() == MqttClientState.OFFLINE"
        >
          <ui-button
            disabled
            class="w100 not-clickable"
            style="height: 55px"
            outlined
            icon="wifi_tethering_off"
          >
            {{ getMqttClientState() }}</ui-button
          >
        </ui-grid-cell>
        <ui-grid-cell
          :columns="{ default: 2, tablet: 2, phone: 2 }"
          v-else-if="getMqttClientState() == MqttClientState.RECONNECTING"
        >
          <ui-button class="w100 not-clickable" style="height: 55px" outlined>
            {{ getMqttClientState() }}</ui-button
          >
        </ui-grid-cell>
        <ui-grid-cell :columns="{ default: 1, tablet: 2, phone: 2 }">
          <ui-button
            class="w100"
            style="height: 55px"
            outlined
            icon="settings"
            @click="settings = !settings"
            >Settings</ui-button
          >
        </ui-grid-cell>
        <ui-grid-cell :columns="{ default: 1, tablet: 4, phone: 4 }">
          <ui-button
            class="w100"
            style="height: 55px"
            outlined
            @click="updateBroker()"
            >Start</ui-button
          >
        </ui-grid-cell>
        <ui-grid-cell columns="6" v-if="settings">
          <ui-textfield class="mr w100" outlined v-model="username">
            Username
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell columns="6" v-if="settings">
          <ui-textfield class="mr w100" outlined v-model="password">
            Password
          </ui-textfield>
        </ui-grid-cell>
      </ui-grid>
    </div>
    <ui-card
      outlined
      style="padding: 10px; margin-bottom: 20px"
      v-if="agvs.length > 0"
    >
      <v-network-graph
        style="height: 750px"
        zoom-level="100"
        :nodes="total_nodes"
        :edges="total_edges"
        :layouts="total_layouts"
        :configs="config"
      >
      </v-network-graph>
    </ui-card>
    <div
      v-if="
        vda5050Visualizer !== undefined &&
        vda5050Visualizer?.robotList.value.length > 0
      "
    >
      <div
        v-for="agv in vda5050Visualizer?.robotList.value"
        v-bind:key="'robot-card-' + agv.serialNumber"
      >
        <VDA5050Card
          :manufacturer="agv.manufacturer"
          :serialNumber="agv.serialNumber"
          :ref="skipUnwrap.itemRefs"
        />
      </div>
    </div>
    <SkeletonCard v-else></SkeletonCard>
  </div>
</template>

<style lang="scss" scoped>
.mr {
  margin-right: 10px;
}

.mb {
  margin-bottom: 10px;
}

.w100 {
  width: 100%;
}

.not-clickable {
  pointer-events: none;
}
</style>
