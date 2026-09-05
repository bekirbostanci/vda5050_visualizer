<script setup lang="ts">
import { ref, unref } from "vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@iconify/vue";
import { useToast } from "@/components/ui/toast";
import {
  formatInstantActionsJson,
  instantActionsToFormState,
  parseInstantActionsJson,
  splitInstantActionJsonDocuments,
} from "@/utils/instant-action-json";
import type { InstantActions, Action } from "vda-5050-lib";
import { BlockingType as BlockingTypeEnum } from "@/types/vda5050.types";

// Predefined VDA5050 action types
const predefinedActions = [
  {
    value: "startPause",
    label: "startPause",
    description:
      "Activates pause mode. No driving movements, actions can continue. Order is resumable.",
  },
  {
    value: "stopPause",
    label: "stopPause",
    description:
      "Deactivates pause mode. Movement and actions will be resumed.",
  },
  {
    value: "startCharging",
    label: "startCharging",
    description:
      "Activates charging process. Can be done on charging spot or lane.",
  },
  {
    value: "stopCharging",
    label: "stopCharging",
    description: "Deactivates charging process to send a new order.",
  },
  {
    value: "initPosition",
    label: "initPosition",
    description:
      "Resets (overrides) the pose of the AGV with given parameters.",
  },
  {
    value: "enableMap",
    label: "enableMap",
    description: "Enable a previously downloaded map to be used in orders.",
  },
  {
    value: "downloadMap",
    label: "downloadMap",
    description: "Trigger the download of a new map.",
  },
  {
    value: "deleteMap",
    label: "deleteMap",
    description: "Trigger the removal of a map from vehicle memory.",
  },
  {
    value: "stateRequest",
    label: "stateRequest",
    description: "Requests the AGV to send a new state report.",
  },
  {
    value: "logReport",
    label: "logReport",
    description: "Requests the AGV to generate and store a log report.",
  },
  {
    value: "pick",
    label: "pick",
    description:
      "Request the AGV to pick a load. Supports multiple load handling devices.",
  },
  {
    value: "drop",
    label: "drop",
    description: "Request the AGV to drop a load.",
  },
  {
    value: "detectObject",
    label: "detectObject",
    description:
      "AGV detects object (e.g., load, charging spot, free parking position).",
  },
  {
    value: "finePositioning",
    label: "finePositioning",
    description:
      "AGV positions exactly on a target. Can be used on node or edge.",
  },
  {
    value: "waitForTrigger",
    label: "waitForTrigger",
    description:
      "AGV waits for a trigger (e.g., button press, manual loading).",
  },
  {
    value: "cancelOrder",
    label: "cancelOrder",
    description:
      "AGV stops as soon as possible. Order is deleted, all actions canceled.",
  },
  {
    value: "factsheetRequest",
    label: "factsheetRequest",
    description: "Requests the AGV to send a factsheet.",
  },
  {
    value: "custom",
    label: "Custom...",
    description: "Enter a custom action type",
  },
];

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

const error = ref("");
const jsonHint = ref("");
const showJsonImport = ref(false);
const instantActionsJsonText = ref("");
const jsonDocumentCount = ref(1);
const jsonDocuments = ref<string[]>([]);
const selectedJsonDocumentIndex = ref(0);
const jsonFileInputRef = ref<HTMLInputElement | null>(null);
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
  const existingActions =
    props.existingInstantActions.instantActions ||
    props.existingInstantActions.actions ||
    [];
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

