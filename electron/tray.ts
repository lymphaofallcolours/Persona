import { Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import * as presetStore from './services/presets'

let tray: Tray | null = null
let activateCallback: ((id: string) => void) | null = null
let showWindowCallback: (() => void) | null = null
let quitCallback: (() => void) | null = null

function getIconPath(): string {
  return join(__dirname, '../../resources/icons/persona.svg')
}

export function createTray(callbacks: {
  onActivate: (id: string) => void
  onShowWindow: () => void
  onQuit: () => void
}): Tray {
  activateCallback = callbacks.onActivate
  showWindowCallback = callbacks.onShowWindow
  quitCallback = callbacks.onQuit

  tray = new Tray(nativeImage.createFromPath(getIconPath()))
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
