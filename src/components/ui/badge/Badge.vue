<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { type PrimitiveProps, Primitive } from 'radix-vue'
import { type BadgeVariants, badgeVariants } from '.'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  variant?: BadgeVariants['variant']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})

const computedClass = computed(() => {
  return cn(badgeVariants({ variant: props.variant }), props.class)
})
</script>

<template>
  <Primitive :as="as" :as-child="asChild" :class="computedClass">
    <slot />
  </Primitive>
</template>
