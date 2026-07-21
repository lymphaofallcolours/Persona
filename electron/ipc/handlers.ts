import { ipcMain, BrowserWindow, dialog } from 'electron'
import { IPC } from './channels'
import * as presetStore from '../services/presets'
import * as pipewire from '../services/pipewire'
import * as devices from '../services/devices'
import * as carla from '../services/carla'
import * as carlaOsc from '../services/carlaOsc'
import * as setup from '../services/setup'
import * as voices from '../services/voices'
import { validateCarxp } from '../services/carxp'
import type { AudioLink } from '../services/pipewire'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { AppStatus, AudioDevice, Toast, ToastType, PersonaExport, SessionProfile } from '../../src/types'

let activePresetId: string | null = null
let activeLinks: AudioLink[] = []
let monitorLinks: AudioLink[] = []
let micMonitoring = false
let knownInputs: AudioDevice[] = []
let knownOutputs: AudioDevice[] = []
let carlaRunning = false
let carlaPlugins: string[] = []
let currentCarxpPath: string | undefined = undefined
let pollInterval: ReturnType<typeof setInterval> | null = null

function broadcast(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, data)
  }
}

function getStatus(): AppStatus {
  return {
    activePresetId,
    carlaRunning,
    carlaPlugins,
    linksActive: activeLinks.length,
    micMonitoring,
    oscConnected: carlaOsc.isConnected()
  }
}

function broadcastStatus(): void {
  const status = getStatus()
  broadcast(IPC.STATUS_CHANGED, status)
  // Also notify tray
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('__status-for-tray', status.activePresetId)
  }
}

export function sendToast(type: ToastType, message: string): void {
  const toast: Toast = { id: Date.now().toString(), type, message }
  broadcast(IPC.TOAST, toast)
}

async function resolveDevices(): Promise<{ inputDevice: string; outputDevice: string }> {
  const { input, output } = presetStore.getSelectedDevices()
  let inputDevice = input
  let outputDevice = output

  if (input === 'auto') {
    const defaultSource = await devices.getDefaultSource()
    if (defaultSource) inputDevice = defaultSource
  }
  if (output === 'auto') {
    const defaultSink = await devices.getDefaultSink()
    if (defaultSink) outputDevice = defaultSink
  }

  return { inputDevice, outputDevice }
}

async function pollDevices(): Promise<void> {
  try {
    const [inputs, outputs] = await Promise.all([
      devices.getInputDevices(),
      devices.getOutputDevices()
    ])

    const inputsChanged = JSON.stringify(inputs) !== JSON.stringify(knownInputs)
    const outputsChanged = JSON.stringify(outputs) !== JSON.stringify(knownOutputs)

    if (inputsChanged || outputsChanged) {
      const { input: selectedInput, output: selectedOutput } = presetStore.getSelectedDevices()

      if (selectedInput !== 'auto' && !inputs.some(d => d.name === selectedInput)) {
        sendToast('warning', `Input device disconnected: ${selectedInput}`)
      }
      if (selectedOutput !== 'auto' && !outputs.some(d => d.name === selectedOutput)) {
        sendToast('warning', `Output device disconnected: ${selectedOutput}`)
      }

      knownInputs = inputs
      knownOutputs = outputs
      broadcast(IPC.DEVICES_CHANGED, { inputs, outputs })
    }
  } catch {
    // PipeWire not available
  }
}

