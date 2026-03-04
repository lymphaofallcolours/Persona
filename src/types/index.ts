export interface Preset {
  id: string
  name: string
  color: string
  plugins: string[]
  carxpPath?: string
  isFactory: boolean
}

export interface AudioDevice {
  name: string
  description: string
  ports: string[]
  type: 'input' | 'output'
}

export interface AppStatus {
  activePresetId: string | null
  carlaRunning: boolean
  carlaPlugins: string[]
  linksActive: number
}

export interface PresetConfig {
  version: number
  selectedInput: string
  selectedOutput: string
  presets: Preset[]
}

export interface DeviceSelection {
  input: string
  output: string
}

export interface DeviceState {
  inputs: AudioDevice[]
  outputs: AudioDevice[]
  selected: DeviceSelection
}

export type ToastType = 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}
