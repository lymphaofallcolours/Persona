import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { Preset, PresetConfig } from '../../src/types'

const CONFIG_DIR = join(homedir(), '.config', 'persona')
const CONFIG_FILE = join(CONFIG_DIR, 'presets.json')

function getFactoryPath(): string {
  // In dev: project root. In production: app resources.
  const appPath = app.isPackaged
    ? join(process.resourcesPath, 'presets', 'factory.json')
    : join(app.getAppPath(), 'presets', 'factory.json')
  return appPath
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

function loadFactoryDefaults(): PresetConfig {
  const raw = readFileSync(getFactoryPath(), 'utf-8')
  return JSON.parse(raw) as PresetConfig
}

export function loadConfig(): PresetConfig {
  ensureConfigDir()

  if (!existsSync(CONFIG_FILE)) {
    const factory = loadFactoryDefaults()
    writeFileSync(CONFIG_FILE, JSON.stringify(factory, null, 2))
    return factory
  }

  const raw = readFileSync(CONFIG_FILE, 'utf-8')
  return JSON.parse(raw) as PresetConfig
}

export function saveConfig(config: PresetConfig): void {
  ensureConfigDir()
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function getPresets(): Preset[] {
  return loadConfig().presets
}

export function getPreset(id: string): Preset | undefined {
  return loadConfig().presets.find(p => p.id === id)
}

export function createPreset(name: string, color: string, plugins: string[]): Preset {
  const config = loadConfig()
  const preset: Preset = {
    id: uuidv4(),
    name,
    color,
    plugins,
    isFactory: false
  }
  config.presets.push(preset)
  saveConfig(config)
  return preset
}

export function updatePreset(id: string, updates: Partial<Pick<Preset, 'name' | 'color' | 'plugins' | 'carxpPath'>>): Preset | undefined {
  const config = loadConfig()
  const index = config.presets.findIndex(p => p.id === id)
  if (index === -1) return undefined

  config.presets[index] = { ...config.presets[index], ...updates }
  saveConfig(config)
  return config.presets[index]
}

export function deletePreset(id: string): boolean {
  const config = loadConfig()
  const index = config.presets.findIndex(p => p.id === id)
  if (index === -1) return false
  if (config.presets[index].isFactory) return false

  config.presets.splice(index, 1)
  saveConfig(config)
  return true
}

export function duplicatePreset(id: string): Preset | undefined {
  const config = loadConfig()
  const source = config.presets.find(p => p.id === id)
  if (!source) return undefined

  const copy: Preset = {
    ...source,
    id: uuidv4(),
    name: `${source.name} (Copy)`,
    isFactory: false
  }
  config.presets.push(copy)
  saveConfig(config)
  return copy
}

export function reorderPresets(orderedIds: string[]): void {
  const config = loadConfig()
  const byId = new Map(config.presets.map(p => [p.id, p]))
  const reordered = orderedIds.map(id => byId.get(id)).filter((p): p is Preset => p !== undefined)
  config.presets = reordered
  saveConfig(config)
}

export function getSelectedDevices(): { input: string; output: string } {
  const config = loadConfig()
  return { input: config.selectedInput, output: config.selectedOutput }
}

export function setSelectedDevices(input: string, output: string): void {
  const config = loadConfig()
  config.selectedInput = input
  config.selectedOutput = output
  saveConfig(config)
}
