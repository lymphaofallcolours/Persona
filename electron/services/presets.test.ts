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
const { loadConfig, saveConfig, getPresets, createPreset, updatePreset, deletePreset, duplicatePreset, reorderPresets, getGroups, createGroup, updateGroup, deleteGroup, getHotbarPresets, exportPresets, importPresets, getSessions, saveSession, getSession, updateSessionName, deleteSession } = await import('./presets')

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

describe('Export/Import', () => {
  beforeEach(() => {
    const configDir = join(tempDir, '.config', 'persona')
    rmSync(configDir, { recursive: true, force: true })
  })

  it('exports presets with stripped factory and hotbar fields', () => {
    const preset = createPreset('Voice A', '#ff0000', ['Calf EQ'])
    updatePreset(preset.id, { hotbarSlot: 3, volume: 0.8 })

    const data = exportPresets([preset.id])
    expect(data.version).toBe(1)
    expect(data.presets.length).toBe(1)
    expect(data.presets[0].isFactory).toBe(false)
    expect(data.presets[0].hotbarSlot).toBeUndefined()
    expect(data.presets[0].volume).toBe(0.8)
    expect(data.presets[0].name).toBe('Voice A')
    expect(data.exportedAt).toBeTruthy()
  })

  it('exports groups referenced by selected presets', () => {
    const group = createGroup('NPCs')
    const preset = createPreset('NPC Voice', '#000', [])
    updatePreset(preset.id, { groupId: group.id })

    const data = exportPresets([preset.id])
    expect(data.groups.length).toBe(1)
    expect(data.groups[0].name).toBe('NPCs')
  })

  it('imports presets with new IDs', () => {
    const preset = createPreset('Original', '#111', ['P1'])
    const data = exportPresets([preset.id])

    const beforeCount = getPresets().length
    const result = importPresets(data)

    expect(result.presetCount).toBe(1)
    expect(getPresets().length).toBe(beforeCount + 1)

    // Imported preset has different ID
    const imported = getPresets().find(p => p.name === 'Original' && p.id !== preset.id)
    expect(imported).toBeTruthy()
    expect(imported!.plugins).toEqual(['P1'])
  })

  it('remaps group IDs on import', () => {
    const group = createGroup('Villains')
    const preset = createPreset('Evil Voice', '#000', [])
    updatePreset(preset.id, { groupId: group.id })

    const data = exportPresets([preset.id])

    // Delete original group and preset
    deletePreset(preset.id)
    deleteGroup(group.id)

    const result = importPresets(data)
    expect(result.groupCount).toBe(1)

    // Imported group has new ID, preset references it
    const importedPreset = getPresets().find(p => p.name === 'Evil Voice')
    expect(importedPreset).toBeTruthy()
    expect(importedPreset!.groupId).toBeTruthy()
    expect(importedPreset!.groupId).not.toBe(group.id) // New ID

    const importedGroup = getGroups().find(g => g.name === 'Villains' && g.id !== group.id)
    expect(importedGroup).toBeTruthy()
    expect(importedPreset!.groupId).toBe(importedGroup!.id)
  })

  it('rejects invalid import data', () => {
    expect(() => importPresets({ version: 99, exportedAt: '', presets: [], groups: [] })).toThrow()
    expect(() => importPresets(null as any)).toThrow()
  })
})

describe('Sessions', () => {
  beforeEach(() => {
    const configDir = join(tempDir, '.config', 'persona')
    rmSync(configDir, { recursive: true, force: true })
  })

  it('starts with no sessions', () => {
    expect(getSessions()).toEqual([])
  })

  it('saves a session with current state', () => {
    const session = saveSession('Game Night', 'preset-123', 'group-456')
    expect(session.id).toBeTruthy()
    expect(session.name).toBe('Game Night')
    expect(session.activePresetId).toBe('preset-123')
    expect(session.selectedGroupId).toBe('group-456')
    expect(session.selectedInput).toBe('auto')
    expect(session.selectedOutput).toBe('auto')
    expect(session.createdAt).toBeTruthy()
  })

  it('persists sessions across loads', () => {
    saveSession('Test', null, null)
    expect(getSessions().length).toBe(1)
    expect(getSessions()[0].name).toBe('Test')
  })

  it('retrieves a session by id', () => {
    const session = saveSession('Find Me', 'p1', null)
    const found = getSession(session.id)
    expect(found?.name).toBe('Find Me')
  })

  it('updates a session name', () => {
    const session = saveSession('Old', null, null)
    const updated = updateSessionName(session.id, 'New')
    expect(updated?.name).toBe('New')
    expect(getSession(session.id)?.name).toBe('New')
  })

  it('deletes a session', () => {
    const session = saveSession('Delete Me', null, null)
    expect(deleteSession(session.id)).toBe(true)
    expect(getSessions().length).toBe(0)
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