export async function activatePreset(id: string): Promise<void> {
  const preset = presetStore.getPreset(id)
  if (!preset) throw new Error(`Preset not found: ${id}`)

  // 1. Disconnect old active links
  if (activeLinks.length > 0) {
    await pipewire.disconnectBatch(activeLinks)
    activeLinks = []
  }

  const isOff = preset.name === 'Off' && !preset.carxpPath
  const hasCarxp = preset.carxpPath && existsSync(preset.carxpPath)
  const sameCarxp = preset.carxpPath === currentCarxpPath || (!preset.carxpPath && !currentCarxpPath)

  let carlaIn: { left: string; right: string } | null = null
  let carlaOut: { left: string; right: string } | null = null

  if (hasCarxp) {
    // 2a. Validate .carxp
    try {
      const validation = validateCarxp(preset.carxpPath!)
      if (!validation.hasPlugins) {
        sendToast('warning', 'No plugins found in .carxp file')
      }
      if (validation.hasPlugins && !validation.hasPatchbay) {
        sendToast('warning', 'No patchbay in .carxp — plugins may not be wired together. Save the project in Carla to fix this.')
      }
    } catch {
      sendToast('error', 'Failed to read .carxp file')
    }

    // 2b. Stop old Carla if different project
    const needsRestart = carlaRunning && !sameCarxp
    const needsStart = !carlaRunning

    if (needsRestart) {
      sendToast('info', 'Restarting Carla with new project file...')
      await carlaOsc.disconnect()
      await carla.stop()
      carlaRunning = false
      currentCarxpPath = undefined
    }

    if (needsStart || needsRestart) {
      // 2c. Snapshot PipeWire baseline before launch
      await devices.snapshotBaseline()

      // 2d. Launch Carla with .carxp
      const launched = carla.launch(preset.carxpPath)
      if (launched) {
        sendToast('info', 'Starting Carla...')
        currentCarxpPath = preset.carxpPath

        // 2e. Wait for ANY new PipeWire port (not just specific plugin names)
        const firstPort = await devices.waitForCarlaPort(15000)
        if (firstPort) {
          carlaPlugins = await devices.getCarlaPlugins()
          carlaRunning = true
        } else {
          sendToast('warning', 'Carla started but no PipeWire ports detected. Check that Carla\'s audio driver is set to JACK.')
        }

        // Connect OSC after Carla is ready
        try {
          carlaOsc.connect()
        } catch {
          sendToast('warning', 'OSC connection failed — parameter control unavailable')
        }
      } else {
        sendToast('error', 'Failed to launch Carla. Install it via: flatpak install studio.kx.carla')
      }
    }

    // 2f. Discover actual port names from PipeWire (dynamic, not from .carxp parsing)
    if (carlaRunning) {
      const routing = await devices.discoverCarlaRoutingPorts()
      carlaIn = routing.inputPorts
      carlaOut = routing.outputPorts

      if (!carlaIn || !carlaOut) {
        sendToast('warning', 'Could not discover Carla routing ports. Falling back to passthrough.')
      }
    }
  }

  // 3/4. Build and apply PipeWire links
  const { inputDevice, outputDevice } = await resolveDevices()
  const links = pipewire.buildPresetLinks(inputDevice, outputDevice, carlaIn, carlaOut, isOff)

  if (links.length > 0) {
    await pipewire.connectBatch(links)
  }

  activeLinks = links
  activePresetId = id

  // 5. Re-establish monitor links if monitoring is active
  if (micMonitoring) {
    const monLinks = pipewire.buildMonitorLinks(inputDevice, outputDevice)
    await pipewire.connectBatch(monLinks)
    monitorLinks = monLinks
  }

  // Apply per-preset volume via OSC
  if (preset.volume !== undefined && preset.volume !== 1.0 && carlaOsc.isConnected() && carlaPlugins.length > 0) {
    try {
      for (let i = 0; i < carlaPlugins.length; i++) {
        await carlaOsc.setVolume(i, preset.volume)
      }
    } catch {
      // Volume not applied — Carla defaults
    }
  }

  broadcastStatus()
}

