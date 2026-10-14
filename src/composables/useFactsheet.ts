import { computed, ref, watch } from "vue";
import { useMqttStore } from "@/stores/mqtt";
import { sharedMqttClient } from "@/utils/shared-mqtt-client";
import { Topic } from "@/types/mqtt.types";
import { BlockingType } from "@/types/vda5050.types";
import {
  catalogFromFactsheet,
  FALLBACK_ACTIONS,
  parseFactsheetMessage,
  type CatalogAction,
} from "@/utils/action-catalog";
import type { InstantActions } from "vda-5050-lib";

/** How long to wait for the retained factsheet after subscribing */
const RETAINED_TIMEOUT_MS = 2000;
/** How long to wait for the factsheet after a factsheetRequest */
const REQUEST_TIMEOUT_MS = 5000;

export type FactsheetLoadResult = "retained" | "requested" | "timeout";

/**
 * Factsheet of one AGV and the action catalog derived from it.
 * Without a factsheet the catalog is the standard VDA5050 action list.
 */
export function useFactsheet(agvId: {
  manufacturer: string;
  serialNumber: string;
}) {
  const mqttStore = useMqttStore();
  const key = `${agvId.manufacturer}/${agvId.serialNumber}`;
  const loading = ref(false);

  const parsed = computed(() =>
    parseFactsheetMessage(mqttStore.agvDataMap.get(key)?.factsheetInfo)
  );

  const factsheetCatalog = computed(() =>
    parsed.value ? catalogFromFactsheet(parsed.value.factsheet) : []
  );

  const fromFactsheet = computed(() => factsheetCatalog.value.length > 0);

  const catalog = computed<CatalogAction[]>(() =>
    fromFactsheet.value ? factsheetCatalog.value : FALLBACK_ACTIONS
  );

  /** Resolves true when a factsheet message arrives within the timeout */
  function waitForFactsheet(timeoutMs: number): Promise<boolean> {
    const before = mqttStore.agvDataMap.get(key)?.factsheetInfo;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        stop();
        resolve(false);
      }, timeoutMs);
      const stop = watch(
        () => mqttStore.agvDataMap.get(key)?.factsheetInfo,
        (info) => {
          if (info && info !== before) {
            clearTimeout(timer);
            stop();
            resolve(true);
          }
        }
      );
    });
  }

  function sendFactsheetRequest() {
    const controller = mqttStore.agvControllers.get(key);
    if (!controller) throw new Error("AGV controller not found");

    const state = mqttStore.agvDataMap.get(key)?.stateInfo;
    const timestamp = new Date().toISOString();
    const instantActions: InstantActions = {
      headerId: Math.floor(Date.now() / 1000),
      timestamp,
      version: state?.version || "2.0.0",
      manufacturer: agvId.manufacturer,
      serialNumber: agvId.serialNumber,
      instantActions: [
        {
          actionId: `factsheetRequest_${Date.now()}`,
          actionType: "factsheetRequest",
          blockingType: BlockingType.None as any,
        },
      ],
    };
    controller.publishInstantActions(
      instantActions,
      mqttStore.config.interfaceName || undefined
    );
  }

  /**
   * Re-subscribes to the factsheet topic so the broker delivers the retained
   * factsheet again. If none arrives, sends a factsheetRequest and waits.
   */
  async function loadFactsheet(): Promise<FactsheetLoadResult> {
    loading.value = true;
    try {
      if (sharedMqttClient.connected) {
        const interfaceName = mqttStore.config.interfaceName || "+";
        const filter = `${interfaceName}/+/+/+/${Topic.Factsheet}`;
        const received = waitForFactsheet(RETAINED_TIMEOUT_MS);
        try {
          await sharedMqttClient.resubscribe([filter]);
          if (await received) return "retained";
        } catch (error) {
          console.warn("Re-subscribing to the factsheet failed:", error);
        }
      }

      const received = waitForFactsheet(REQUEST_TIMEOUT_MS);
      sendFactsheetRequest();
      return (await received) ? "requested" : "timeout";
    } finally {
      loading.value = false;
    }
  }

  return {
    factsheet: computed(() => parsed.value?.factsheet ?? null),
    wrapped: computed(() => parsed.value?.wrapped ?? false),
    fromFactsheet,
    catalog,
    loading,
    loadFactsheet,
  };
}
