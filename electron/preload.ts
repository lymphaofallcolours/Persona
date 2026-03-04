import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from './ipc/channels'
import type {
  Preset, PresetGroup, AudioDevice, AppStatus, DeviceSelection, DeviceState, Toast, ParameterSnapshot
} from '../src/types'

export interface PersonaAPI {
  presets: {
    getAll(): Promise<Preset[]>
    activate(id: string): Promise<void>
    create(name: string, color: string, plugins: string[], carxpPath?: string): Promise<Preset>
    update(id: string, updates: Partial<Pick<Preset, 'name' | 'color' | 'plugins' | 'carxpPath' | 'groupId' | 'volume' | 'hotbarSlot' | 'parameterSnapshots'>>): Promise<Preset | undefined>
    delete(id: string): Promise<boolean>
    duplicate(id: string): Promise<Preset | undefined>
    reorder(orderedIds: string[]): Promise<void>
    export(ids: string[]): Promise<boolean>
    import(): Promise<{ presetCount: number; groupCount: number } | null>
  }
  groups: {
    getAll(): Promise<PresetGroup[]>
    create(name: string): Promise<PresetGroup>
    update(id: string, name: string): Promise<PresetGroup | undefined>
    delete(id: string): Promise<boolean>
    reorder(orderedIds: string[]): Promise<void>
  }
  devices: {
    getInputs(): Promise<AudioDevice[]>
    getOutputs(): Promise<AudioDevice[]>
    getSelected(): Promise<DeviceSelection>
    setSelected(input: string, output: string): Promise<void>
    onChange(callback: (state: { inputs: AudioDevice[]; outputs: AudioDevice[] }) => void): () => void
  }
  plugins: {
    getAvailable(): Promise<string[]>
  }
  carla: {
    launch(projectFile?: string): Promise<boolean>
    stop(): Promise<void>
    isRunning(): Promise<boolean>
  }
  status: {
    get(): Promise<AppStatus>
    onChange(callback: (status: AppStatus) => void): () => void
  }
  toast: {
    onShow(callback: (toast: Toast) => void): () => void
  }
  dialog: {
    openFile(filters: { name: string; extensions: string[] }[]): Promise<string | null>
  }
  micMonitor: {
    toggle(): Promise<boolean>
    isOn(): Promise<boolean>
  }
  osc: {
    connect(port?: number): Promise<boolean>
    disconnect(): Promise<void>
    isConnected(): Promise<boolean>
    setParameter(pluginId: number, paramIndex: number, value: number): Promise<void>
    setPluginActive(pluginId: number, active: boolean): Promise<void>
    setDryWet(pluginId: number, value: number): Promise<void>
    setVolume(pluginId: number, value: number): Promise<void>
    restoreSnapshot(snapshots: ParameterSnapshot[]): Promise<void>
  }
  miniPanel: {
    toggle(): Promise<void>
  }
}

