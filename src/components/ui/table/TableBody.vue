<script setup lang="ts">
import { cn } from "@/lib/utils";
import { computed, type HTMLAttributes } from "vue";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});
</script>

<template>
  <tbody
    :class="cn('[&_tr:last-child]:border-0', props.class)"
    v-bind="delegatedProps"
  >
    <slot />
  </tbody>
</template>



