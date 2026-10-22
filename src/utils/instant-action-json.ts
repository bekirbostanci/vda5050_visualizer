import type { Action, InstantActions } from "vda-5050-lib";
import type { AgvIdentity } from "@/utils/order-json";
import { splitOrderJsonDocuments } from "@/utils/order-json";

export type { AgvIdentity };

export interface ParsedInstantActionsJson {
  instantActions: InstantActions;
  warnings: string[];
}

function normalizeActionsArray(obj: Record<string, unknown>): Action[] {
  const raw = obj.instantActions ?? obj.actions;

  if (!Array.isArray(raw)) {
    throw new Error(
      "InstantActions JSON must include a non-empty instantActions (or actions) array."
    );
  }

  if (raw.length === 0) {
    throw new Error(
      "InstantActions must include at least one action in instantActions."
    );
  }

  const actions: Action[] = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Action at index ${i} must be an object.`);
    }

    const action = item as Record<string, unknown>;
    const actionId =
      typeof action.actionId === "string" && action.actionId.trim()
        ? action.actionId.trim()
        : typeof action.actionId === "number"
          ? String(action.actionId)
          : "";

    const actionType =
      typeof action.actionType === "string" && action.actionType.trim()
        ? action.actionType.trim()
        : "";

    if (!actionId) {
      throw new Error(`Action at index ${i} is missing actionId.`);
    }
    if (!actionType) {
      throw new Error(`Action at index ${i} is missing actionType.`);
    }

    actions.push({
      ...(action as unknown as Action),
      actionId,
      actionType,
    });
  }

  return actions;
}

export function splitInstantActionJsonDocuments(text: string): string[] {
  return splitOrderJsonDocuments(text);
}

export function parseInstantActionsJson(
  text: string,
  agvId?: AgvIdentity
): ParsedInstantActionsJson {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON: ${message}`);
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("InstantActions JSON must be an object.");
  }

  const obj = raw as Record<string, unknown>;
  const warnings: string[] = [];

  const manufacturer =
    typeof obj.manufacturer === "string" && obj.manufacturer.trim()
      ? obj.manufacturer.trim()
      : agvId?.manufacturer;

  const serialNumber =
    typeof obj.serialNumber === "string" && obj.serialNumber.trim()
      ? obj.serialNumber.trim()
      : agvId?.serialNumber;

  if (!manufacturer || !serialNumber) {
    throw new Error(
      "InstantActions JSON must include manufacturer and serialNumber (or select an AGV first)."
    );
  }

  if (!obj.manufacturer && agvId) {
    warnings.push(
      `manufacturer defaulted to "${manufacturer}" from selected AGV.`
    );
  }
  if (!obj.serialNumber && agvId) {
    warnings.push(
      `serialNumber defaulted to "${serialNumber}" from selected AGV.`
    );
  }

  const headerId =
    typeof obj.headerId === "number"
      ? obj.headerId
      : typeof obj.headerId === "string"
        ? Number(obj.headerId)
        : 1;

  if (Number.isNaN(headerId)) {
    throw new Error("headerId must be a number.");
  }

  const version =
    typeof obj.version === "string" && obj.version.trim()
      ? obj.version.trim()
      : "2.0.0";

  if (!obj.version) {
    warnings.push(`version defaulted to "${version}".`);
  }

  const actions = normalizeActionsArray(obj);

  if (obj.actions && !obj.instantActions) {
    warnings.push('Used legacy "actions" field; form uses instantActions.');
  }

  const instantActions: InstantActions = {
    headerId,
    manufacturer,
    serialNumber,
    timestamp:
      typeof obj.timestamp === "string" && obj.timestamp.trim()
        ? obj.timestamp.trim()
        : new Date().toISOString(),
    version,
    instantActions: actions,
  };

  return { instantActions, warnings };
}

export function parseInstantActionsJsonDocuments(
  text: string,
  agvId?: AgvIdentity
): ParsedInstantActionsJson[] {
  return splitInstantActionJsonDocuments(text).map((doc) =>
    parseInstantActionsJson(doc, agvId)
  );
}

export function formatInstantActionsJson(
  instantActions: InstantActions,
  pretty = true
): string {
  return JSON.stringify(instantActions, null, pretty ? 2 : 0);
}

export function instantActionsToFormState(
  instantActions: InstantActions,
  agvId: AgvIdentity
): {
  headerId: number;
  manufacturer: string;
  serialNumber: string;
  timestamp: string;
  version: string;
  instantActions: Action[];
} {
  const actions =
    instantActions.instantActions ??
    (instantActions as InstantActions & { actions?: Action[] }).actions ??
    [];

  return {
    headerId: instantActions.headerId ?? 1,
    manufacturer: instantActions.manufacturer ?? agvId.manufacturer,
    serialNumber: instantActions.serialNumber ?? agvId.serialNumber,
    timestamp: instantActions.timestamp ?? new Date().toISOString(),
    version: instantActions.version ?? "2.0.0",
    instantActions: [...actions],
  };
}
