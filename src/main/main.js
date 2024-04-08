const { app, BrowserWindow } = require('electron');

const path = require('path');

const {
  spawn
} = require('child_process');

let mainWindow;
let pythonProcess;
let serverReady = false;
function createWindow() {
  mainWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
      },
      icon: path.join(__dirname, '../assets/icon.ico'),
      show: false // Hide the window initially
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  // Show the window when the server is ready

  mainWindow.once('ready-to-show', () => {
      if (true) {
          mainWindow.show();
      }
  });
  mainWindow.on('closed', () => {
      mainWindow = null;
  });
}

// function startPythonScript() {
//   pythonProcess = spawn('python3.9', [path.join(__dirname, '../../python/main.py')]);
//   pythonProcess.stdout.on('data', (data) => {
//       console.log(`Python script output: ${data}`);
//       if (data.toString().includes('Server is ready')) {
//           serverReady = true;
//           if (mainWindow) {
//               mainWindow.show();
//           }
//       }
//   });

//   pythonProcess.stderr.on('data', (data) => {
//       console.error(`Python script error: ${data}`);
//   });

//   pythonProcess.on('close', (code) => {
//       console.log(`Python script exited with code ${code}`);
//   });
// }

app.on('ready', () => {
  createWindow();
  // startPythonScript();
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

app.on('quit', () => {
  // if (pythonProcess) {
  //     pythonProcess.kill();
  // }
});