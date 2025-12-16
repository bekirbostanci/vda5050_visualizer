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
  <td
    :class="
      cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', props.class)
    "
    v-bind="delegatedProps"
  >
    <slot />
  </td>
</template>



