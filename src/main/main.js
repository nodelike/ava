const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ollama = require('ollama');
const os = require('node-os-utils');
const si = require('systeminformation');
const fs = require('fs').promises;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    show: false
  });

  // mainWindow.setMenu(null);

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (true) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('ollama:list', async () => {
  try {
    const ollamaInstance = new ollama.Ollama({ host: 'http://localhost:11434' });
    const response = await ollamaInstance.list();
    return response;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
});

ipcMain.handle('ollama:chat', async (event, { model, messages }) => {
  try {
    const ollamaInstance = new ollama.Ollama({ host: 'http://localhost:11434' });
    const response = await ollamaInstance.chat({ model, messages, stream: true });

    for await (const part of response) {
      event.sender.send('ollama:chat-response', part.message.content);
    }

    event.sender.send('ollama:chat-end');
  } catch (error) {
    console.error('Error:', error);
    event.sender.send('ollama:chat-error', error.message);
  }
});

ipcMain.handle('get-system-stats', async () => {
  try {
    const cpu = os.cpu;
    const mem = os.mem;
    const stats = {};

    stats.cpuUsage = await cpu.usage();

    const cpuTemp = await si.cpuTemperature();
    stats.cpuTemp = cpuTemp.main;

    stats.memInfo = await mem.info();

    const batteryInfo = await si.battery();
    stats.batteryLevel = batteryInfo.percent;
    stats.isCharging = batteryInfo.isCharging;
    
    return stats;
  } catch (error) {
    console.error('Error retrieving system stats:', error);
    return null;
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(path.join(__dirname, "..", filePath), 'utf8');
    return data;
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    if (data === undefined) {
      console.error('Error writing file: data is undefined');
      return;
    }
    await fs.writeFile(path.join(__dirname, "..", filePath), data, 'utf8');
  } catch (error) {
    console.error('Error writing file:', error);
  }
});



app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});