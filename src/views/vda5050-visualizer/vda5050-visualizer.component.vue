<script setup lang="ts">
import { ref, Ref } from "vue";
import { VdaVersion } from "vda-5050-lib";
import { VDA5050Visualizer } from "@/controllers/vda5050-visualizer.controller";
import VDA5050Card from "@/components/vda5050-agv-card/vda5050-agv-card.component.vue";
import { masterController } from "@/controllers/vda5050.controller";

const brokerIp = ref(import.meta.env.VITE_MQTT_HOST);
const brokerPort = ref(import.meta.env.VITE_MQTT_PORT);
const basepath = ref(import.meta.env.VITE_BASEPATH);
const interfaceName = ref(import.meta.env.VITE_VDA_INTERFACE);
const vdaVersion: Ref<VdaVersion> = ref(import.meta.env.VITE_VDA_VERSION);
let vda5050Visualizer: VDA5050Visualizer | undefined;
const version = ref(0);

function updateBroker() {
  version.value += 1;
  masterController(
    brokerIp.value,
    brokerPort.value,
    basepath.value,
    interfaceName.value,
    vdaVersion.value
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
</script>
<template>
  <div style="padding: 10px" :key="version">
    <div class="mb">
      <ui-grid class="demo-grid">
        <ui-grid-cell class="demo-cell" columns="5">
          <ui-textfield class="mr w100" outlined v-model="brokerIp">
            Broker IP
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell class="demo-cell" columns="1">
          <ui-textfield class="mr w100" outlined v-model="brokerPort">
            Broker PORT
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell class="demo-cell" columns="1">
          <ui-textfield class="mr w100" outlined v-model="basepath">
            Basepath
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell class="demo-cell" columns="2">
          <ui-textfield class="mr w100" outlined v-model="interfaceName">
            Interface Name
          </ui-textfield>
        </ui-grid-cell>
        <ui-grid-cell class="demo-cell" columns="2">
          <ui-select
            class="mr w100"
            v-model="vdaVersion"
            :options="options"
            outlined
          >
            VDA Version
          </ui-select>
        </ui-grid-cell>
        <ui-grid-cell class="demo-cell" :columns="{ default: 1, phone: 2 }">
          <ui-button
            class="w100"
            style="height: 55px"
            outlined
            @click="updateBroker()"
            >Start</ui-button
          >
        </ui-grid-cell>
      </ui-grid>
    </div>

    <div
      v-for="agv in vda5050Visualizer?.robotList.value"
      v-bind:key="'robot-card-' + agv.serialNumber"
    >
      <VDA5050Card
        :manufacturer="agv.manufacturer"
        :serialNumber="agv.serialNumber"
      />
    </div>
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
</style>
