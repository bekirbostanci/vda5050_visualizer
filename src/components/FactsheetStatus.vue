<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { useToast } from "@/components/ui/toast";
import type { useFactsheet } from "@/composables/useFactsheet";

const props = defineProps<{
  factsheet: ReturnType<typeof useFactsheet>;
}>();

const { toast } = useToast();

async function load() {
  try {
    const result = await props.factsheet.loadFactsheet();
    if (result === "timeout") {
      toast({
        title: "No factsheet received",
        description:
          "The AGV did not answer the factsheetRequest. Using the standard VDA5050 actions.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Factsheet loaded",
        description:
          result === "retained"
            ? "Received the retained factsheet."
            : "Received the factsheet after a factsheetRequest.",
      });
    }
  } catch (err: any) {
    toast({
      title: "Factsheet request failed",
      description: err.message,
      variant: "destructive",
    });
  }
}
</script>

<template>
  <div class="border rounded-lg p-2 space-y-1 text-xs">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1 min-w-0">
        <Icon
          :icon="
            factsheet.fromFactsheet.value
              ? 'material-symbols:fact-check-outline'
              : 'material-symbols:list-alt-outline'
          "
          class="w-4 h-4 shrink-0"
        />
        <span class="truncate">
          {{
            factsheet.fromFactsheet.value
              ? `Actions from factsheet (${factsheet.catalog.value.length})`
              : "Standard VDA5050 actions (no factsheet)"
          }}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        class="h-6 text-xs shrink-0"
        :disabled="factsheet.loading.value"
        @click="load"
      >
        <Icon
          :icon="
            factsheet.loading.value
              ? 'material-symbols:progress-activity'
              : 'material-symbols:refresh'
          "
          class="w-3 h-3 mr-1"
          :class="{ 'animate-spin': factsheet.loading.value }"
        />
        Load Factsheet
      </Button>
    </div>
    <div v-if="factsheet.wrapped.value" class="text-amber-600">
      The factsheet arrived wrapped as {"data": "..."} instead of the factsheet
      JSON object (VDA5050 6.15).
    </div>
  </div>
</template>
