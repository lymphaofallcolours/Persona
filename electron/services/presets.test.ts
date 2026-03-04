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
const { loadConfig, saveConfig, getPresets, createPreset, updatePreset, deletePreset, duplicatePreset, reorderPresets, getGroups, createGroup, updateGroup, deleteGroup, getHotbarPresets } = await import('./presets')

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
    expect(config.version).toBe(2)
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

describe('Groups', () => {
  beforeEach(() => {
    const configDir = join(tempDir, '.config', 'persona')
    rmSync(configDir, { recursive: true, force: true })
  })

  it('starts with factory-core group', () => {
    const groups = getGroups()
    expect(groups.length).toBe(1)
    expect(groups[0].name).toBe('Core')
  })

  it('creates a new group', () => {
    const group = createGroup('NPCs')
    expect(group.name).toBe('NPCs')
    expect(group.id).toBeTruthy()
    expect(getGroups().length).toBe(2)
  })

  it('updates a group name', () => {
    const group = createGroup('Old Name')
    const updated = updateGroup(group.id, 'New Name')
    expect(updated?.name).toBe('New Name')
  })

  it('deletes a group and ungroups its presets', () => {
    const group = createGroup('Temp')
    const preset = createPreset('Test', '#000', [])
    updatePreset(preset.id, { groupId: group.id })

    deleteGroup(group.id)
    expect(getGroups().find(g => g.id === group.id)).toBeUndefined()

    const updatedPreset = getPresets().find(p => p.id === preset.id)
    expect(updatedPreset?.groupId).toBeUndefined()
  })
})

describe('Hotbar', () => {
  beforeEach(() => {
    const configDir = join(tempDir, '.config', 'persona')
    rmSync(configDir, { recursive: true, force: true })
  })

  it('returns empty when no presets have hotbar slots', () => {
    expect(getHotbarPresets()).toEqual([])
  })

  it('returns presets sorted by hotbar slot', () => {
    const p1 = createPreset('A', '#000', [])
    const p2 = createPreset('B', '#000', [])
    updatePreset(p2.id, { hotbarSlot: 1 })
    updatePreset(p1.id, { hotbarSlot: 3 })

    const hotbar = getHotbarPresets()
    expect(hotbar.length).toBe(2)
    expect(hotbar[0].hotbarSlot).toBe(1)
    expect(hotbar[1].hotbarSlot).toBe(3)
  })
})

describe('Migration', () => {
  beforeEach(() => {
    const configDir = join(tempDir, '.config', 'persona')
    rmSync(configDir, { recursive: true, force: true })
  })

  it('migrates v1 config to v2', () => {
    const configDir = join(tempDir, '.config', 'persona')
    mkdirSync(configDir, { recursive: true })
    writeFileSync(join(configDir, 'presets.json'), JSON.stringify({
      version: 1,
      selectedInput: 'auto',
      selectedOutput: 'auto',
      presets: [
        { id: 'test', name: 'Test', color: '#000', plugins: [], isFactory: false }
      ]
    }))

    const config = loadConfig()
    expect(config.version).toBe(2)
    expect(config.groups).toEqual([])
    expect(config.presets.length).toBe(1)
  })
})
