const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get list of expression maps from the user data folder
  getExpressionMaps: () => ipcRenderer.invoke('get-expression-maps'),

  // Get content of a specific expression map
  getExpressionMapContent: (filePath) => ipcRenderer.invoke('get-expression-map-content', filePath),

  // Upload/save a new expression map
  uploadExpressionMap: (filename, content) => ipcRenderer.invoke('upload-expression-map', filename, content),

  // Delete an expression map
  deleteExpressionMap: (filePath) => ipcRenderer.invoke('delete-expression-map', filePath),

  // Open the expression maps folder in file explorer
  openExpressionMapsFolder: () => ipcRenderer.invoke('open-expression-maps-folder'),

  // Get the expression maps directory path
  getExpressionMapsDir: () => ipcRenderer.invoke('get-expression-maps-dir'),

  // Show file import dialog
  showImportDialog: () => ipcRenderer.invoke('show-import-dialog'),

  // Check if running in Electron
  isElectron: true
});