export function registerIpcHandlers(): void {
  // --- Carla lifecycle ---

  carla.onEvents(
    (running, plugins) => {
      const changed = running !== carlaRunning || JSON.stringify(plugins) !== JSON.stringify(carlaPlugins)
      carlaRunning = running
      carlaPlugins = plugins
      if (changed) broadcastStatus()
    },
    () => {
      sendToast('error', 'Carla has crashed. Effects presets will not work until Carla is restarted.')
      carlaRunning = false
      carlaPlugins = []
      broadcastStatus()
    }
  )

  carla.startHealthPolling(devices.getCarlaPlugins)

  // --- Presets ---

  ipcMain.handle(IPC.PRESETS_GET_ALL, () => {
    return presetStore.getPresets()
  })

  ipcMain.handle(IPC.PRESET_ACTIVATE, async (_event, id: string) => {
    await activatePreset(id)
  })

  ipcMain.handle(IPC.PRESET_CREATE, (_event, name: string, color: string, carxpPath?: string) => {
    const preset = presetStore.createPreset(name, color)
    if (carxpPath) {
      presetStore.updatePreset(preset.id, { carxpPath })
      return { ...preset, carxpPath }
    }
    return preset
  })

  ipcMain.handle(IPC.PRESET_UPDATE, (_event, id: string, updates: Record<string, unknown>) => {
    return presetStore.updatePreset(id, updates)
  })

  ipcMain.handle(IPC.PRESET_DELETE, (_event, id: string) => {
    if (activePresetId === id) {
      activePresetId = null
      broadcastStatus()
    }
    return presetStore.deletePreset(id)
  })

  ipcMain.handle(IPC.PRESET_DUPLICATE, (_event, id: string) => {
    return presetStore.duplicatePreset(id)
  })

  ipcMain.handle(IPC.PRESET_REORDER, (_event, orderedIds: string[]) => {
    presetStore.reorderPresets(orderedIds)
  })

  ipcMain.handle(IPC.PRESET_EXPORT, async (_event, presetIds: string[]) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return false

    const data = presetStore.exportPresets(presetIds)
    const defaultName = data.presets.length === 1
      ? `${data.presets[0].name}.persona`
      : 'presets.persona'

    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: 'Persona Presets', extensions: ['persona'] }]
    })

    if (result.canceled || !result.filePath) return false
    writeFileSync(result.filePath, JSON.stringify(data, null, 2))
    sendToast('info', `Exported ${data.presets.length} preset${data.presets.length !== 1 ? 's' : ''}`)
    return true
  })

  ipcMain.handle(IPC.PRESET_IMPORT, async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Persona Presets', extensions: ['persona'] }]
    })

    if (result.canceled || result.filePaths.length === 0) return null

    try {
      const raw = readFileSync(result.filePaths[0], 'utf-8')
      const data = JSON.parse(raw) as PersonaExport
      const counts = presetStore.importPresets(data)
      sendToast('info', `Imported ${counts.presetCount} preset${counts.presetCount !== 1 ? 's' : ''}`)
      return counts
    } catch (err: any) {
      sendToast('error', `Import failed: ${err.message}`)
      return null
    }
  })

  // --- Groups ---

  ipcMain.handle(IPC.GROUP_GET_ALL, () => {
    return presetStore.getGroups()
  })

  ipcMain.handle(IPC.GROUP_CREATE, (_event, name: string) => {
    return presetStore.createGroup(name)
  })

  ipcMain.handle(IPC.GROUP_UPDATE, (_event, id: string, name: string) => {
    return presetStore.updateGroup(id, name)
  })

  ipcMain.handle(IPC.GROUP_DELETE, (_event, id: string) => {
    return presetStore.deleteGroup(id)
  })

  ipcMain.handle(IPC.GROUP_REORDER, (_event, orderedIds: string[]) => {
    presetStore.reorderGroups(orderedIds)
  })

  // --- Sessions ---

  ipcMain.handle(IPC.SESSION_GET_ALL, () => {
    return presetStore.getSessions()
  })

  ipcMain.handle(IPC.SESSION_SAVE, (_event, name: string, activePresetId: string | null, selectedGroupId: string | null) => {
    return presetStore.saveSession(name, activePresetId, selectedGroupId)
  })

  ipcMain.handle(IPC.SESSION_LOAD, async (_event, id: string) => {
    const session = presetStore.getSession(id)
    if (!session) return null

    presetStore.setSelectedDevices(session.selectedInput, session.selectedOutput)

    if (session.activePresetId) {
      try {
        await activatePreset(session.activePresetId)
      } catch {
        sendToast('warning', 'Session preset no longer exists')
      }
    }

    return session
  })

  ipcMain.handle(IPC.SESSION_UPDATE, (_event, id: string, name: string) => {
    return presetStore.updateSessionName(id, name)
  })

  ipcMain.handle(IPC.SESSION_DELETE, (_event, id: string) => {
    return presetStore.deleteSession(id)
  })

  // --- Devices ---

  ipcMain.handle(IPC.DEVICES_GET_INPUTS, async () => {
    knownInputs = await devices.getInputDevices()
    return knownInputs
  })

  ipcMain.handle(IPC.DEVICES_GET_OUTPUTS, async () => {
    knownOutputs = await devices.getOutputDevices()
    return knownOutputs
  })

  ipcMain.handle(IPC.DEVICES_GET_SELECTED, () => {
    return presetStore.getSelectedDevices()
  })

  ipcMain.handle(IPC.DEVICES_SET_SELECTED, (_event, input: string, output: string) => {
    presetStore.setSelectedDevices(input, output)
  })

  // --- Carla ---

  ipcMain.handle(IPC.CARLA_LAUNCH, (_event, projectFile?: string) => {
    const ok = carla.launch(projectFile)
    if (!ok) sendToast('error', 'Failed to launch Carla')
    return ok
  })

  ipcMain.handle(IPC.CARLA_STOP, async () => {
    await carla.stop()
  })

  ipcMain.handle(IPC.CARLA_IS_RUNNING, () => {
    return carla.isRunning()
  })

  ipcMain.handle(IPC.CARLA_SET_WINDOW_MODE, (_event, mode: string) => {
    carla.setWindowMode(mode as 'visible' | 'minimized' | 'no-gui')
  })

  ipcMain.handle(IPC.CARLA_GET_WINDOW_MODE, () => {
    return carla.getWindowMode()
  })

  // --- Mic Monitor ---

  ipcMain.handle(IPC.MIC_MONITOR_TOGGLE, async () => {
    const { inputDevice, outputDevice } = await resolveDevices()

    if (micMonitoring) {
      if (monitorLinks.length > 0) {
        await pipewire.disconnectBatch(monitorLinks)
        monitorLinks = []
      }
      micMonitoring = false
    } else {
      const links = pipewire.buildMonitorLinks(inputDevice, outputDevice)
      await pipewire.connectBatch(links)
      monitorLinks = links
      micMonitoring = true
    }

    broadcastStatus()
    return micMonitoring
  })

  ipcMain.handle(IPC.MIC_MONITOR_GET, () => {
    return micMonitoring
  })

  // --- Dialog ---

  ipcMain.handle(IPC.DIALOG_OPEN_FILE, async (_event, filters: { name: string; extensions: string[] }[]) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // --- OSC ---

  ipcMain.handle(IPC.OSC_CONNECT, (_event, port?: number) => {
    carlaOsc.connect(port)
    return true
  })

  ipcMain.handle(IPC.OSC_DISCONNECT, async () => {
    await carlaOsc.disconnect()
  })

  ipcMain.handle(IPC.OSC_IS_CONNECTED, () => {
    return carlaOsc.isConnected()
  })

  ipcMain.handle(IPC.OSC_SET_PARAMETER, async (_event, pluginId: number, paramIndex: number, value: number) => {
    await carlaOsc.setParameterValue(pluginId, paramIndex, value)
  })

  ipcMain.handle(IPC.OSC_SET_PLUGIN_ACTIVE, async (_event, pluginId: number, active: boolean) => {
    await carlaOsc.setPluginActive(pluginId, active)
  })

  ipcMain.handle(IPC.OSC_SET_DRYWET, async (_event, pluginId: number, value: number) => {
    await carlaOsc.setDryWet(pluginId, value)
  })

  ipcMain.handle(IPC.OSC_SET_VOLUME, async (_event, pluginId: number, value: number) => {
    await carlaOsc.setVolume(pluginId, value)
  })

  // --- Setup doctor ---

  ipcMain.handle(IPC.SETUP_RUN_CHECKS, async () => {
    return setup.runAllChecks()
  })

  ipcMain.handle(IPC.SETUP_APPLY_FIX, async (_event, checkId: string) => {
    // Engine config is read by Carla at startup — refuse to edit while running
    if (checkId === 'engine' && carla.isRunning()) {
      return { ok: false, message: 'Stop Carla before changing its engine settings.' }
    }
    const result = await setup.applyFix(checkId)
    sendToast(result.ok ? 'info' : 'error', result.message)
    return result
  })

  ipcMain.handle(IPC.ONBOARDING_GET, () => {
    return presetStore.getOnboardingComplete()
  })

  ipcMain.handle(IPC.ONBOARDING_SET, (_event, complete: boolean) => {
    presetStore.setOnboardingComplete(complete)
  })

  // --- Voice archetype generator ---

  ipcMain.handle(IPC.VOICES_GET_ARCHETYPES, () => {
    return voices.getArchetypes()
  })

  ipcMain.handle(IPC.VOICES_GENERATE, (_event, archetypeId: string, name: string) => {
    const { path, archetype } = voices.generateVoice(archetypeId, name)

    // Self-check: the generated project must pass the same validation used
    // during preset activation (plugins present + patchbay wired).
    const validation = validateCarxp(path)
    if (!validation.hasPlugins || !validation.hasPatchbay) {
      throw new Error('Generated voice project failed validation')
    }

    const preset = presetStore.createPreset(name, archetype.color)
    const updated = presetStore.updatePreset(preset.id, { carxpPath: path })
    sendToast('info', `Voice "${name}" created`)
    return updated ?? preset
  })

  // --- Status ---

  ipcMain.handle(IPC.STATUS_GET, (): AppStatus => {
    return getStatus()
  })

  // Start device polling
  pollInterval = setInterval(pollDevices, 3000)
  pollDevices()
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  carla.stopHealthPolling()
}
