import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as net from 'net'
import * as fs from 'fs'
import Store from 'electron-store'

const store = new Store<{
  apiKey: string
  backendPort: number
  theme: 'dark' | 'light'
}>()

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
let backendPort = 8000

function getFreePo(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 8000
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

async function waitForBackend(port: number, retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`)
      if (response.ok) return
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Backend did not start on port ${port}`)
}

async function startBackend(): Promise<void> {
  backendPort = await getFreePo()
  store.set('backendPort', backendPort)

  const isDev = !app.isPackaged
  const rootDir = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath)
  const backendDir = path.join(rootDir, 'backend')

  // Let's use the explicit local venv python path if it exists
  const pythonCandidates = [
    path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
    path.join(rootDir, '.venv', 'bin', 'python'),
    'python3',
    'python',
    'py', // Windows fallback
  ]

  let pythonExe = 'python'
  for (const candidate of pythonCandidates) {
    if (fs.existsSync(candidate)) {
      pythonExe = candidate
      break
    }
  }

  console.log(`[Backend] Using Python executable at: ${pythonExe}`)

  backendProcess = spawn(
    pythonExe,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(backendPort)],
    {
      cwd: backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )

  backendProcess.stdout?.on('data', (data: Buffer) => {
    console.log('[Backend STDOUT]', data.toString())
  })

  backendProcess.stderr?.on('data', (data: Buffer) => {
    console.error('[Backend STDERR]', data.toString())
  })

  backendProcess.on('exit', (code) => {
    console.log(`[Backend] Process exited with code ${code}`)
  })

  await waitForBackend(backendPort)
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0F1117',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0F1117',
      symbolColor: '#888780',
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const isDev = !app.isPackaged
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// IPC Handlers
ipcMain.handle('get-api-key', () => store.get('apiKey', ''))
ipcMain.handle('set-api-key', (_event, key: string) => { store.set('apiKey', key) })
ipcMain.handle('get-backend-port', () => backendPort)
ipcMain.handle('get-theme', () => store.get('theme', 'dark'))
ipcMain.handle('set-theme', (_event, theme: 'dark' | 'light') => { store.set('theme', theme) })

app.whenReady().then(async () => {
  try {
    await startBackend()
  } catch (err) {
    console.error('Backend failed to start:', err)
  }
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    backendProcess?.kill()
    app.quit()
  }
})

app.on('before-quit', () => {
  backendProcess?.kill()
})
