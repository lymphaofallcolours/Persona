export interface ParameterValue {
  index: number
  name: string
  value: number
}

export interface ParameterSnapshot {
  pluginId: number
  pluginName: string
  parameters: ParameterValue[]
}

export interface PluginInfo {
  id: number
  name: string
  active: boolean
  parameterCount: number
}

export interface ParameterInfo {
  index: number
  name: string
  value: number
  min: number
  max: number
  defaultValue: number
}

export interface Preset {
  id: string
  name: string
  color: string
  plugins: string[]
  carxpPath?: string
  parameterSnapshots?: ParameterSnapshot[]
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
  micMonitoring: boolean
  oscConnected: boolean
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
