import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { registerIpcHandlers, stopPolling, activatePreset } from './ipc/handlers'
import { createTray, updateTrayMenu, destroyTray } from './tray'

let mainWindow: BrowserWindow | null = null
let miniPanel: BrowserWindow | null = null
let isQuitting = false

function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 680,
    minWidth: 360,
    minHeight: 480,
    title: 'Persona',
    icon: join(__dirname, '../../resources/icons/persona.svg'),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Close-to-tray: hide instead of quit
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function createMiniPanel(): BrowserWindow {
  if (miniPanel && !miniPanel.isDestroyed()) {
    miniPanel.show()
    miniPanel.focus()
    return miniPanel
  }

  miniPanel = new BrowserWindow({
    width: 220,
    height: 360,
    minWidth: 160,
    minHeight: 200,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    resizable: true,
    skipTaskbar: true,
    title: 'Persona — Mini',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Load same renderer but with ?mini query param for mini mode
  if (process.env.ELECTRON_RENDERER_URL) {
    miniPanel.loadURL(`${process.env.ELECTRON_RENDERER_URL}?mini=true`)
  } else {
    miniPanel.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { mini: 'true' }
    })
  }

  miniPanel.on('closed', () => {
    miniPanel = null
  })

  return miniPanel
}

function showMainWindow(): void {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createMainWindow()
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createMainWindow()

  createTray({
    onActivate: (id) => {
      activatePreset(id)
    },
    onShowWindow: showMainWindow,
    onQuit: () => {
      isQuitting = true
      app.quit()
    }
  })

  // Update tray when status changes
  ipcMain.on('__status-for-tray', (_e, activePresetId: string | null) => {
    updateTrayMenu(activePresetId)
  })

  // Listen for mini panel toggle from renderer
  ipcMain.handle('mini-panel:toggle', () => {
    if (miniPanel && !miniPanel.isDestroyed()) {
      miniPanel.close()
    } else {
      createMiniPanel()
    }
  })

})

app.on('before-quit', () => {
  isQuitting = true
  stopPolling()
  destroyTray()
})

app.on('window-all-closed', () => {
  // Don't quit — tray keeps the app alive
})

app.on('activate', () => {
  showMainWindow()
})
