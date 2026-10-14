import type { Action, ActionParameter } from "vda-5050-lib";

/** Where an action may be used (factsheet agvActions.actionScopes) */
export type ActionScope = "INSTANT" | "NODE" | "EDGE";

/** factsheet actionParameters.valueDataType */
export type ValueDataType =
  | "BOOL"
  | "NUMBER"
  | "INTEGER"
  | "FLOAT"
  | "STRING"
  | "OBJECT"
  | "ARRAY";

export type BlockingTypeValue = "NONE" | "SOFT" | "HARD";

export const ALL_BLOCKING_TYPES: BlockingTypeValue[] = ["NONE", "SOFT", "HARD"];

export interface CatalogParameter {
  key: string;
  valueDataType?: ValueDataType;
  description?: string;
  isOptional: boolean;
}

/** An action type the editors offer, from the factsheet or the fallback list */
export interface CatalogAction {
  actionType: string;
  description?: string;
  /** Empty for fallback actions: usable in every scope */
  scopes: ActionScope[];
  parameters: CatalogParameter[];
  /** Empty when unknown: every blocking type is allowed */
  blockingTypes: BlockingTypeValue[];
}

/** Standard VDA5050 actions, used when no factsheet was received */
export const FALLBACK_ACTIONS: CatalogAction[] = [
  [
    "startPause",
    "Activates pause mode. No driving movements, actions can continue. Order is resumable.",
  ],
  [
    "stopPause",
    "Deactivates pause mode. Movement and actions will be resumed.",
  ],
  [
    "startCharging",
    "Activates charging process. Can be done on charging spot or lane.",
  ],
  ["stopCharging", "Deactivates charging process to send a new order."],
  [
    "initPosition",
    "Resets (overrides) the pose of the AGV with given parameters.",
  ],
  ["enableMap", "Enable a previously downloaded map to be used in orders."],
  ["downloadMap", "Trigger the download of a new map."],
  ["deleteMap", "Trigger the removal of a map from vehicle memory."],
  ["stateRequest", "Requests the AGV to send a new state report."],
  ["logReport", "Requests the AGV to generate and store a log report."],
  [
    "pick",
    "Request the AGV to pick a load. Supports multiple load handling devices.",
  ],
  ["drop", "Request the AGV to drop a load."],
  [
    "detectObject",
    "AGV detects object (e.g., load, charging spot, free parking position).",
  ],
  [
    "finePositioning",
    "AGV positions exactly on a target. Can be used on node or edge.",
  ],
  [
    "waitForTrigger",
    "AGV waits for a trigger (e.g., button press, manual loading).",
  ],
  [
    "cancelOrder",
    "AGV stops as soon as possible. Order is deleted, all actions canceled.",
  ],
  ["factsheetRequest", "Requests the AGV to send a factsheet."],
].map(([actionType, description]) => ({
  actionType,
  description,
  scopes: [],
  parameters: [],
  blockingTypes: [],
}));

export interface ParsedFactsheet {
  factsheet: any;
  /**
   * True when the factsheet came wrapped as {"data": "<json string>"}
   * (e.g. a string message forwarded by a bridge) instead of the JSON object.
   */
  wrapped: boolean;
}

/**
 * Reads a factsheet topic message. Returns null when it holds no factsheet.
 */
export function parseFactsheetMessage(
  message: unknown
): ParsedFactsheet | null {
  let value: any = message;
  let wrapped = false;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object" && typeof value.data === "string") {
    try {
      value = JSON.parse(value.data);
      wrapped = true;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || !value.protocolFeatures) {
    return null;
  }
  return { factsheet: value, wrapped };
}

