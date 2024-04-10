const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ollama = require('ollama');

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