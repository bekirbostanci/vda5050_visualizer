const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mqtt = require('mqtt');
const isDev = !app.isPackaged;

let mainWindow;
let mqttClient;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  });

  // Add this for debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', {
      errorCode,
      errorDescription,
      validatedURL
    });
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:8082');
    // mainWindow.webContents.openDevTools(); // Open DevTools in dev mode
  } else {
    const indexPath = path.resolve(__dirname, '..', 'dist', 'index.html');
    console.log('Loading from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
    // mainWindow.webContents.openDevTools(); // Temporarily open DevTools in prod to debug
  }

  // Only open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

// MQTT Connection Handler
function connectMQTT(connectionOptions) {
  if (mqttClient) {
    mqttClient.end();
  }

  const { host, port, username, password, clientId } = connectionOptions;
  
  console.log('Attempting MQTT connection:', { host, port, clientId });

  const options = {
    host: host,
    port: Number(port),
    clientId: clientId,
    username: username || undefined,
    password: password || undefined,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    rejectUnauthorized: false,
    protocol: 'mqtt'
  };

  try {
    const url = `mqtt://${host}:${port}`;
    console.log('MQTT URL:', url);
    mqttClient = mqtt.connect(url, options);

    mqttClient.on('connect', () => {
      console.log('MQTT Connected successfully');
      mainWindow.webContents.send('mqtt-connected');

      if (connectionOptions.topics && connectionOptions.topics.length > 0) {
        connectionOptions.topics.forEach(topic => {
          mqttClient.subscribe(topic, (err) => {
            if (err) {
              console.error(`Failed to subscribe to ${topic}:`, err);
            }
          });
        });
      }
    });

    mqttClient.on('message', (topic, message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        mainWindow.webContents.send('mqtt-message', {
          topic,
          message: parsedMessage
        });
      } catch (e) {
        console.error('Failed to parse MQTT message:', e);
        mainWindow.webContents.send('mqtt-message', {
          topic,
          message: message.toString()
        });
      }
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT Error:', error);
      mainWindow.webContents.send('mqtt-error', error.message);
    });

    mqttClient.on('disconnect', () => {
      console.log('MQTT Disconnected');
      mainWindow.webContents.send('mqtt-disconnected');
    });

    mqttClient.on('reconnect', () => {
      console.log('MQTT Attempting to reconnect');
      mainWindow.webContents.send('mqtt-reconnecting');
    });

  } catch (error) {
    console.error('MQTT Connection failed:', error);
    mainWindow.webContents.send('mqtt-error', error.message);
  }
}

// IPC Handlers
ipcMain.on('connect-mqtt', (event, connectionOptions) => {
  try {
    connectMQTT(connectionOptions);
  } catch (error) {
    console.error('Failed to connect to MQTT:', error);
    mainWindow.webContents.send('mqtt-error', error.message);
  }
});

ipcMain.on('subscribe-topic', (event, topic) => {
  if (mqttClient && mqttClient.connected) {
    mqttClient.subscribe(topic, (err) => {
      if (err) {
        console.error(`Failed to subscribe to ${topic}:`, err);
        mainWindow.webContents.send('mqtt-error', `Failed to subscribe to ${topic}: ${err.message}`);
      }
    });
  } else {
    console.error('MQTT client not connected');
    mainWindow.webContents.send('mqtt-error', 'MQTT client not connected');
  }
});

ipcMain.on('publish-message', (event, { topic, message }) => {
  if (mqttClient && mqttClient.connected) {
    try {
      const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;
      mqttClient.publish(topic, messageStr, (err) => {
        if (err) {
          console.error(`Failed to publish to ${topic}:`, err);
          mainWindow.webContents.send('mqtt-error', `Failed to publish to ${topic}: ${err.message}`);
        }
      });
    } catch (error) {
      console.error('Failed to publish message:', error);
      mainWindow.webContents.send('mqtt-error', `Failed to publish message: ${error.message}`);
    }
  } else {
    console.error('MQTT client not connected');
    mainWindow.webContents.send('mqtt-error', 'MQTT client not connected');
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (mqttClient) {
    mqttClient.end();
  }
  if (process.platform !== 'darwin') app.quit();
}); 