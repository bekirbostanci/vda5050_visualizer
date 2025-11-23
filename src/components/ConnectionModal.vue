<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icon } from '@iconify/vue';
import { useVDA5050 } from '@/composables/useVDA5050';
import { loadSavedConfig } from '@/types/mqtt-config';
import { useMqttStore } from '@/stores/mqtt';
import { MqttClientState } from '@/types/mqtt.types';
import { sharedMqttClient } from '@/utils/shared-mqtt-client';

const props = defineProps<{
  open: boolean;
}>();

const emits = defineEmits<{
  'update:open': [value: boolean];
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

// Local form state
const formData = ref({
  brokerIp: '',
  brokerPort: '',
  basepath: '',
  interfaceName: '',
  username: '',
  password: '',
  connectionType: 'websocket' as 'mqtt' | 'websocket',
  clientId: '',
});

const showPassword = ref(false);
const isConnecting = ref(false);
const errorMessage = ref('');

// Load saved config when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    const savedConfig = loadSavedConfig();
    formData.value = {
      brokerIp: savedConfig.brokerIp || '',
      brokerPort: savedConfig.brokerPort || '',
      basepath: savedConfig.basepath || '',
      interfaceName: savedConfig.interfaceName || '',
      username: savedConfig.username || '',
      password: savedConfig.password || '',
      connectionType: (savedConfig.connectionType as 'mqtt' | 'websocket') || 'websocket',
      clientId: `mqtt_client_${Math.random().toString(16).slice(2, 8)}`,
    };
    errorMessage.value = '';
  }
});

// Sync with composable values on mount
onMounted(() => {
  formData.value.brokerIp = brokerIp.value;
  formData.value.brokerPort = brokerPort.value;
  formData.value.basepath = basepath.value;
  formData.value.interfaceName = interfaceName.value;
  formData.value.username = username.value;
  formData.value.password = password.value;
  formData.value.connectionType = connectionType.value;
});

const handleConnect = async () => {
  // Validation
  if (!formData.value.brokerIp.trim()) {
    errorMessage.value = 'Broker IP/Host is required';
    return;
  }
  if (!formData.value.brokerPort.trim()) {
    errorMessage.value = 'Port is required';
    return;
  }
  if (!formData.value.interfaceName.trim()) {
    errorMessage.value = 'Interface Name is required';
    return;
  }

  errorMessage.value = '';
  isConnecting.value = true;

  try {
    // Update composable values
    brokerIp.value = formData.value.brokerIp.trim();
    brokerPort.value = formData.value.brokerPort.trim();
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
      emits('update:open', false);
    }, 500);
  } catch (error) {
    console.error('Connection error:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to connect';
    isConnecting.value = false;
  }
};

const handleDisconnect = () => {
  try {
    // Disconnect based on connection type
    if (connectionType.value === 'websocket') {
      // Disconnect shared MQTT client for WebSocket
      sharedMqttClient.disconnect();
    } else if (connectionType.value === 'mqtt' && typeof window.electron !== 'undefined') {
      // For Electron MQTT, send disconnect message (if handler exists)
      // Note: This requires a disconnect-mqtt IPC handler in main.js
      window.electron.ipcRenderer.send('disconnect-mqtt');
    }
    
    // Disconnect visualizer if it exists
    if (vda5050Visualizer) {
      vda5050Visualizer.disconnect();
    }
    
    // Update store state
    mqttStore.setConnectionState(MqttClientState.OFFLINE);
    
    emits('update:open', false);
  } catch (error) {
    console.error('Error disconnecting:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to disconnect';
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
        <!-- Connection Type -->
        <div class="grid gap-2">
          <Label for="connectionType">Connection Type</Label>
          <Select v-model="formData.connectionType">
            <SelectTrigger id="connectionType">
              <SelectValue>
                {{ formData.connectionType === 'mqtt' ? 'MQTT (Electron only)' : 'WebSocket' }}
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
          <Label for="interfaceName">Interface Name *</Label>
          <Input
            id="interfaceName"
            v-model="formData.interfaceName"
            placeholder="e.g., vda5050"
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
        <div v-if="errorMessage" class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {{ errorMessage }}
        </div>

        <!-- Connection Status -->
        <div v-if="isConnected" class="flex items-center gap-2 rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
          <Icon icon="ph:check-circle" class="h-4 w-4" />
          <span>Connected</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emits('update:open', false)" :disabled="isConnecting">
          Cancel
        </Button>
        <Button
          v-if="isConnected"
          variant="destructive"
          @click="handleDisconnect"
          :disabled="isConnecting"
        >
          Disconnect
        </Button>
        <Button
          v-else
          @click="handleConnect"
          :disabled="isConnecting"
        >
          <Icon v-if="isConnecting" icon="ph:spinner" class="mr-2 h-4 w-4 animate-spin" />
          {{ isConnecting ? 'Connecting...' : 'Connect' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

