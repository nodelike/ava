const { contextBridge, ipcRenderer } = require('electron');

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