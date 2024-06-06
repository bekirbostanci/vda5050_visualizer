<script setup lang="ts">
import { VDA5050Agv } from "@/controllers/vda5050-agv.controller";
import { ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

const props = defineProps({
  agv: { type: VDA5050Agv, required: true },
});
const stateShow = ref(false);
const errorsShow = ref(false);
const actionsStateShow = ref(false);
</script>

<template>
  <ui-divider class="mb-2 mt-2 card-divider"></ui-divider>
  <div class="card-header-div">
    <div style="display: flex">
      <div class="card-font-bold">AGV -> Master Controller</div>
      <div class="card-font" style="margin-left: 20px">
        Header : {{ props.agv.stateInfo.value?.headerId }}
      </div>
    </div>
    <ui-chips>
      <ui-chip icon="raw_on" @click="stateShow = !stateShow"> State </ui-chip>
      <ui-chip icon="av_timer">
        {{ props.agv.stateInfo.value?.timestamp }}
      </ui-chip>
    </ui-chips>
  </div>
  <div class="card-header-div">
    <div v-if="props.agv.stateInfo.value?.orderId" style="display: flex">
      <div class="card-font">
        Order : {{ props.agv.stateInfo.value?.orderId }}
      </div>
      <div class="card-font mal-1">
        Update : {{ props.agv.stateInfo.value?.orderUpdateId }}
      </div>
      <div class="card-font mal-1">
        Last Node Id : {{ props.agv.stateInfo.value?.lastNodeId }}
      </div>
      <div class="card-font mal-1">
        Last Node Sequence : {{ props.agv.stateInfo.value?.lastNodeSequenceId }}
      </div>
    </div>
    <div v-else></div>

    <ui-chips class="flex-right">
      <ui-chip icon="moving" v-if="props.agv.stateInfo.value?.driving">
        Driving
      </ui-chip>
      <ui-chip icon="stop_circle" v-else> Not Driving </ui-chip>
      <ui-chip
        icon="stop_circle"
        v-if="!props.agv.stateInfo.value?.agvPosition?.positionInitialized"
      >
        Not Driving
      </ui-chip>
      <ui-chip
        icon="location_on"
        v-if="props.agv.stateInfo.value?.agvPosition?.positionInitialized"
      >
        Localized
      </ui-chip>
      <ui-chip icon="location_off" v-else> Not Localized </ui-chip>
      <ui-chip icon="view_in_ar" v-if="props.agv.stateInfo.value?.loads">
        Loads : {{ props.agv.stateInfo.value?.loads?.length }}
      </ui-chip>
      <ui-chip
        icon="pending_actions"
        @click="actionsStateShow = !actionsStateShow"
      >
        Actions : {{ props.agv.stateInfo.value?.actionStates?.length }}
      </ui-chip>
      <ui-chip icon="errors" @click="errorsShow = !errorsShow">
        Errors : {{ props.agv.stateInfo.value?.errors?.length }}
      </ui-chip>
    </ui-chips>
  </div>
  <vue-json-pretty
    v-if="stateShow"
    :data="{ key: props.agv.stateInfo.value }"
  />
  <vue-json-pretty
    v-if="actionsStateShow"
    :data="{ key: props.agv.stateInfo.value?.actionStates }"
  />
  <vue-json-pretty
    v-if="errorsShow"
    :data="{ key: props.agv.stateInfo.value?.errors }"
  />
</template>

<style lang="scss" scoped></style>
