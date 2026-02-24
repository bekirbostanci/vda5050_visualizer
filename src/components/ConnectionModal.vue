<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@iconify/vue";
import { useVDA5050 } from "@/composables/useVDA5050";
import {
  getSavedConnections,
  addOrUpdateConnection,
  removeConnection,
  setActiveConnectionId,
  getActiveConnectionId,
  loadSavedConfig,
  type SavedConnection,
} from "@/types/mqtt-config";
import { useMqttStore } from "@/stores/mqtt";
import { MqttClientState } from "@/types/mqtt.types";
import { sharedMqttClient } from "@/utils/shared-mqtt-client";

const props = defineProps<{
  open: boolean;
}>();

const emits = defineEmits<{
  "update:open": [value: boolean];
}>();

const {
  brokerIp,
  brokerPort,
  basepath,
  interfaceName,
  username,
  password,
  connectionType,
  updateBroker,
  mqttStatus,
  vda5050Visualizer,
} = useVDA5050();

const mqttStore = useMqttStore();

// Saved connections list (refresh when modal opens)
const savedConnections = ref<SavedConnection[]>([]);
/** SENTINEL_NEW = "New connection", "" = none/placeholder, otherwise saved connection id */
const SENTINEL_NEW = "__new__";
const selectedConnectionId = ref<string>("");

// Local form state
const formData = ref({
  connectionName: "",
  brokerIp: "",
  brokerPort: "",
  basepath: "",
  interfaceName: "",
  username: "",
  password: "",
  connectionType: "websocket" as "mqtt" | "websocket",
  clientId: "",
});

const showPassword = ref(false);
const isConnecting = ref(false);
const errorMessage = ref("");

function loadConnectionIntoForm(conn: SavedConnection | null) {
  if (!conn) {
    formData.value = {
      connectionName: "",
      brokerIp: "",
      brokerPort: "",
      basepath: "",
      interfaceName: "",
      username: "",
      password: "",
      connectionType: "websocket",
      clientId: `mqtt_client_${Math.random().toString(16).slice(2, 8)}`,
    };
    return;
  }
  formData.value = {
    connectionName: conn.name,
    brokerIp: conn.brokerIp || "",
    brokerPort: conn.brokerPort || "",
    basepath: conn.basepath || "",
    interfaceName: conn.interfaceName || "",
    username: conn.username || "",
    password: conn.password || "",
    connectionType:
      (conn.connectionType as "mqtt" | "websocket") || "websocket",
    clientId: `mqtt_client_${Math.random().toString(16).slice(2, 8)}`,
  };
}

// Load saved connections and form when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      savedConnections.value = getSavedConnections();
      const activeId = getActiveConnectionId();
      const active =
        activeId && savedConnections.value.find((c) => c.id === activeId);
      selectedConnectionId.value = active?.id ?? SENTINEL_NEW;
      if (active) {
        loadConnectionIntoForm(active);
      } else {
        const savedConfig = loadSavedConfig();
        loadConnectionIntoForm({
          id: "",
          name: "",
          ...savedConfig,
        });
      }
      errorMessage.value = "";
      saveSuccessMessage.value = "";
    }
  }
);

// When user selects a different saved connection from dropdown, load it
watch(selectedConnectionId, (id) => {
  if (!props.open) return;
  if (!id || id === SENTINEL_NEW) {
    loadConnectionIntoForm(null);
    formData.value.connectionName = "";
    return;
  }
  const conn = savedConnections.value.find((c) => c.id === id);
  if (conn) loadConnectionIntoForm(conn);
});

// Sync with composable values on mount
onMounted(() => {
  formData.value.brokerIp = brokerIp.value;
  formData.value.brokerPort = brokerPort.value;
  formData.value.basepath = basepath.value;
  formData.value.interfaceName = interfaceName.value;
  formData.value.username = username.value;
  formData.value.password = password.value;
  formData.value.connectionType = connectionType.value as "mqtt" | "websocket";
});

