import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import type { Preset } from '../src/types'
import * as presetStore from './services/presets'

let tray: Tray | null = null
let activateCallback: ((id: string) => void) | null = null
let showWindowCallback: (() => void) | null = null
let quitCallback: (() => void) | null = null

function buildTrayIcon(): Electron.NativeImage {
  // 16x16 simple icon — a filled circle
  const size = 16
  const canvas = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2
      const dy = y - size / 2
      const dist = Math.sqrt(dx * dx + dy * dy)
      const offset = (y * size + x) * 4
      if (dist < size / 2 - 1) {
        canvas[offset] = 200     // R
        canvas[offset + 1] = 200 // G
        canvas[offset + 2] = 200 // B
        canvas[offset + 3] = 255 // A
      }
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

export function createTray(callbacks: {
  onActivate: (id: string) => void
  onShowWindow: () => void
  onQuit: () => void
}): Tray {
  activateCallback = callbacks.onActivate
  showWindowCallback = callbacks.onShowWindow
  quitCallback = callbacks.onQuit

  tray = new Tray(buildTrayIcon())
  tray.setToolTip('Persona')

  tray.on('click', () => {
    showWindowCallback?.()
  })

  updateTrayMenu(null)
  return tray
}

export function updateTrayMenu(activePresetId: string | null): void {
  if (!tray) return

  const presets = presetStore.getPresets()
  const activePreset = presets.find(p => p.id === activePresetId)

  tray.setToolTip(activePreset ? `Persona — ${activePreset.name}` : 'Persona')

  const presetItems: Electron.MenuItemConstructorOptions[] = presets.map(p => ({
    label: p.name,
    type: 'radio' as const,
    checked: p.id === activePresetId,
    click: () => activateCallback?.(p.id)
  }))

  const menu = Menu.buildFromTemplate([
    ...presetItems,
    { type: 'separator' },
    { label: 'Open Persona', click: () => showWindowCallback?.() },
    { type: 'separator' },
    { label: 'Quit', click: () => quitCallback?.() }
  ])

  tray.setContextMenu(menu)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
