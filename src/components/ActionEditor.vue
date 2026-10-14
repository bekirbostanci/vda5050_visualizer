<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/vue";
import type { Action, ActionParameter } from "vda-5050-lib";
import {
  actionsForScope,
  ALL_BLOCKING_TYPES,
  applyCatalogAction,
  convertParameterValue,
  findCatalogAction,
  formatParameterValue,
  type ActionScope,
  type CatalogAction,
  type CatalogParameter,
} from "@/utils/action-catalog";

const CUSTOM = "__custom__";

const props = defineProps<{
  scope: ActionScope;
  catalog: CatalogAction[];
}>();

// The edited action; changes are made in place on the parent's action object
const action = defineModel<Action>("action", { required: true });

const emit = defineEmits<{
  remove: [];
}>();

const scopeActions = computed(() =>
  actionsForScope(props.catalog, props.scope)
);

const catalogAction = computed(() =>
  findCatalogAction(scopeActions.value, action.value.actionType)
);

// True when the action type is typed by hand instead of picked from the catalog
const customMode = ref(!!action.value.actionType && !catalogAction.value);

const selectedType = computed({
  get: () =>
    catalogAction.value && !customMode.value
      ? catalogAction.value.actionType
      : customMode.value
      ? CUSTOM
      : "",
  set: (value: string) => {
    if (value === CUSTOM) {
      // Keep a typed custom action type, start empty otherwise
      if (catalogAction.value) action.value.actionType = "";
      customMode.value = true;
      return;
    }
    customMode.value = false;
    action.value.actionType = value;
    const selected = findCatalogAction(scopeActions.value, value);
    if (selected) applyCatalogAction(action.value, selected);
  },
});

const blockingTypes = computed(() =>
  catalogAction.value && catalogAction.value.blockingTypes.length > 0
    ? catalogAction.value.blockingTypes
    : ALL_BLOCKING_TYPES
);

const parameters = computed<ActionParameter[]>(
  () => action.value.actionParameters ?? []
);

function catalogParameter(key: string): CatalogParameter | undefined {
  return catalogAction.value?.parameters.find((param) => param.key === key);
}

const missingParameters = computed(() =>
  (catalogAction.value?.parameters ?? []).filter(
    (param) => !parameters.value.some((existing) => existing.key === param.key)
  )
);

// Raw input text per parameter, so partial input like "1." is not reformatted
const texts = reactive(new Map<ActionParameter, string>());

function parameterText(param: ActionParameter): string {
  return texts.get(param) ?? formatParameterValue(param.value);
}

function parameterError(param: ActionParameter): string | undefined {
  const type = catalogParameter(param.key)?.valueDataType;
  if (!type) return undefined;
  const text = parameterText(param);
  if (text.trim() === "") {
    return catalogParameter(param.key)?.isOptional ? undefined : "Required";
  }
  return convertParameterValue(text, type).error;
}

function setParameterText(param: ActionParameter, text: string) {
  texts.set(param, text);
  const type = catalogParameter(param.key)?.valueDataType;
  param.value = convertParameterValue(text, type)
    .value as ActionParameter["value"];
}

function setParameterKey(param: ActionParameter, key: string) {
  param.key = key;
  // Re-convert the value for the type of the new key
  setParameterText(param, parameterText(param));
}

function addParameter(key = "") {
  if (!action.value.actionParameters) action.value.actionParameters = [];
  action.value.actionParameters.push({ key, value: "" });
}

function removeParameter(index: number) {
  action.value.actionParameters?.splice(index, 1);
}
</script>

<template>
  <div class="space-y-2">
    <div class="grid grid-cols-2 gap-2">
      <div>
        <Label class="text-xs">Action ID</Label>
        <Input
          v-model="action.actionId"
          placeholder="Action ID"
          class="h-7 text-xs"
        />
      </div>
      <div>
        <Label class="text-xs">Action Type</Label>
        <select
          v-model="selectedType"
          class="h-7 text-xs w-full rounded border px-2 bg-background"
        >
          <option value="">Select action type...</option>
          <option
            v-for="option in scopeActions"
            :key="option.actionType"
            :value="option.actionType"
          >
            {{ option.actionType }}
          </option>
          <option :value="CUSTOM">Custom...</option>
        </select>
      </div>
    </div>
    <div v-if="selectedType === CUSTOM" class="space-y-1">
      <Label class="text-xs">Custom Action Type</Label>
      <Input
        v-model="action.actionType"
        placeholder="Enter custom action type"
        class="h-7 text-xs"
      />
    </div>
    <div
      v-if="catalogAction?.description"
      class="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded"
    >
      {{ catalogAction.description }}
    </div>
    <div>
      <Label class="text-xs">Blocking Type</Label>
      <select
        v-model="action.blockingType"
        class="h-7 text-xs w-full rounded border px-2 bg-background"
      >
        <option v-for="type in blockingTypes" :key="type" :value="type">
          {{ type }}
        </option>
      </select>
    </div>
    <div class="space-y-1">
      <Label class="text-xs">Action Description (Optional)</Label>
      <Textarea
        v-model="action.actionDescription"
        class="h-12 text-xs"
        placeholder="Additional information on the action"
      />
    </div>
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label class="text-xs">Parameters ({{ parameters.length }})</Label>
        <Button
          size="sm"
          variant="ghost"
          class="h-6 text-xs"
          @click="addParameter()"
        >
          <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
          Add Parameter
        </Button>
      </div>
      <div
        v-for="(param, paramIndex) in parameters"
        :key="paramIndex"
        class="pl-2 border-l-2 space-y-1"
      >
        <div class="grid grid-cols-2 gap-2">
          <Input
            :model-value="param.key"
            placeholder="Key"
            class="h-6 text-xs"
            @update:model-value="(val) => setParameterKey(param, String(val))"
          />
          <Input
            :model-value="parameterText(param)"
            :placeholder="
              catalogParameter(param.key)?.valueDataType ??
              'Value (JSON for arrays/objects)'
            "
            class="h-6 text-xs"
            :class="{ 'border-red-500': parameterError(param) }"
            @update:model-value="(val) => setParameterText(param, String(val))"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <div class="text-[10px] text-muted-foreground truncate">
            <template v-if="catalogParameter(param.key)">
              {{ catalogParameter(param.key)?.valueDataType }}
              {{
                catalogParameter(param.key)?.isOptional
                  ? "· optional"
                  : "· required"
              }}
              <template v-if="catalogParameter(param.key)?.description">
                · {{ catalogParameter(param.key)?.description }}
              </template>
            </template>
            <span v-if="parameterError(param)" class="text-red-500">
              {{ parameterError(param) }}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            class="h-5 text-xs shrink-0"
            @click="removeParameter(paramIndex)"
          >
            Remove
          </Button>
        </div>
      </div>
      <div v-if="missingParameters.length > 0" class="flex flex-wrap gap-1">
        <Button
          v-for="param in missingParameters"
          :key="param.key"
          size="sm"
          variant="outline"
          class="h-5 px-2 text-[10px]"
          :class="{ 'border-red-500': !param.isOptional }"
          :title="param.description"
          @click="addParameter(param.key)"
        >
          + {{ param.key }}{{ param.isOptional ? "" : " *" }}
        </Button>
      </div>
    </div>
    <Button
      size="sm"
      variant="ghost"
      class="h-5 text-xs"
      @click="emit('remove')"
    >
      Remove Action
    </Button>
  </div>
</template>
