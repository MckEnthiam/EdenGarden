"use strict";
const electron = require("electron");
const child_process = require("child_process");
const path = require("path");
const net = require("net");
const fs = require("fs");
const Store = require("electron-store");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const net__namespace = /* @__PURE__ */ _interopNamespaceDefault(net);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const store = new Store();
let mainWindow = null;
let backendProcess = null;
let backendPort = 8e3;
function getFreePo() {
  return new Promise((resolve, reject) => {
    const server = net__namespace.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 8e3;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}
async function waitForBackend(port, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Backend did not start on port ${port}`);
}
async function startBackend() {
  var _a, _b;
  backendPort = await getFreePo();
  store.set("backendPort", backendPort);
  const isDev = !electron.app.isPackaged;
  const rootDir = isDev ? path__namespace.join(__dirname, "..") : path__namespace.join(process.resourcesPath);
  const backendDir = path__namespace.join(rootDir, "backend");
  const pythonCandidates = [
    path__namespace.join(rootDir, ".venv", "Scripts", "python.exe"),
    path__namespace.join(rootDir, ".venv", "bin", "python"),
    "python3",
    "python",
    "py"
    // Windows fallback
  ];
  let pythonExe = "python";
  for (const candidate of pythonCandidates) {
    if (fs__namespace.existsSync(candidate)) {
      pythonExe = candidate;
      break;
    }
  }
  console.log(`[Backend] Using Python executable at: ${pythonExe}`);
  backendProcess = child_process.spawn(
    pythonExe,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
    {
      cwd: backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
  (_a = backendProcess.stdout) == null ? void 0 : _a.on("data", (data) => {
    console.log("[Backend STDOUT]", data.toString());
  });
  (_b = backendProcess.stderr) == null ? void 0 : _b.on("data", (data) => {
    console.error("[Backend STDERR]", data.toString());
  });
  backendProcess.on("exit", (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
  });
  await waitForBackend(backendPort);
}
async function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0F1117",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0F1117",
      symbolColor: "#888780",
      height: 32
    },
    webPreferences: {
      preload: path__namespace.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const isDev = !electron.app.isPackaged;
  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path__namespace.join(__dirname, "../dist/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
}
electron.ipcMain.handle("get-api-key", () => store.get("apiKey", ""));
electron.ipcMain.handle("set-api-key", (_event, key) => {
  store.set("apiKey", key);
});
electron.ipcMain.handle("get-backend-port", () => backendPort);
electron.ipcMain.handle("get-theme", () => store.get("theme", "dark"));
electron.ipcMain.handle("set-theme", (_event, theme) => {
  store.set("theme", theme);
});
electron.app.whenReady().then(async () => {
  try {
    await startBackend();
  } catch (err) {
    console.error("Backend failed to start:", err);
  }
  await createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    backendProcess == null ? void 0 : backendProcess.kill();
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  backendProcess == null ? void 0 : backendProcess.kill();
});
