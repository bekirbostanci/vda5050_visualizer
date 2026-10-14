<script setup lang="ts">
import { ref, unref } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/vue";
import { useToast } from "@/components/ui/toast";
import type { InstantActions, Action } from "vda-5050-lib";
import { BlockingType as BlockingTypeEnum } from "@/types/vda5050.types";
import ActionEditor from "@/components/ActionEditor.vue";
import FactsheetStatus from "@/components/FactsheetStatus.vue";
import { useFactsheet } from "@/composables/useFactsheet";
import { instantActionsOf } from "@/utils/instant-actions";

const props = defineProps<{
  agvId: { manufacturer: string; serialNumber: string };
  existingInstantActions?: InstantActions | null;
}>();

const emit = defineEmits<{
  close: [];
  published: [];
}>();

const { agvControllers, interfaceName } = useVDA5050();
const { toast } = useToast();
const factsheet = useFactsheet(props.agvId);

const error = ref("");
const expandedSections = ref<Set<string>>(new Set(["instantAction-basic"]));

// InstantActions form state
const instantActionsForm = ref<{
  headerId: number;
  manufacturer: string;
  serialNumber: string;
  timestamp: string;
  version: string;
  instantActions: Action[];
}>({
  headerId: 1,
  manufacturer: props.agvId.manufacturer,
  serialNumber: props.agvId.serialNumber,
  timestamp: new Date().toISOString(),
  version: "2.0.0",
  instantActions: [],
});

// Initialize form with existing instant actions if provided
if (props.existingInstantActions) {
  const existingActions = instantActionsOf(props.existingInstantActions) || [];
  instantActionsForm.value = {
    headerId: (props.existingInstantActions.headerId || 0) + 1,
    manufacturer:
      props.existingInstantActions.manufacturer || props.agvId.manufacturer,
    serialNumber:
      props.existingInstantActions.serialNumber || props.agvId.serialNumber,
    timestamp: new Date().toISOString(),
    version: props.existingInstantActions.version,
    instantActions: existingActions,
  };
}

// Build InstantActions from form data
const buildInstantActionsFromForm = (): InstantActions => {
  return {
    headerId: instantActionsForm.value.headerId,
    manufacturer: instantActionsForm.value.manufacturer,
    serialNumber: instantActionsForm.value.serialNumber,
    timestamp: instantActionsForm.value.timestamp || new Date().toISOString(),
    version: instantActionsForm.value.version,
    instantActions: instantActionsForm.value.instantActions,
  };
};

// Publish InstantActions
const publishInstantActions = () => {
  try {
    // Validate required fields
    if (
      !instantActionsForm.value.headerId ||
      !instantActionsForm.value.manufacturer ||
      !instantActionsForm.value.serialNumber ||
      !instantActionsForm.value.version
    ) {
      error.value =
        "Missing required fields: headerId, manufacturer, serialNumber, version";
      return;
    }

    const instantActions = buildInstantActionsFromForm();
    const key = `${props.agvId.manufacturer}/${props.agvId.serialNumber}`;
    const controller = agvControllers.value.get(key);

    if (!controller) {
      error.value = "AGV controller not found";
      return;
    }

    controller.publishInstantActions(instantActions, unref(interfaceName));
    error.value = "";
    toast({
      title: "InstantActions published",
      description: "InstantActions published successfully!",
    });
    emit("published");
  } catch (err: any) {
    error.value = `Failed to publish: ${err.message}`;
  }
};

const addInstantAction = () => {
  instantActionsForm.value.instantActions.push({
    actionId: `action_${instantActionsForm.value.instantActions.length + 1}`,
    actionType: "",
    blockingType: BlockingTypeEnum.None,
  });
};

const removeInstantAction = (index: number) => {
  instantActionsForm.value.instantActions.splice(index, 1);
};

const toggleSection = (section: string) => {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section);
  } else {
    expandedSections.value.add(section);
  }
};
</script>

