import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { Preset, PresetConfig, PresetGroup } from '../../src/types'

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

function migrateConfig(config: any): PresetConfig {
  if (config.version === 1) {
    config.version = 2
    config.groups = config.groups || []
  }
  if (!config.groups) {
    config.groups = []
  }
  return config as PresetConfig
}

export function loadConfig(): PresetConfig {
  ensureConfigDir()

  if (!existsSync(CONFIG_FILE)) {
    const factory = loadFactoryDefaults()
    writeFileSync(CONFIG_FILE, JSON.stringify(factory, null, 2))
    return factory
  }

  const raw = readFileSync(CONFIG_FILE, 'utf-8')
  const config = JSON.parse(raw)
  const migrated = migrateConfig(config)
  if (config.version !== migrated.version) {
    saveConfig(migrated)
  }
  return migrated
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

export function updatePreset(id: string, updates: Partial<Pick<Preset, 'name' | 'color' | 'plugins' | 'carxpPath' | 'groupId' | 'volume' | 'hotbarSlot' | 'parameterSnapshots'>>): Preset | undefined {
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

// --- Groups ---

export function getGroups(): PresetGroup[] {
  return loadConfig().groups
}

export function createGroup(name: string): PresetGroup {
  const config = loadConfig()
  const maxOrder = config.groups.reduce((max, g) => Math.max(max, g.order), -1)
  const group: PresetGroup = {
    id: uuidv4(),
    name,
    order: maxOrder + 1
  }
  config.groups.push(group)
  saveConfig(config)
  return group
}

export function updateGroup(id: string, name: string): PresetGroup | undefined {
  const config = loadConfig()
  const group = config.groups.find(g => g.id === id)
  if (!group) return undefined
  group.name = name
  saveConfig(config)
  return group
}

export function deleteGroup(id: string): boolean {
  const config = loadConfig()
  const index = config.groups.findIndex(g => g.id === id)
  if (index === -1) return false
  config.groups.splice(index, 1)
  // Ungroup presets that were in this group
  for (const preset of config.presets) {
    if (preset.groupId === id) {
      preset.groupId = undefined
    }
  }
  saveConfig(config)
  return true
}

export function reorderGroups(orderedIds: string[]): void {
  const config = loadConfig()
  const byId = new Map(config.groups.map(g => [g.id, g]))
  config.groups = orderedIds
    .map((id, i) => {
      const g = byId.get(id)
      if (g) g.order = i
      return g
    })
    .filter((g): g is PresetGroup => g !== undefined)
  saveConfig(config)
}

// --- Hotbar ---

export function getHotbarPresets(): Preset[] {
  return loadConfig().presets
    .filter(p => p.hotbarSlot !== undefined)
    .sort((a, b) => (a.hotbarSlot ?? 0) - (b.hotbarSlot ?? 0))
}
