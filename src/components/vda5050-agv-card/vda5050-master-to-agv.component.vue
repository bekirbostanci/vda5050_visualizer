<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import { ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { defineConfigs } from "v-network-graph";

const props = defineProps({
  agv: { type: VDA5050Agv, required: true },
});
const orderShow = ref(false);
const instantActionsShow = ref(false);
const configs = defineConfigs({
  node: {
    draggable: false,
    zOrder: {
      zIndex: (node) => node.zIndex,
    },
    normal: {
      type: "circle",
      radius: 15,
      color: (node) => node.color,
    },
    hover: {
      color: "black",
    },
    label: {
      directionAutoAdjustment: true,
      visible: true,
      fontSize: 15,
    },
  },
  edge: {
    gap: 12,
    normal: {
      width: 3,
      color: (edge) => edge.color,
      dasharray: "20 16",
      animate: true,
      animationSpeed: -20,
    },
    label: {
      fontSize: 15,
    },
    selfLoop: {
      radius: 25,
    },
    hover: {
      color: "black",
    },
    marker: {
      source: {
        type: "angle",
        width: 4,
        height: 4,
        margin: -1,
        offset: 0,
        units: "strokeWidth",
        color: null,
      },
    },
  },
  view: {
    maxZoomLevel: 200,
    grid: {
      visible: true,
      interval: 1,
      thickIncrements: 2,
      line: {
        color: "#e0e0e0",
        width: 1,
        dasharray: 1,
      },
    },
  },
});
</script>

<template>
  <ui-divider class="mb-2 mt-2 card-divider"></ui-divider>
  <div class="card-header-div">
    <div style="display: flex">
      <div class="card-font-bold">Master Controller -> AGV</div>
      <div class="card-font" style="margin-left: 20px">
        Header : {{ props.agv.orderInfo.value?.headerId }}
      </div>
    </div>
    <ui-chips class="flex-right">
      <ui-chip icon="raw_on" @click="orderShow = !orderShow"> Order </ui-chip>
      <ui-chip icon="raw_on" @click="instantActionsShow = !instantActionsShow">
        Instant Actions
      </ui-chip>
      <ui-chip icon="av_timer">
        {{ props.agv.orderInfo.value?.timestamp }}
      </ui-chip>
    </ui-chips>
  </div>
  <div class="card-header-div">
    <div v-if="props.agv.stateInfo.value" style="display: flex">
      <div class="card-font">
        Order : {{ props.agv.orderInfo.value?.orderId }}
      </div>
      <div class="card-font mal-1">
        Update : {{ props.agv.orderInfo.value?.orderUpdateId }}
      </div>
    </div>
  </div>

  <v-network-graph
    style="height: 750px"
    zoom-level="100"
    :nodes="props.agv.nodes.value"
    :edges="props.agv.edges.value"
    :layouts="props.agv.layouts.value"
    :configs="configs"
    v-if="props.agv.orderInfo.value"
  >
    <template #edge-label="{ edge, ...slotProps }">
      <v-edge-label
        :text="edge.label"
        align="center"
        vertical-align="above"
        v-bind="slotProps"
      />
    </template>
    <template #override-node-label="{ scale, text }">
      <text
        x="0"
        y="0"
        :font-size="9 * scale"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#ffffff"
        v-if="text == agv.agvId.serialNumber"
        >{{ text }}</text
      >
    </template>
  </v-network-graph>
  <vue-json-pretty
    v-if="orderShow"
    :data="{ key: props.agv.orderInfo.value }"
  />
  <vue-json-pretty
    v-if="instantActionsShow"
    :data="{ key: props.agv.instantActionsInfo.value }"
  />
</template>

<style lang="scss" scoped></style>