<template>
  <div class="space-y-4">
    <div
      class="flex items-center justify-between top-0 bg-background z-10 pb-2 border-b"
    >
      <div class="text-sm font-semibold flex items-center gap-2">
        <Icon icon="material-symbols:flash-on" class="w-4 h-4" />
        Create Instant Action
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="h-6 w-6 p-0"
        @click="emit('close')"
      >
        <Icon icon="material-symbols:close" class="w-4 h-4" />
      </Button>
    </div>

    <div
      v-if="error"
      class="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded"
    >
      {{ error }}
    </div>

    <div class="space-y-4">
      <FactsheetStatus :factsheet="factsheet" />

      <!-- Basic Information -->
      <div class="border rounded-lg p-4 space-y-3">
        <div
          class="flex items-center justify-between cursor-pointer"
          @click="toggleSection('instantAction-basic')"
        >
          <h3 class="font-semibold text-sm">Basic Information</h3>
          <Icon
            :icon="
              expandedSections.has('instantAction-basic')
                ? 'material-symbols:expand-less'
                : 'material-symbols:expand-more'
            "
            class="w-4 h-4"
          />
        </div>
        <div
          v-if="expandedSections.has('instantAction-basic')"
          class="space-y-3 pt-2"
        >
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label class="text-xs">Header ID</Label>
              <Input
                v-model.number="instantActionsForm.headerId"
                type="number"
                class="h-8 text-xs"
              />
            </div>
            <div>
              <Label class="text-xs">Version</Label>
              <Input v-model="instantActionsForm.version" class="h-8 text-xs" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <Label class="text-xs">Manufacturer</Label>
              <Input
                v-model="instantActionsForm.manufacturer"
                class="h-8 text-xs"
              />
            </div>
            <div>
              <Label class="text-xs">Serial Number</Label>
              <Input
                v-model="instantActionsForm.serialNumber"
                class="h-8 text-xs"
              />
            </div>
          </div>
          <div>
            <Label class="text-xs">Timestamp</Label>
            <div class="flex gap-2">
              <Input
                :model-value="
                  instantActionsForm.timestamp
                    ? new Date(instantActionsForm.timestamp)
                        .toISOString()
                        .slice(0, 16)
                    : ''
                "
                @update:model-value="
                  (val) =>
                    (instantActionsForm.timestamp = val
                      ? new Date(val).toISOString()
                      : new Date().toISOString())
                "
                type="datetime-local"
                class="h-8 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                class="h-8 text-xs"
                @click="instantActionsForm.timestamp = new Date().toISOString()"
              >
                Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Instant Actions -->
      <div class="border rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div
            class="flex items-center justify-between cursor-pointer flex-1"
            @click="toggleSection('instantAction-actions')"
          >
            <h3 class="font-semibold text-sm">
              Actions ({{ instantActionsForm.instantActions.length }})
            </h3>
            <Icon
              :icon="
                expandedSections.has('instantAction-actions')
                  ? 'material-symbols:expand-less'
                  : 'material-symbols:expand-more'
              "
              class="w-4 h-4"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            class="h-7 text-xs ml-2"
            @click="addInstantAction"
          >
            <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
            Add Action
          </Button>
        </div>
        <div
          v-if="expandedSections.has('instantAction-actions')"
          class="space-y-3 pt-2"
        >
          <div
            v-for="(action, actionIndex) in instantActionsForm.instantActions"
            :key="actionIndex"
            class="border rounded p-3 space-y-2 bg-muted/30"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium"
                >Action {{ actionIndex + 1 }}</span
              >
              <Button
                size="sm"
                variant="ghost"
                class="h-6 w-6 p-0"
                @click="removeInstantAction(actionIndex)"
              >
                <Icon icon="material-symbols:delete" class="w-3 h-3" />
              </Button>
            </div>
            <ActionEditor
              v-model:action="instantActionsForm.instantActions[actionIndex]"
              scope="INSTANT"
              :catalog="factsheet.catalog.value"
              @remove="removeInstantAction(actionIndex)"
            />
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-2 border-t">
        <Button @click="publishInstantActions" class="flex-1">
          <Icon icon="material-symbols:send" class="w-4 h-4 mr-2" />
          Publish Instant Actions
        </Button>
        <Button variant="outline" @click="emit('close')"> Cancel </Button>
      </div>
    </div>
  </div>
</template>
