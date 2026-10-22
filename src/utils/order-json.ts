import type { Order } from "vda-5050-lib";

export interface AgvIdentity {
  manufacturer: string;
  serialNumber: string;
}

export interface ParsedOrderJson {
  order: Order;
  warnings: string[];
}

const REQUIRED_FIELDS = [
  "orderId",
  "orderUpdateId",
  "nodes",
  "edges",
] as const;

/** Split VdaOrders-style files (multiple JSON objects separated by lines of =). */
export function splitOrderJsonDocuments(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parts = trimmed
    .split(/\n={3,}\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length > 0) return parts;

  return [trimmed];
}

export function parseOrderJson(
  text: string,
  agvId?: AgvIdentity
): ParsedOrderJson {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON: ${message}`);
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Order JSON must be an object.");
  }

  const obj = raw as Record<string, unknown>;
  const warnings: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!Array.isArray(obj.nodes) || obj.nodes.length === 0) {
    throw new Error("Order must include a non-empty nodes array.");
  }

  if (!Array.isArray(obj.edges)) {
    throw new Error("Order must include an edges array.");
  }

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
      "Order JSON must include manufacturer and serialNumber (or select an AGV first)."
    );
  }

  if (!obj.manufacturer && agvId) {
    warnings.push(`manufacturer defaulted to "${manufacturer}" from selected AGV.`);
  }
  if (!obj.serialNumber && agvId) {
    warnings.push(`serialNumber defaulted to "${serialNumber}" from selected AGV.`);
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

  const orderUpdateId =
    typeof obj.orderUpdateId === "number"
      ? obj.orderUpdateId
      : Number(obj.orderUpdateId);

  if (Number.isNaN(orderUpdateId)) {
    throw new Error("orderUpdateId must be a number.");
  }

  const version =
    typeof obj.version === "string" && obj.version.trim()
      ? obj.version.trim()
      : "2.0.0";

  if (!obj.version) {
    warnings.push(`version defaulted to "${version}".`);
  }

  const order: Order = {
    headerId,
    manufacturer,
    serialNumber,
    timestamp:
      typeof obj.timestamp === "string" && obj.timestamp.trim()
        ? obj.timestamp.trim()
        : new Date().toISOString(),
    version,
    orderId: String(obj.orderId),
    orderUpdateId,
    nodes: obj.nodes as Order["nodes"],
    edges: obj.edges as Order["edges"],
  };

  if (typeof obj.zoneSetId === "string" && obj.zoneSetId.trim()) {
    order.zoneSetId = obj.zoneSetId.trim();
  }

  return { order, warnings };
}

export function parseOrderJsonDocuments(
  text: string,
  agvId?: AgvIdentity
): ParsedOrderJson[] {
  return splitOrderJsonDocuments(text).map((doc) => parseOrderJson(doc, agvId));
}

export function formatOrderJson(order: Order, pretty = true): string {
  return JSON.stringify(order, null, pretty ? 2 : 0);
}

export function orderToFormState(
  order: Order,
  agvId: AgvIdentity
): {
  headerId: number;
  manufacturer: string;
  serialNumber: string;
  timestamp: string;
  version: string;
  orderId: string;
  orderUpdateId: number;
  zoneSetId: string;
  nodes: Order["nodes"];
  edges: Order["edges"];
} {
  return {
    headerId: order.headerId ?? 1,
    manufacturer: order.manufacturer ?? agvId.manufacturer,
    serialNumber: order.serialNumber ?? agvId.serialNumber,
    timestamp: order.timestamp ?? new Date().toISOString(),
    version: order.version ?? "2.0.0",
    orderId: order.orderId,
    orderUpdateId: order.orderUpdateId ?? 0,
    zoneSetId: order.zoneSetId ?? "",
    nodes: order.nodes ?? [],
    edges: order.edges ?? [],
  };
}