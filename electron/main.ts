import { app, BrowserWindow, ipcMain, globalShortcut, Notification } from 'electron'
import { join } from 'path'
import { registerIpcHandlers, stopPolling, activatePreset, disconnectAllLinks, sendToast } from './ipc/handlers'
import { createTray, updateTrayMenu, destroyTray } from './tray'
import * as presetStore from './services/presets'
import * as carla from './services/carla'
import * as carlaOsc from './services/carlaOsc'
import * as devicesService from './services/devices'
import * as virtualMic from './services/virtualMic'

// Explicit app name (dev mode otherwise runs as generic "chrome"/"Electron"):
// the tray StatusNotifierItem Id derives from it, and Zorin's panel drops
// items whose Id collides with an existing one (e.g. Discord's
// chrome_status_icon_1 in dev).
app.setName('Persona')

// Chromium GPU compositing on old Intel iGPUs under XWayland causes repaint
// storms that make OTHER windows flicker while Persona is open. The UI is a
// simple preset grid — software rendering is imperceptible and artifact-free.
app.disableHardwareAcceleration()

// Run natively on Wayland when the session is Wayland (falls back to X11
// otherwise). XWayland presentation on Mutter + old Intel makes neighboring
// windows shimmer even with software rendering — going native bypasses
// XWayland entirely. Tradeoff: global hotkeys can't be registered on native
// Wayland (detected below, user informed). Force the old behavior with:
//   ELECTRON_OZONE_PLATFORM_HINT=x11
app.commandLine.appendSwitch('ozone-platform-hint', 'auto')

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
    icon: join(__dirname, '../../resources/icons/256x256.png'),
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
      notifyHiddenToTray()
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

  // Register global hotkeys (Ctrl+1 through Ctrl+7 for hotbar slots)
  let hotkeysRegistered = 0
  for (let i = 1; i <= 7; i++) {
    const ok = globalShortcut.register(`CommandOrControl+${i}`, () => {
      const hotbar = presetStore.getHotbarPresets()
      const preset = hotbar.find(p => p.hotbarSlot === i)
      if (preset) {
        activatePreset(preset.id)
      }
    })
    if (ok) hotkeysRegistered++
  }
  // Native Wayland cannot grab global hotkeys — tell the user once instead of
  // failing silently (hotbar clicks, tray, and the mini panel still work).
  if (hotkeysRegistered === 0) {
    setTimeout(() => {
      sendToast('info', 'Global hotkeys (Ctrl+1-7) are unavailable on native Wayland. Use the hotbar or mini panel — or launch with ELECTRON_OZONE_PLATFORM_HINT=x11 to restore them.')
    }, 3000)
  }

  // Auto-launch Carla on startup
  const autoLaunchCarla = async () => {
    if (carla.isRunning()) return

    // Snapshot current PipeWire nodes so we can detect Carla plugins by diff
    await devicesService.snapshotBaseline()

    const launched = carla.launch()
    if (!launched) return

    // Wait for Carla plugins to appear in PipeWire, then connect OSC
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500))
      const plugins = await devicesService.getCarlaPlugins()
      if (plugins.length > 0) {
        try { carlaOsc.connect() } catch { /* OSC optional */ }
        return
      }
    }
    // Carla started but no plugins detected — OSC not connected
  }
  autoLaunchCarla()

  // Listen for mini panel toggle from renderer
  ipcMain.handle('mini-panel:toggle', () => {
    if (miniPanel && !miniPanel.isDestroyed()) {
      miniPanel.close()
    } else {
      createMiniPanel()
    }
  })

})

let trayNoticeShown = false

/**
 * Closing the window hides to tray while audio routing (presets, monitor)
 * stays fully active — which reads as "I closed it but still hear myself".
 * Tell the user once per session, via a system notification since the
 * in-app toast lives in the now-hidden window.
 */
function notifyHiddenToTray(): void {
  if (trayNoticeShown || !Notification.isSupported()) return
  trayNoticeShown = true
  new Notification({
    title: 'Persona is still running',
    body: 'Audio routing and monitoring stay active in the tray. Right-click the tray icon and choose Quit to stop everything.'
  }).show()
}

let cleanupStarted = false

app.on('before-quit', (event) => {
  isQuitting = true
  if (cleanupStarted) return
  cleanupStarted = true
  // Hold the quit until links are disconnected and Carla is down — otherwise
  // mic→output links outlive the app and keep monitoring the mic forever.
  event.preventDefault()
  globalShortcut.unregisterAll()
  stopPolling()
  destroyTray()
  Promise.allSettled([disconnectAllLinks(), virtualMic.destroy(), carla.stop()]).finally(() => app.exit(0))
})

app.on('window-all-closed', () => {
  // Don't quit — tray keeps the app alive
})

app.on('activate', () => {
  showMainWindow()
})
