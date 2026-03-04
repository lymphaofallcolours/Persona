import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// We need to mock the config paths before importing
const tempDir = mkdtempSync(join(tmpdir(), 'persona-test-'))

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => process.cwd()
  }
}))

// Mock the config directory to use temp dir
vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os')
  return {
    ...actual,
    homedir: () => tempDir
  }
})

// Now import after mocks are set up
const { loadConfig, saveConfig, getPresets, createPreset, deletePreset, duplicatePreset, reorderPresets } = await import('./presets')

describe('PresetStore', () => {
  beforeEach(() => {
    // Clean config dir between tests
    const configDir = join(tempDir, '.config', 'persona')
    rmSync(configDir, { recursive: true, force: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates default config from factory on first load', () => {
    const config = loadConfig()
    expect(config.version).toBe(1)
    expect(config.presets.length).toBeGreaterThan(0)
    expect(config.presets[0].name).toBe('Normal')
  })

  it('persists config to disk', () => {
    const config = loadConfig()
    config.selectedInput = 'test-mic'
    saveConfig(config)

    const reloaded = loadConfig()
    expect(reloaded.selectedInput).toBe('test-mic')
  })

  it('creates a new preset with UUID', () => {
    const preset = createPreset('Test Voice', '#ff0000', ['Plugin A'])
    expect(preset.id).toBeTruthy()
    expect(preset.name).toBe('Test Voice')
    expect(preset.color).toBe('#ff0000')
    expect(preset.plugins).toEqual(['Plugin A'])
    expect(preset.isFactory).toBe(false)
  })

  it('persists created presets', () => {
    createPreset('Persisted', '#00ff00', [])
    const presets = getPresets()
    expect(presets.some(p => p.name === 'Persisted')).toBe(true)
  })

  it('blocks deletion of factory presets', () => {
    const presets = getPresets()
    const factory = presets.find(p => p.isFactory)!
    const result = deletePreset(factory.id)
    expect(result).toBe(false)
    expect(getPresets().find(p => p.id === factory.id)).toBeTruthy()
  })

  it('deletes non-factory presets', () => {
    const preset = createPreset('Deletable', '#000', [])
    const result = deletePreset(preset.id)
    expect(result).toBe(true)
    expect(getPresets().find(p => p.id === preset.id)).toBeUndefined()
  })

  it('duplicates a preset with new ID and "(Copy)" suffix', () => {
    const original = createPreset('Original', '#111', ['P1', 'P2'])
    const copy = duplicatePreset(original.id)

    expect(copy).toBeTruthy()
    expect(copy!.id).not.toBe(original.id)
    expect(copy!.name).toBe('Original (Copy)')
    expect(copy!.plugins).toEqual(['P1', 'P2'])
    expect(copy!.isFactory).toBe(false)
  })

  it('reorders presets by ID list', () => {
    const presets = getPresets()
    const reversed = [...presets].reverse().map(p => p.id)
    reorderPresets(reversed)

    const reordered = getPresets()
    expect(reordered.map(p => p.id)).toEqual(reversed)
  })
})
