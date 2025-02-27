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

var agvs = ref([]);
var skipUnwrap = { itemRefs: agvs };

// Computed properties to combine all nodes, edges, and layouts from all AGVs
const totalNodes = ref();
const totalEdges = ref();
const totalLayouts = ref();

setInterval(() => {
  if (agvs.value.length > 0) {
    totalNodes.value = agvs.value.map((agv: any) => toRaw(agv.agv.nodes.value));
    totalNodes.value = convertToNestedObject(toRaw(totalNodes.value));
    totalEdges.value = agvs.value.map((agv: any) => toRaw(agv.agv.edges.value));
    totalEdges.value = convertToNestedObject(toRaw(totalEdges.value));
    totalLayouts.value = agvs.value.map((agv: any) =>
      toRaw(agv.agv.layouts.value["nodes"])
    );
    totalLayouts.value = {
      nodes: convertToNestedObject(toRaw(totalLayouts.value)),
    };
  }
}, 200);

function openGithub() {
  window.open('https://github.com/bekirbostanci/vda5050_visualizer', '_blank');
}
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
            style="height: 56px; color: green"
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
        <ui-grid-cell
          style="display: flex"
          :columns="{ default: 2, tablet: 6, phone: 2 }"
        >
          <ui-button
            class="w100"
            style="color: black; height: 55px; margin-right: 20px"
            outlined
            @click="updateBroker()"
            >Start</ui-button
          >
          <ui-fab
            style="
              min-width: 55px;
              background-color: white;
              border-style: solid;
              border-width: 1px;
              border-color: gray;
              box-shadow: none;
            "
            @click="settings = !settings"
            icon="settings"
          ></ui-fab>
        </ui-grid-cell>
        <ui-grid-cell columns="12" v-if="settings" style="display: flex; align-items: center;">
          <ui-textfield class="mr w100" outlined v-model="username">
            Username
          </ui-textfield>
          <ui-textfield class="mr w100" outlined v-model="password">
            Password
          </ui-textfield>
          <ui-fab
            style="
              min-width: 55px;
              background-color: white;
              border-style: solid;
              border-width: 1px;
              border-color: gray;
              box-shadow: none;
            "
            @click="openGithub()"
            icon="help"
          ></ui-fab>
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
        :nodes="totalNodes"
        :edges="totalEdges"
        :layouts="totalLayouts"
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
    <div style="text-align: center; margin-top: 20px; font-size: 15px;">
      <p>Developed by Bekir Bostanci - <a href="https://github.com/bekirbostanci">GitHub</a></p>
    </div>
  </div>
</template>

<style lang="scss">
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

.material-icons.mdc-fab__icon {
  color: black !important;
}
</style>