const applyJsonToForm = () => {
  try {
    const docs =
      jsonDocuments.value.length > 0
        ? jsonDocuments.value
        : splitInstantActionJsonDocuments(instantActionsJsonText.value);
    if (docs.length === 0) {
      error.value = "JSON is empty.";
      return;
    }

    const index = Math.min(selectedJsonDocumentIndex.value, docs.length - 1);
    const { instantActions, warnings } = parseInstantActionsJson(
      docs[index],
      props.agvId
    );
    instantActionsForm.value = instantActionsToFormState(
      instantActions,
      props.agvId
    );
    instantActionsJsonText.value = formatInstantActionsJson(instantActions);
    jsonDocuments.value = docs;
    jsonDocumentCount.value = docs.length;
    selectedJsonDocumentIndex.value = index;
    error.value = "";
    jsonHint.value = warnings.join(" ");

    expandedSections.value = new Set([
      "instantAction-basic",
      "instantAction-actions",
    ]);

    const actionCount = instantActions.instantActions?.length ?? 0;
    toast({
      title: "JSON applied",
      description:
        warnings.length > 0
          ? `Loaded ${actionCount} action(s) (${warnings.length} warning(s)). Review and edit below.`
          : `Loaded ${actionCount} action(s) into the form. You can review and edit below.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    error.value = message;
    jsonHint.value = "";
  }
};

const validateInstantActionsJson = () => {
  try {
    const docs = splitInstantActionJsonDocuments(instantActionsJsonText.value);
    if (docs.length === 0) {
      error.value = "JSON is empty.";
      jsonHint.value = "";
      return;
    }

    jsonDocuments.value = docs;
    const parsed = docs.map((doc) => parseInstantActionsJson(doc, props.agvId));
    jsonDocumentCount.value = docs.length;
    selectedJsonDocumentIndex.value = Math.min(
      selectedJsonDocumentIndex.value,
      docs.length - 1
    );

    const { instantActions, warnings } =
      parsed[selectedJsonDocumentIndex.value];
    const actionCount = instantActions.instantActions?.length ?? 0;
    error.value = "";
    jsonHint.value = [
      `Valid VDA5050 instantActions (${actionCount} action${actionCount === 1 ? "" : "s"}).`,
      docs.length > 1 ? `${docs.length} documents found in editor.` : "",
      ...warnings,
    ]
      .filter(Boolean)
      .join(" ");

    toast({
      title: "JSON valid",
      description: `InstantActions message is valid. Click "Apply to form" to load it.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    error.value = message;
    jsonHint.value = "";
  }
};

const formatInstantActionsJsonEditor = () => {
  try {
    const docs = splitInstantActionJsonDocuments(instantActionsJsonText.value);
    if (docs.length === 0) {
      error.value = "JSON is empty.";
      return;
    }

    const index = Math.min(selectedJsonDocumentIndex.value, docs.length - 1);
    const { instantActions } = parseInstantActionsJson(docs[index], props.agvId);
    instantActionsJsonText.value = formatInstantActionsJson(instantActions);
    error.value = "";
    jsonHint.value = "JSON formatted.";
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    error.value = message;
  }
};

const loadJsonFromFile = () => {
  jsonFileInputRef.value?.click();
};

const onJsonFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";

  if (!file) return;

  try {
    const text = await file.text();
    const docs = splitInstantActionJsonDocuments(text);
    jsonDocuments.value = docs;
    jsonDocumentCount.value = docs.length;
    selectedJsonDocumentIndex.value = 0;
    instantActionsJsonText.value = text;

    if (docs.length === 1) {
      const { instantActions, warnings } = parseInstantActionsJson(
        docs[0],
        props.agvId
      );
      instantActionsJsonText.value = formatInstantActionsJson(instantActions);
      jsonHint.value = warnings.join(" ");
    } else {
      jsonHint.value = `Loaded ${docs.length} documents from ${file.name}. Select one and click "Apply to form".`;
    }

    showJsonImport.value = true;
    error.value = "";

    toast({
      title: "File loaded",
      description: `${file.name} (${docs.length} document${docs.length > 1 ? "s" : ""})`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    error.value = `Failed to read file: ${message}`;
  }
};

const selectJsonDocumentByIndex = (index: number) => {
  selectedJsonDocumentIndex.value = index;
  const docs =
    jsonDocuments.value.length > 0
      ? jsonDocuments.value
      : splitInstantActionJsonDocuments(instantActionsJsonText.value);

  if (!docs[index]) return;

  try {
    const { instantActions } = parseInstantActionsJson(docs[index], props.agvId);
    instantActionsJsonText.value = formatInstantActionsJson(instantActions);
    const actionCount = instantActions.instantActions?.length ?? 0;
    jsonHint.value = `Showing document ${index + 1} of ${docs.length} (${actionCount} action${actionCount === 1 ? "" : "s"}).`;
  } catch {
    instantActionsJsonText.value = docs[index];
    jsonHint.value = `Showing raw document ${index + 1} of ${docs.length}.`;
  }
};

const toggleJsonImport = () => {
  showJsonImport.value = !showJsonImport.value;
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

const addActionParameter = (action: Action) => {
  if (!action.actionParameters) {
    action.actionParameters = [];
  }
  action.actionParameters.push({
    key: "",
    value: "",
  });
};

const removeActionParameter = (action: Action, index: number) => {
  if (action.actionParameters) {
    action.actionParameters.splice(index, 1);
  }
};

const toggleSection = (section: string) => {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section);
  } else {
    expandedSections.value.add(section);
  }
};

const handleActionTypeChange = (action: Action) => {
  if (action.actionType === "custom") {
    action.actionType = "";
  }
};

const isCustomActionType = (actionType: string | undefined): boolean => {
  if (!actionType || actionType === "") return true;
  return !predefinedActions.find((a) => a.value === actionType);
};

const getActionDescription = (
  actionType: string | undefined
): string | undefined => {
  if (!actionType) return undefined;
  const action = predefinedActions.find((a) => a.value === actionType);
  return action && action.value !== "custom" ? action.description : undefined;
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
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs"
          @click="toggleJsonImport"
        >
          <Icon icon="material-symbols:data-object" class="w-3.5 h-3.5 mr-1" />
          {{ showJsonImport ? "Hide JSON" : "Import JSON" }}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          class="h-6 w-6 p-0"
          @click="emit('close')"
        >
          <Icon icon="material-symbols:close" class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <div
      v-if="error"
      class="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded"
    >
      {{ error }}
    </div>

    <div
      v-if="jsonHint && !error"
      class="text-sm text-muted-foreground bg-muted/50 p-2 rounded"
    >
      {{ jsonHint }}
    </div>

    <input
      ref="jsonFileInputRef"
      type="file"
      accept=".json,.txt,application/json,text/plain"
      class="hidden"
      @change="onJsonFileSelected"
    />

    <div
      v-if="showJsonImport"
      class="border rounded-lg p-4 space-y-3 bg-muted/20"
    >
      <div class="flex items-center justify-between mb-1">
        <h3 class="font-semibold text-sm">Import from JSON</h3>
        <span class="text-xs text-muted-foreground">
          Apply loads data into the form below
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs"
          @click="loadJsonFromFile"
        >
          <Icon icon="material-symbols:upload-file" class="w-3.5 h-3.5 mr-1" />
          Load file
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs"
          @click="validateInstantActionsJson"
        >
          <Icon
            icon="material-symbols:check-circle-outline"
            class="w-3.5 h-3.5 mr-1"
          />
          Validate
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-xs"
          @click="formatInstantActionsJsonEditor"
        >
          <Icon icon="material-symbols:data-object" class="w-3.5 h-3.5 mr-1" />
          Format
        </Button>
        <Button size="sm" class="h-7 text-xs" @click="applyJsonToForm">
          <Icon icon="material-symbols:input" class="w-3.5 h-3.5 mr-1" />
          Apply to form
        </Button>
      </div>

      <div v-if="jsonDocumentCount > 1" class="flex items-center gap-2">
        <Label class="text-xs shrink-0">Document in file</Label>
        <Select
          :model-value="String(selectedJsonDocumentIndex)"
          @update:model-value="(v) => selectJsonDocumentByIndex(Number(v))"
        >
          <SelectTrigger class="h-8 text-xs flex-1">
            <SelectValue placeholder="Select document" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="i in jsonDocumentCount"
              :key="i - 1"
              :value="String(i - 1)"
            >
              Document {{ i }} / {{ jsonDocumentCount }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label class="text-xs text-muted-foreground">
          Paste VDA5050 instantActions JSON. Multiple documents separated by
          lines of = are supported.
        </Label>
        <Textarea
          v-model="instantActionsJsonText"
          class="mt-2 font-mono text-xs min-h-[160px]"
          spellcheck="false"
          placeholder='{ "headerId": 1, "version": "2.0.0", "instantActions": [{ "actionId": "a1", "actionType": "stateRequest", "blockingType": "NONE" }] }'
        />
      </div>
    </div>

    <div class="space-y-4">
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
            <div class="grid grid-cols-2 gap-2">
              <div>
                <Label class="text-xs">Action ID</Label>
                <Input v-model="action.actionId" class="h-7 text-xs" />
              </div>
              <div>
                <Label class="text-xs">Action Type</Label>
                <select
                  v-model="action.actionType"
                  class="h-7 text-xs w-full rounded border px-2 bg-background"
                  @change="handleActionTypeChange(action)"
                >
                  <option value="">Select action type...</option>
                  <option
                    v-for="predefAction in predefinedActions"
                    :key="predefAction.value"
                    :value="predefAction.value"
                  >
                    {{ predefAction.label }}
                  </option>
                </select>
              </div>
            </div>
            <div v-if="isCustomActionType(action.actionType)" class="space-y-1">
              <Label class="text-xs">Custom Action Type</Label>
              <Input
                v-model="action.actionType"
                placeholder="Enter custom action type"
                class="h-7 text-xs"
              />
            </div>
            <div
              v-if="getActionDescription(action.actionType)"
              class="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded"
            >
              {{ getActionDescription(action.actionType) }}
            </div>
            <div>
              <Label class="text-xs">Blocking Type</Label>
              <select
                v-model="action.blockingType"
                class="h-7 text-xs w-full rounded border px-2 bg-background"
              >
                <option value="NONE">NONE</option>
                <option value="SOFT">SOFT</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
            <div class="space-y-1">
              <Label class="text-xs">Action Description (Optional)</Label>
              <Textarea
                v-model="action.actionDescription"
                class="h-16 text-xs"
                placeholder="Additional information on the action"
              />
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label class="text-xs"
                  >Parameters ({{
                    action.actionParameters?.length || 0
                  }})</Label
                >
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-6 text-xs"
                  @click="addActionParameter(action)"
                >
                  <Icon icon="material-symbols:add" class="w-3 h-3 mr-1" />
                  Add Parameter
                </Button>
              </div>
              <div
                v-for="(param, paramIndex) in action.actionParameters"
                :key="paramIndex"
                class="pl-2 border-l-2 space-y-1"
              >
                <div class="grid grid-cols-2 gap-2">
                  <Input
                    v-model="param.key"
                    placeholder="Key"
                    class="h-6 text-xs"
                  />
                  <Input
                    :model-value="
                      typeof param.value === 'object'
                        ? JSON.stringify(param.value)
                        : String(param.value)
                    "
                    @update:model-value="(val) => {
                      try {
                        param.value = JSON.parse(val as string);
                      } catch {
                        param.value = val;
                      }
                    }"
                    placeholder="Value (JSON for arrays/objects)"
                    class="h-6 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  class="h-5 text-xs"
                  @click="removeActionParameter(action, paramIndex)"
                >
                  Remove
                </Button>
              </div>
            </div>
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