const handleConnect = async () => {
  // Validation
  if (!formData.value.brokerIp.trim()) {
    errorMessage.value = "Broker IP/Host is required";
    return;
  }
  if (!String(formData.value.brokerPort).trim()) {
    errorMessage.value = "Port is required";
    return;
  }

  errorMessage.value = "";
  isConnecting.value = true;

  try {
    // Save current form as a connection (new or update) and set as active
    const name =
      formData.value.connectionName?.trim() ||
      formData.value.brokerIp ||
      "Unnamed connection";
    const saved = addOrUpdateConnection({
      id:
        selectedConnectionId.value &&
        selectedConnectionId.value !== "" &&
        selectedConnectionId.value !== SENTINEL_NEW
          ? selectedConnectionId.value
          : undefined,
      name,
      brokerIp: formData.value.brokerIp.trim(),
      brokerPort: String(formData.value.brokerPort).trim(),
      basepath: formData.value.basepath.trim(),
      interfaceName: formData.value.interfaceName.trim(),
      username: formData.value.username.trim(),
      password: formData.value.password.trim(),
      connectionType: formData.value.connectionType,
    });
    setActiveConnectionId(saved.id);
    selectedConnectionId.value = saved.id;
    savedConnections.value = getSavedConnections();

    // Update composable values
    brokerIp.value = formData.value.brokerIp.trim();
    brokerPort.value = String(formData.value.brokerPort).trim();
    basepath.value = formData.value.basepath.trim();
    interfaceName.value = formData.value.interfaceName.trim();
    username.value = formData.value.username.trim();
    password.value = formData.value.password.trim();
    connectionType.value = formData.value.connectionType;

    // Update broker and connect
    updateBroker();

    // Close modal after a short delay to show connection status
    setTimeout(() => {
      isConnecting.value = false;
      emits("update:open", false);
    }, 500);
  } catch (error) {
    console.error("Connection error:", error);
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to connect";
    isConnecting.value = false;
  }
};

const handleDeleteConnection = () => {
  if (!selectedConnectionId.value) return;
  removeConnection(selectedConnectionId.value);
  savedConnections.value = getSavedConnections();
  selectedConnectionId.value = SENTINEL_NEW;
  loadConnectionIntoForm(null);
};

const canDeleteConnection = computed(
  () =>
    selectedConnectionId.value !== "" &&
    selectedConnectionId.value !== SENTINEL_NEW &&
    savedConnections.value.length > 0
);

const saveSuccessMessage = ref("");

function handleSave() {
  const name =
    formData.value.connectionName?.trim() ||
    formData.value.brokerIp ||
    "Unnamed connection";
  const saved = addOrUpdateConnection({
    id:
      selectedConnectionId.value && selectedConnectionId.value !== SENTINEL_NEW
        ? selectedConnectionId.value
        : undefined,
    name,
    brokerIp: formData.value.brokerIp.trim(),
    brokerPort: String(formData.value.brokerPort).trim(),
    basepath: formData.value.basepath.trim(),
    interfaceName: formData.value.interfaceName.trim(),
    username: formData.value.username.trim(),
    password: formData.value.password.trim(),
    connectionType: formData.value.connectionType,
  });
  setActiveConnectionId(saved.id);
  selectedConnectionId.value = saved.id;
  savedConnections.value = getSavedConnections();
  saveSuccessMessage.value = "Saved";
  setTimeout(() => {
    saveSuccessMessage.value = "";
  }, 2000);
}

const handleDisconnect = () => {
  try {
    // Disconnect based on connection type
    if (connectionType.value === "websocket") {
      // Disconnect shared MQTT client for WebSocket
      sharedMqttClient.disconnect();
    } else if (
      connectionType.value === "mqtt" &&
      typeof window.electron !== "undefined"
    ) {
      // For Electron MQTT, send disconnect message (if handler exists)
      // Note: This requires a disconnect-mqtt IPC handler in main.js
      window.electron.ipcRenderer.send("disconnect-mqtt");
    }

    // Disconnect visualizer if it exists
    if (vda5050Visualizer) {
      vda5050Visualizer.disconnect();
    }

    // Update store state
    mqttStore.setConnectionState(MqttClientState.OFFLINE);

    emits("update:open", false);
  } catch (error) {
    console.error("Error disconnecting:", error);
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to disconnect";
  }
};

const isConnected = computed(() => {
  return mqttStatus.value === MqttClientState.CONNECTED;
});
</script>