/** Action types of a factsheet (protocolFeatures.agvActions) */
export function catalogFromFactsheet(factsheet: any): CatalogAction[] {
  const agvActions = factsheet?.protocolFeatures?.agvActions;
  if (!Array.isArray(agvActions)) return [];

  return agvActions
    .filter((action: any) => typeof action?.actionType === "string")
    .map((action: any) => ({
      actionType: action.actionType,
      description: action.actionDescription,
      scopes: Array.isArray(action.actionScopes) ? action.actionScopes : [],
      parameters: (Array.isArray(action.actionParameters)
        ? action.actionParameters
        : []
      )
        .filter((param: any) => typeof param?.key === "string")
        .map((param: any) => ({
          key: param.key,
          valueDataType: param.valueDataType,
          description: param.description,
          isOptional: param.isOptional === true,
        })),
      blockingTypes: Array.isArray(action.blockingTypes)
        ? action.blockingTypes
        : [],
    }));
}

/** Actions usable in a scope; fallback actions have no scopes and fit all */
export function actionsForScope(
  catalog: CatalogAction[],
  scope: ActionScope
): CatalogAction[] {
  return catalog.filter(
    (action) => action.scopes.length === 0 || action.scopes.includes(scope)
  );
}

export function findCatalogAction(
  catalog: CatalogAction[],
  actionType: string | undefined
): CatalogAction | undefined {
  if (!actionType) return undefined;
  return catalog.find((action) => action.actionType === actionType);
}

export interface ConvertedValue {
  value: unknown;
  /** Set when the text does not match the declared valueDataType */
  error?: string;
}

/**
 * Converts the text of a parameter input into the JSON value to publish.
 * Without a valueDataType (free-form parameter) JSON is parsed if possible,
 * otherwise the text is kept as a string.
 */
export function convertParameterValue(
  text: string,
  valueDataType?: ValueDataType
): ConvertedValue {
  const trimmed = text.trim();
  switch (valueDataType) {
    case "STRING":
      return { value: text };
    case "BOOL":
      if (trimmed === "true") return { value: true };
      if (trimmed === "false") return { value: false };
      return { value: text, error: "Expected true or false" };
    case "INTEGER":
      if (/^[-+]?\d+$/.test(trimmed)) return { value: Number(trimmed) };
      return { value: text, error: "Expected an integer" };
    case "NUMBER":
    case "FLOAT":
      if (trimmed !== "" && Number.isFinite(Number(trimmed))) {
        return { value: Number(trimmed) };
      }
      return { value: text, error: "Expected a number" };
    case "OBJECT":
    case "ARRAY": {
      try {
        const parsed = JSON.parse(trimmed);
        const isArray = Array.isArray(parsed);
        const ok =
          valueDataType === "ARRAY"
            ? isArray
            : parsed !== null && typeof parsed === "object" && !isArray;
        if (ok) return { value: parsed };
      } catch {
        // reported below
      }
      return {
        value: text,
        error:
          valueDataType === "ARRAY"
            ? "Expected a JSON array"
            : "Expected a JSON object",
      };
    }
    default:
      try {
        return { value: JSON.parse(trimmed) };
      } catch {
        return { value: text };
      }
  }
}

/** Text shown in a parameter input for a stored value */
export function formatParameterValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/**
 * Prepares an action for a newly selected action type: adds the required
 * parameters that are missing and picks an allowed blocking type.
 * Existing parameters (also free-form ones) are kept.
 */
export function applyCatalogAction(
  action: Action,
  catalogAction: CatalogAction
) {
  const parameters: ActionParameter[] = action.actionParameters ?? [];
  catalogAction.parameters
    .filter((param) => !param.isOptional)
    .forEach((param) => {
      if (!parameters.some((existing) => existing.key === param.key)) {
        parameters.push({ key: param.key, value: "" });
      }
    });
  action.actionParameters = parameters;

  const allowed = catalogAction.blockingTypes;
  if (
    allowed.length > 0 &&
    !allowed.includes(action.blockingType as BlockingTypeValue)
  ) {
    action.blockingType = allowed[0] as Action["blockingType"];
  }
}
