import { Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import * as presetStore from './services/presets'

let tray: Tray | null = null
let activateCallback: ((id: string) => void) | null = null
let showWindowCallback: (() => void) | null = null
let quitCallback: (() => void) | null = null

function getIconPath(): string {
  // Must be a PNG — nativeImage cannot decode SVG, which yields an empty
  // (invisible) tray icon on Linux.
  return join(__dirname, '../../resources/icons/32x32.png')
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
  const groups = presetStore.getGroups()
  const activePreset = presets.find(p => p.id === activePresetId)

  tray.setToolTip(activePreset ? `Persona — ${activePreset.name}` : 'Persona')

  const items: Electron.MenuItemConstructorOptions[] = []

  // Hotbar presets at top with Ctrl+N shortcut hints
  const hotbar = presetStore.getHotbarPresets()
  if (hotbar.length > 0) {
    for (const p of hotbar) {
      items.push({
        label: `${p.name}`,
        accelerator: `CommandOrControl+${p.hotbarSlot}`,
        type: 'radio' as const,
        checked: p.id === activePresetId,
        click: () => activateCallback?.(p.id)
      })
    }
    items.push({ type: 'separator' })
  }

  // Group presets by group (sorted), then ungrouped
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)
  const hotbarIds = new Set(hotbar.map(p => p.id))

  for (const group of sortedGroups) {
    const groupPresets = presets.filter(p => p.groupId === group.id && !hotbarIds.has(p.id))
    if (groupPresets.length === 0) continue

    items.push({
      label: group.name,
      submenu: groupPresets.map(p => ({
        label: p.name,
        type: 'radio' as const,
        checked: p.id === activePresetId,
        click: () => activateCallback?.(p.id)
      }))
    })
  }

  // Ungrouped presets not in hotbar
  const ungrouped = presets.filter(p => !p.groupId && !hotbarIds.has(p.id))
  if (ungrouped.length > 0) {
    for (const p of ungrouped) {
      items.push({
        label: p.name,
        type: 'radio' as const,
        checked: p.id === activePresetId,
        click: () => activateCallback?.(p.id)
      })
    }
  }

  const menu = Menu.buildFromTemplate([
    ...items,
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
