const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { autoUpdater } = require('electron-updater');

let serverProcess;
let isDev;

async function loadIsDev() {
  try {
    const { default: dev } = await import('electron-is-dev');
    isDev = dev;
  } catch (err) {
    console.error('Erro ao carregar electron-is-dev:', err);
    isDev = false; // Presume produção se não conseguir carregar o módulo
  }
}

function startServer() {
  const serverPath = path.join(__dirname, 'server.js');

  serverProcess = exec(`node ${serverPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao iniciar o servidor: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Erro: ${stderr}`);
      return;
    }
    console.log(`Servidor iniciado: ${stdout}`);
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadURL('http://localhost:3002/');
  mainWindow.setMenu(null);
  /*mainWindow.webContents.openDevTools();*/

  mainWindow.on('closed', () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Atualização disponível',
      message: 'Uma nova versão está disponível. Baixando agora...',
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Atualização pronta',
      message: 'Nova versão baixada. O aplicativo será atualizado após o reinício.',
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  });

  // Check for updates after window is created
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

app.on('ready', async () => {
  await loadIsDev();
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});