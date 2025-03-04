const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    removeAllListeners: (channel) => {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // Auto-updater functions
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startDownload: () => ipcRenderer.invoke('start-download'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

  // Auto-updater events
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_, status) => callback(status)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_, error) => callback(error)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_, progressObj) => callback(progressObj)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, info) => callback(info)),

  // MQTT functions
  connectMQTT: (options) => ipcRenderer.send('connect-mqtt', options),
  subscribeTopic: (topic) => ipcRenderer.send('subscribe-topic', topic),
  publishMessage: (topic, message) => ipcRenderer.send('publish-message', { topic, message }),
  onMQTTMessage: (callback) => ipcRenderer.on('mqtt-message', (_, data) => callback(data)),
  onMQTTError: (callback) => ipcRenderer.on('mqtt-error', (_, error) => callback(error)),
  onMQTTConnected: (callback) => ipcRenderer.on('mqtt-connected', () => callback()),
  onMQTTDisconnected: (callback) => ipcRenderer.on('mqtt-disconnected', () => callback()),
  onMQTTReconnecting: (callback) => ipcRenderer.on('mqtt-reconnecting', () => callback())
}); 