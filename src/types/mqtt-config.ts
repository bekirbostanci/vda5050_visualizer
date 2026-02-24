export interface MqttConfig {
  brokerIp: string;
  brokerPort: string;
  basepath: string;
  interfaceName: string;
  username: string;
  password: string;
  connectionType: string;
}

export interface SavedConnection extends MqttConfig {
  id: string;
  name: string;
}

export const defaultConfig: MqttConfig = {
  brokerIp: "",
  brokerPort: "",
  basepath: "",
  interfaceName: "",
  username: "",
  password: "",
  connectionType: "",
};

const STORAGE_KEY_CONNECTIONS = "mqttConnections";
const STORAGE_KEY_ACTIVE_ID = "mqttActiveConnectionId";
const STORAGE_KEY_LEGACY = "mqttConfig";
const MAX_SAVED_CONNECTIONS = 50;

function generateId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Load all saved connections from localStorage */
export function getSavedConnections(): SavedConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONNECTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedConnection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save the list of connections (used internally by add/remove/update) */
function setSavedConnections(connections: SavedConnection[]): void {
  const trimmed =
    connections.length > MAX_SAVED_CONNECTIONS
      ? connections.slice(-MAX_SAVED_CONNECTIONS)
      : connections;
  localStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(trimmed));
}

/** Add a new connection or update existing by id. Returns the saved connection. */
export function addOrUpdateConnection(
  connection: Omit<SavedConnection, "id"> & { id?: string }
): SavedConnection {
  const list = getSavedConnections();
  const id = connection.id ?? generateId();
  const name =
    connection.name?.trim() ||
    connection.brokerIp ||
    "Unnamed connection";
  const entry: SavedConnection = {
    ...connection,
    id,
    name,
  };

  const index = list.findIndex((c) => c.id === id);
  if (index >= 0) {
    list[index] = entry;
  } else {
    list.push(entry);
  }
  setSavedConnections(list);
  return entry;
}

/** Remove a saved connection by id */
export function removeConnection(id: string): void {
  const list = getSavedConnections().filter((c) => c.id !== id);
  setSavedConnections(list);
  if (getActiveConnectionId() === id) {
    setActiveConnectionId(list[0]?.id ?? null);
  }
}

/** Get a single connection by id */
export function getConnectionById(id: string): SavedConnection | null {
  return getSavedConnections().find((c) => c.id === id) ?? null;
}

/** Store which connection id was last selected/used */
export function setActiveConnectionId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
  } else {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
  }
}

/** Get the last active connection id */
export function getActiveConnectionId(): string | null {
  return localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
}

/** Get the config to use on load: active saved connection or legacy single config */
export function loadSavedConfig(): MqttConfig {
  const activeId = getActiveConnectionId();
  if (activeId) {
    const conn = getConnectionById(activeId);
    if (conn) {
      const { id, name, ...config } = conn;
      return config;
    }
  }

  // Migrate legacy single config into a saved connection
  const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
  if (legacy) {
    try {
      const config = JSON.parse(legacy) as MqttConfig;
      const saved = addOrUpdateConnection({
        ...config,
        name: config.brokerIp || "Migrated connection",
      });
      setActiveConnectionId(saved.id);
      const { id, name, ...rest } = saved;
      return rest;
    } catch {
      // ignore
    }
  }

  return defaultConfig;
}

/** Save current config (single) – writes to active connection if set, else creates one. Kept for backward compatibility. */
export function saveConfig(config: MqttConfig): void {
  const activeId = getActiveConnectionId();
  const list = getSavedConnections();
  const existing = activeId ? list.find((c) => c.id === activeId) : null;
  const name =
    existing?.name ||
    config.brokerIp ||
    "Saved connection";
  addOrUpdateConnection({
    ...config,
    id: activeId ?? undefined,
    name,
  });
  if (!activeId) {
    const conns = getSavedConnections();
    setActiveConnectionId(conns[conns.length - 1]?.id ?? null);
  }
  // Keep legacy key in sync for any code that reads it
  localStorage.setItem(STORAGE_KEY_LEGACY, JSON.stringify(config));
}
