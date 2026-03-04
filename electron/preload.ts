import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from './ipc/channels'
import type {
  Preset, AudioDevice, AppStatus, DeviceSelection, DeviceState, Toast
} from '../src/types'

export interface PersonaAPI {
  presets: {
    getAll(): Promise<Preset[]>
    activate(id: string): Promise<void>
    create(name: string, color: string, plugins: string[]): Promise<Preset>
    update(id: string, updates: Partial<Pick<Preset, 'name' | 'color' | 'plugins' | 'carxpPath'>>): Promise<Preset | undefined>
    delete(id: string): Promise<boolean>
    duplicate(id: string): Promise<Preset | undefined>
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
  status: {
    get(): Promise<AppStatus>
    onChange(callback: (status: AppStatus) => void): () => void
  }
  toast: {
    onShow(callback: (toast: Toast) => void): () => void
  }
}

const api: PersonaAPI = {
  presets: {
    getAll: () => ipcRenderer.invoke(IPC.PRESETS_GET_ALL),
    activate: (id) => ipcRenderer.invoke(IPC.PRESET_ACTIVATE, id),
    create: (name, color, plugins) => ipcRenderer.invoke(IPC.PRESET_CREATE, name, color, plugins),
    update: (id, updates) => ipcRenderer.invoke(IPC.PRESET_UPDATE, id, updates),
    delete: (id) => ipcRenderer.invoke(IPC.PRESET_DELETE, id),
    duplicate: (id) => ipcRenderer.invoke(IPC.PRESET_DUPLICATE, id),
    reorder: (orderedIds) => ipcRenderer.invoke(IPC.PRESET_REORDER, orderedIds)
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
  }
}

contextBridge.exposeInMainWorld('persona', api)
