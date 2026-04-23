const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('myAPI', {
  // Expor APIs seguras aqui
});
