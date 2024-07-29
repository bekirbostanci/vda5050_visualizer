<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import { ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import configs from "@/utils/configs";
const props = defineProps({
  agv: { type: VDA5050Agv, required: true },
});
const orderShow = ref(false);
const orderGraphShow = ref(false);
const instantActionsShow = ref(false);
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
      <ui-chip
        icon="disabled_visible"
        @click="orderGraphShow = !orderGraphShow"
        v-if="orderGraphShow"
      >
        Hide
      </ui-chip>
      <ui-chip
        icon="remove_red_eye"
        @click="orderGraphShow = !orderGraphShow"
        v-else
      >
        Show
      </ui-chip>
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
    v-if="props.agv.orderInfo.value && orderGraphShow"
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
