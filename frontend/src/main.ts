import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

if (require('electron-squirrel-startup')) app.quit();

let backendProcess: ChildProcess | null = null;

function killBackend() {
  if (backendProcess && backendProcess.pid) {
    console.log(`Killing backend process ${backendProcess.pid}`);
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t']);
    } else {
      backendProcess.kill();
    }
    backendProcess = null;
  }
}

function startBackend() {
  const isDev = !app.isPackaged;
  let pythonPath: string;
  let args: string[];

  if (isDev) {
    // Development: Use .venv python and main.py
    pythonPath = path.join(app.getAppPath(), '..', 'backend', '.venv', 'Scripts', 'python.exe');
    const scriptPath = path.join(app.getAppPath(), '..', 'backend', 'main.py');
    args = [scriptPath];
  } else {
    // Production: Use bundled backend.exe in the resources folder
    pythonPath = path.join(process.resourcesPath, 'backend.exe');
    args = [];
  }

  const dbDir = path.join(app.getPath('userData'), 'database');
  const dbPath = path.join(dbDir, 'people.db');
  
  // In Dev, source is in the project root. In Prod, it's in the resources folder.
  const dbSource = isDev 
    ? path.join(app.getAppPath(), '..', 'people.db')
    : path.join(process.resourcesPath, 'people.db');

  backendProcess = spawn(pythonPath, args, {
    env: { 
      ...process.env, 
      PYTHONUNBUFFERED: '1',
      PEOPLE_DB_PATH: dbPath,
      PEOPLE_DB_SOURCE: dbSource
    },
    shell: false
  });

  backendProcess.stdout?.on('data', (data) => console.log(`Backend: ${data}`));
  backendProcess.stderr?.on('data', (data) => console.error(`Backend Error: ${data}`));
}

const createWindow = () => {
  const isDev = !app.isPackaged;
  const iconPath = isDev 
    ? path.join(app.getAppPath(), 'public', 'hr-logo', 'favicon.ico')
    : path.join(process.resourcesPath, 'app', '.vite', 'renderer', 'main_window', 'hr-logo', 'favicon.ico');

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset'
  });

  mainWindow.setMenu(null);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.on('ready', () => {
  startBackend();
  createWindow();
  
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });
});

app.on('window-all-closed', () => {
  killBackend(); // Kill backend immediately when window closes
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  killBackend(); // Final cleanup
});
