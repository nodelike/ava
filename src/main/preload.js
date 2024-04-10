const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ollamaAPI', {
  list: () => ipcRenderer.invoke('ollama:list'),
  chat: (model, messages) => ipcRenderer.invoke('ollama:chat', { model, messages }),
  onChatResponse: (callback) => ipcRenderer.on('ollama:chat-response', callback),
  onChatEnd: (callback) => ipcRenderer.on('ollama:chat-end', callback),
  onChatError: (callback) => ipcRenderer.on('ollama:chat-error', callback),
});