<template>
  <Dialog :open="open" @update:open="emits('update:open', $event)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>MQTT Connection Settings</DialogTitle>
        <DialogDescription>
          Configure your MQTT broker connection details
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Saved connection selector -->
        <div class="grid gap-2">
          <Label for="savedConnection">Saved connection</Label>
          <div class="flex gap-2">
            <Select v-model="selectedConnectionId">
              <SelectTrigger id="savedConnection" class="flex-1">
                <SelectValue placeholder="New connection">
                  {{
                    selectedConnectionId &&
                    selectedConnectionId !== SENTINEL_NEW
                      ? savedConnections.find(
                          (c) => c.id === selectedConnectionId
                        )?.name ?? "Select..."
                      : "New connection"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="SENTINEL_NEW">New connection</SelectItem>
                <SelectItem
                  v-for="conn in savedConnections"
                  :key="conn.id"
                  :value="conn.id"
                >
                  {{ conn.name }} ({{ conn.brokerIp }}:{{ conn.brokerPort }})
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              v-if="canDeleteConnection"
              type="button"
              variant="outline"
              size="icon"
              title="Delete this saved connection"
              @click="handleDeleteConnection"
            >
              <Icon icon="ph:trash" class="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <!-- Connection name (for new or display name) -->
        <div class="grid gap-2">
          <Label for="connectionName">Connection name (optional)</Label>
          <Input
            id="connectionName"
            v-model="formData.connectionName"
            placeholder="e.g. Production, Dev local"
            :disabled="isConnecting"
          />
        </div>

        <!-- Connection Type -->
        <div class="grid gap-2">
          <Label for="connectionType">Connection Type</Label>
          <Select v-model="formData.connectionType">
            <SelectTrigger id="connectionType">
              <SelectValue>
                {{
                  formData.connectionType === "mqtt"
                    ? "MQTT (Electron only)"
                    : "WebSocket"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="websocket">WebSocket</SelectItem>
              <SelectItem value="mqtt">MQTT (Electron only)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Broker IP/Host -->
        <div class="grid gap-2">
          <Label for="brokerIp">Broker IP/Host *</Label>
          <Input
            id="brokerIp"
            v-model="formData.brokerIp"
            placeholder="e.g., localhost or 192.168.1.100"
            :disabled="isConnecting"
          />
        </div>

        <!-- Port -->
        <div class="grid gap-2">
          <Label for="brokerPort">Port *</Label>
          <Input
            id="brokerPort"
            v-model="formData.brokerPort"
            type="number"
            placeholder="e.g., 9001"
            :disabled="isConnecting"
          />
        </div>

        <!-- Interface Name -->
        <div class="grid gap-2">
          <Label for="interfaceName">Interface Name (Optional)</Label>
          <Input
            id="interfaceName"
            v-model="formData.interfaceName"
            placeholder="e.g., vda5050 (leave empty to subscribe to all)"
            :disabled="isConnecting"
          />
        </div>

        <!-- Basepath -->
        <div class="grid gap-2">
          <Label for="basepath">Basepath (Optional)</Label>
          <Input
            id="basepath"
            v-model="formData.basepath"
            placeholder="e.g., /mqtt"
            :disabled="isConnecting"
          />
        </div>

        <!-- Username -->
        <div class="grid gap-2">
          <Label for="username">Username (Optional)</Label>
          <Input
            id="username"
            v-model="formData.username"
            placeholder="MQTT username"
            :disabled="isConnecting"
          />
        </div>

        <!-- Password -->
        <div class="grid gap-2">
          <Label for="password">Password (Optional)</Label>
          <div class="relative">
            <Input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="MQTT password"
              :disabled="isConnecting"
              class="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              @click="showPassword = !showPassword"
            >
              <Icon
                :icon="showPassword ? 'ph:eye-slash' : 'ph:eye'"
                class="h-4 w-4 text-muted-foreground"
              />
            </Button>
          </div>
        </div>

        <!-- Client ID -->
        <div class="grid gap-2">
          <Label for="clientId">Client ID (Optional)</Label>
          <Input
            id="clientId"
            v-model="formData.clientId"
            placeholder="Auto-generated if empty"
            :disabled="isConnecting"
          />
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
        >
          {{ errorMessage }}
        </div>

        <!-- Connection Status -->
        <div
          v-if="isConnected"
          class="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400"
        >
          <Icon icon="ph:check-circle" class="h-4 w-4" />
          <span>Connected</span>
        </div>
      </div>

      <DialogFooter class="flex-wrap gap-2">
        <Button
          variant="outline"
          @click="emits('update:open', false)"
          :disabled="isConnecting"
        >
          Cancel
        </Button>
        <Button variant="outline" @click="handleSave" :disabled="isConnecting">
          <Icon
            v-if="saveSuccessMessage"
            icon="ph:check"
            class="mr-2 h-4 w-4"
          />
          {{ saveSuccessMessage || "Save" }}
        </Button>
        <Button
          v-if="isConnected"
          variant="destructive"
          @click="handleDisconnect"
          :disabled="isConnecting"
        >
          Disconnect
        </Button>
        <Button v-else @click="handleConnect" :disabled="isConnecting">
          <Icon
            v-if="isConnecting"
            icon="ph:spinner"
            class="mr-2 h-4 w-4 animate-spin"
          />
          {{ isConnecting ? "Connecting..." : "Connect" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
