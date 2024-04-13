const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs').promises;
const path = require('path');

contextBridge.exposeInMainWorld('fileSystem', {
  readFile: (filePath) => fs.readFile(path.join(__dirname, "..", filePath), 'utf8'),
  writeFile: (filePath, data) => fs.writeFile(path.join(__dirname, "..", filePath), data, 'utf8'),
});

contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

contextBridge.exposeInMainWorld('ollamaAPI', {
  list: () => ipcRenderer.invoke('ollama:list'),
  chat: (model, messages) => ipcRenderer.invoke('ollama:chat', { model, messages }),
  onChatResponse: (callback) => ipcRenderer.on('ollama:chat-response', callback),
  onChatEnd: (callback) => ipcRenderer.on('ollama:chat-end', callback),
  onChatError: (callback) => ipcRenderer.on('ollama:chat-error', callback),
});