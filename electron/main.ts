import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as net from 'net'
import * as fs from 'fs'
import * as http from 'http'
import * as url from 'url'
import Store from 'electron-store'
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env. Using placeholder values.');
}

const store = new Store<{
  apiKey: string
  backendPort: number
  theme: {
    theme: 'garden' | 'ocean' | 'serious' | 'icecream'
    mode: 'light' | 'dark'
  }
  session?: {
    google_id: string
    email: string
    display_name: string
    avatar_url?: string
    access_token: string
    expires_at: number
  }
}>()

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
let backendPort = 8000

function getFreePort(): Promise<number> {
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

async function waitForBackend(port: number, retries = 120): Promise<void> {
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
  backendPort = await getFreePort()
  store.set('backendPort', backendPort)

  const isDev = !app.isPackaged
  const rootDir = isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath)
  const backendDir = path.join(rootDir, 'backend')

  if (isDev) {
    // En dev, on lance python backend/main.py (via le code principal qui démarre uvicorn)
    const pythonCandidates = [
      path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
      path.join(rootDir, '.venv', 'bin', 'python'),
      'python3',
      'python',
      'py',
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
      ['backend/main.py'],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          EDEN_BACKEND_PORT: String(backendPort),
          EDEN_DATA_DIR: app.getPath('userData'),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
  } else {
    const exePath = path.join(process.resourcesPath, 'backend', 'eden-backend.exe')
    if (!fs.existsSync(exePath)) {
      throw new Error(`Backend executable not found at ${exePath}`)
    }

    backendProcess = spawn(
      exePath,
      [],
      {
        cwd: path.dirname(exePath),
        env: {
          ...process.env,
          EDEN_BACKEND_PORT: String(backendPort),
          EDEN_DATA_DIR: app.getPath('userData'),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
  }

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
ipcMain.handle('get-api-key', () => {
  const session = store.get('session') as { google_id?: string } | undefined
  if (!session?.google_id) return ''
  return store.get(`apiKey-${session.google_id}`, '')
})
ipcMain.handle('set-api-key', (_event, key: string) => {
  const session = store.get('session') as { google_id?: string } | undefined
  if (!session?.google_id) return
  store.set(`apiKey-${session.google_id}`, key)
})
ipcMain.handle('get-backend-port', () => backendPort)
ipcMain.handle('get-theme', () => store.get('theme', { theme: 'garden', mode: 'light' }))
ipcMain.handle('set-theme', (_event, theme: { theme: string, mode: string }) => { store.set('theme', theme) })
ipcMain.handle('get-session', () => store.get('session'))
ipcMain.handle('set-session', (_event, session: any) => { store.set('session', session) })
ipcMain.handle('clear-session', () => { store.delete('session') })
ipcMain.on('retry-backend', async () => {
  try {
    await startBackend()
    if (mainWindow) {
      const isDev = !app.isPackaged
      if (isDev) {
        await mainWindow.loadURL('http://localhost:5173')
      } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
      }
    }
  } catch (err) {
    console.error('Retry failed:', err)
  }
})
ipcMain.handle('refresh-google-token', async () => {
  const session = store.get('session') as any
  if (!session?.refresh_token) {
    throw new Error('Refresh token absent')
  }

  const oauthPort = await getFreePort()
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET || '',
    `http://localhost:${oauthPort}/oauth2callback`
  )

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID || '',
        client_secret: GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: session.refresh_token,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Échec du rafraîchissement du token Google')
    }

    const tokenData: any = await tokenResponse.json()
    if (!tokenData.access_token) {
      throw new Error('access_token absent dans la réponse de rafraîchissement')
    }

    const newSession = {
      ...session,
      access_token: tokenData.access_token,
      expires_at: Date.now() + (tokenData.expires_in ? tokenData.expires_in * 1000 : 3600000),
      refresh_token: tokenData.refresh_token || session.refresh_token,
    }

    store.set('session', newSession)
    return newSession
  } catch (error) {
    store.delete('session')
    throw error
  }
})
ipcMain.handle('start-google-oauth', async (event) => {
  const oauthPort = await getFreePort()
  return new Promise((resolve, reject) => {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID || '',
      GOOGLE_CLIENT_SECRET || '',
      `http://localhost:${oauthPort}/oauth2callback`
    )

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
    })

    shell.openExternal(authUrl)

    // Start local server to capture callback
    const server = http.createServer(async (req, res) => {
      if (req.url?.startsWith('/oauth2callback')) {
        const query = url.parse(req.url, true).query
        const code = query.code as string

        const successHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Connexion réussie</title>
<style>
  body { margin:0; width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; background:#F4F9ED; }
  .container { text-align:center; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .logo { font-family: 'IBM Plex Mono', monospace; letter-spacing:0.25em; color:#3DAA4A; font-size:28px; margin-bottom:16px; }
  .icon { width:64px; height:64px; margin:0 auto 16px; }
  .title { font-size:24px; font-weight:600; color:#1C2B1E; margin:0; }
  .subtitle { font-size:14px; color:#6B6B6B; margin-top:8px; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">EDEN GARDEN</div>
    <div class="icon">
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="32" fill="#3DAA4A" />
        <path d="M20 34L28 42L44 26" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <h1 class="title">Connexion réussie</h1>
    <p class="subtitle">Vous pouvez fermer cette fenêtre.</p>
  </div>
  <script>setTimeout(() => window.close(), 2000)</script>
</body>
</html>`

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(successHtml)

        server.close()

        try {
          const { tokens } = await oauth2Client.getToken(code)
          oauth2Client.setCredentials(tokens)

          // Get user info
          const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
          const userInfo = await oauth2.userinfo.get()

          const session = {
            google_id: userInfo.data.id,
            email: userInfo.data.email,
            display_name: userInfo.data.name,
            avatar_url: userInfo.data.picture,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + (tokens.expiry_date ? tokens.expiry_date - Date.now() : 3600000)
          }

          resolve(session)
        } catch (error) {
          reject(error)
        }
      }
    })

    server.listen(oauthPort)
  })
})

app.whenReady().then(async () => {
  try {
    await createWindow()
    await startBackend()
  } catch (err) {
    console.error('Backend failed to start:', err)
    if (mainWindow) {
      const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Eden Garden - Backend indisponible</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0b1020;
        color: #e6edf6;
        font-family: Inter, Segoe UI, system-ui, sans-serif;
      }
      .card {
        width: min(92vw, 680px);
        background: #131a2e;
        border: 1px solid #2a3558;
        border-radius: 12px;
        padding: 24px;
      }
      h1 { margin: 0 0 10px; font-size: 20px; }
      p { margin: 0; opacity: 0.85; line-height: 1.5; }
      code {
        display: block;
        margin-top: 14px;
        padding: 10px 12px;
        background: #0a1222;
        border: 1px solid #263150;
        border-radius: 8px;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Le backend local n'a pas démarré</h1>
      <p>L'interface ne peut pas fonctionner sans backend. Redémarre l'application ou vérifie l'environnement Python.</p>
      <code>${String(err)}</code>
    </div>
  </body>
</html>`
      await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    }
  }

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