const api: PersonaAPI = {
  presets: {
    getAll: () => ipcRenderer.invoke(IPC.PRESETS_GET_ALL),
    activate: (id) => ipcRenderer.invoke(IPC.PRESET_ACTIVATE, id),
    create: (name, color, plugins, carxpPath?) => ipcRenderer.invoke(IPC.PRESET_CREATE, name, color, plugins, carxpPath),
    update: (id, updates) => ipcRenderer.invoke(IPC.PRESET_UPDATE, id, updates),
    delete: (id) => ipcRenderer.invoke(IPC.PRESET_DELETE, id),
    duplicate: (id) => ipcRenderer.invoke(IPC.PRESET_DUPLICATE, id),
    reorder: (orderedIds) => ipcRenderer.invoke(IPC.PRESET_REORDER, orderedIds),
    export: (ids) => ipcRenderer.invoke(IPC.PRESET_EXPORT, ids),
    import: () => ipcRenderer.invoke(IPC.PRESET_IMPORT)
  },
  groups: {
    getAll: () => ipcRenderer.invoke(IPC.GROUP_GET_ALL),
    create: (name) => ipcRenderer.invoke(IPC.GROUP_CREATE, name),
    update: (id, name) => ipcRenderer.invoke(IPC.GROUP_UPDATE, id, name),
    delete: (id) => ipcRenderer.invoke(IPC.GROUP_DELETE, id),
    reorder: (orderedIds) => ipcRenderer.invoke(IPC.GROUP_REORDER, orderedIds)
  },
  devices: {
    getInputs: () => ipcRenderer.invoke(IPC.DEVICES_GET_INPUTS),
    getOutputs: () => ipcRenderer.invoke(IPC.DEVICES_GET_OUTPUTS),
    getSelected: () => ipcRenderer.invoke(IPC.DEVICES_GET_SELECTED),
    setSelected: (input, output) => ipcRenderer.invoke(IPC.DEVICES_SET_SELECTED, input, output),
    onChange: (callback) => {
      const handler = (_e: Electron.IpcRendererEvent, state: { inputs: AudioDevice[]; outputs: AudioDevice[] }) => callback(state)
      ipcRenderer.on(IPC.DEVICES_CHANGED, handler)
      return () => ipcRenderer.removeListener(IPC.DEVICES_CHANGED, handler)
    }
  },
  plugins: {
    getAvailable: () => ipcRenderer.invoke(IPC.PLUGINS_GET_AVAILABLE)
  },
  carla: {
    launch: (projectFile?) => ipcRenderer.invoke(IPC.CARLA_LAUNCH, projectFile),
    stop: () => ipcRenderer.invoke(IPC.CARLA_STOP),
    isRunning: () => ipcRenderer.invoke(IPC.CARLA_IS_RUNNING)
  },
  status: {
    get: () => ipcRenderer.invoke(IPC.STATUS_GET),
    onChange: (callback) => {
      const handler = (_e: Electron.IpcRendererEvent, status: AppStatus) => callback(status)
      ipcRenderer.on(IPC.STATUS_CHANGED, handler)
      return () => ipcRenderer.removeListener(IPC.STATUS_CHANGED, handler)
    }
  },
  toast: {
    onShow: (callback) => {
      const handler = (_e: Electron.IpcRendererEvent, toast: Toast) => callback(toast)
      ipcRenderer.on(IPC.TOAST, handler)
      return () => ipcRenderer.removeListener(IPC.TOAST, handler)
    }
  },
  dialog: {
    openFile: (filters) => ipcRenderer.invoke(IPC.DIALOG_OPEN_FILE, filters)
  },
  micMonitor: {
    toggle: () => ipcRenderer.invoke(IPC.MIC_MONITOR_TOGGLE),
    isOn: () => ipcRenderer.invoke(IPC.MIC_MONITOR_GET)
  },
  osc: {
    connect: (port?) => ipcRenderer.invoke(IPC.OSC_CONNECT, port),
    disconnect: () => ipcRenderer.invoke(IPC.OSC_DISCONNECT),
    isConnected: () => ipcRenderer.invoke(IPC.OSC_IS_CONNECTED),
    setParameter: (pluginId, paramIndex, value) => ipcRenderer.invoke(IPC.OSC_SET_PARAMETER, pluginId, paramIndex, value),
    setPluginActive: (pluginId, active) => ipcRenderer.invoke(IPC.OSC_SET_PLUGIN_ACTIVE, pluginId, active),
    setDryWet: (pluginId, value) => ipcRenderer.invoke(IPC.OSC_SET_DRYWET, pluginId, value),
    setVolume: (pluginId, value) => ipcRenderer.invoke(IPC.OSC_SET_VOLUME, pluginId, value),
    restoreSnapshot: (snapshots) => ipcRenderer.invoke(IPC.OSC_SNAPSHOT_RESTORE, snapshots)
  },
  miniPanel: {
    toggle: () => ipcRenderer.invoke('mini-panel:toggle')
  }
}

contextBridge.exposeInMainWorld('persona', api)
