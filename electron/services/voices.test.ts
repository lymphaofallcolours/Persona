import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getArchetypes, generateVoice } from './voices'
import { validateCarxp, parseCarxpPlugins } from './carxp'

const tempDir = mkdtempSync(join(tmpdir(), 'persona-voices-'))
let testDir: string
let dirCounter = 0

beforeEach(() => {
  testDir = join(tempDir, `case-${dirCounter++}`)
})

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('getArchetypes', () => {
  it('exposes all archetypes with UI fields', () => {
    const archetypes = getArchetypes()
    expect(archetypes.length).toBeGreaterThanOrEqual(4)
    for (const a of archetypes) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.description).toBeTruthy()
      expect(a.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(a.pluginNames.length).toBeGreaterThan(0)
    }
  })

  it('includes the expected archetype ids', () => {
    const ids = getArchetypes().map(a => a.id)
    for (const id of ['techpriest', 'demon', 'voxcaster', 'cavern']) {
      expect(ids).toContain(id)
    }
  })
})

describe('generateVoice', () => {
  it('writes a .carxp that passes activation validation', () => {
    for (const archetype of getArchetypes()) {
      const { path } = generateVoice(archetype.id, `Test ${archetype.name}`, testDir)
      const validation = validateCarxp(path)
      expect(validation.hasPlugins, `${archetype.id} has plugins`).toBe(true)
      expect(validation.hasPatchbay, `${archetype.id} has patchbay`).toBe(true)
      expect(validation.pluginNames).toEqual(archetype.pluginNames)
    }
  })

  it('wires the techpriest chain end to end', () => {
    const { path } = generateVoice('techpriest', 'Chain Test', testDir)
    const xml = readFileSync(path, 'utf-8')

    // Hardware in → first plugin
    expect(xml).toContain('<Source>Audio Input:Left</Source>')
    expect(xml).toMatch(/Audio Input:Left<\/Source>\s*<Target>Calf Compressor:In L<\/Target>/)
    expect(xml).toMatch(/Audio Input:Right<\/Source>\s*<Target>Calf Compressor:In R<\/Target>/)
    // Plugin → plugin (spot check one hop)
    expect(xml).toMatch(/Calf Compressor:Out L<\/Source>\s*<Target>Calf Equalizer 8 Band:In L<\/Target>/)
    // Last plugin → hardware out
    expect(xml).toMatch(/Calf Reverb:Out L<\/Source>\s*<Target>Audio Output:Left<\/Target>/)
    expect(xml).toMatch(/Calf Reverb:Out R<\/Source>\s*<Target>Audio Output:Right<\/Target>/)
  })

  it('fans mono plugins in and out (demon pitchshifter)', () => {
    const { path } = generateVoice('demon', 'Mono Test', testDir)
    const xml = readFileSync(path, 'utf-8')

    // Both hardware channels feed the mono input
    expect(xml).toMatch(/Audio Input:Left<\/Source>\s*<Target>AM pitchshifter:Input<\/Target>/)
    expect(xml).toMatch(/Audio Input:Right<\/Source>\s*<Target>AM pitchshifter:Input<\/Target>/)
    // Mono output feeds both stereo inputs of the next plugin
    expect(xml).toMatch(/AM pitchshifter:Output<\/Source>\s*<Target>Calf Saturator:In L<\/Target>/)
    expect(xml).toMatch(/AM pitchshifter:Output<\/Source>\s*<Target>Calf Saturator:In R<\/Target>/)
  })

  it('emits parameters with index, name, symbol and value', () => {
    const { path } = generateVoice('techpriest', 'Param Test', testDir)
    const xml = readFileSync(path, 'utf-8')

    expect(xml).toContain('<Symbol>mod_freq</Symbol>')
    expect(xml).toMatch(/<Symbol>mod_freq<\/Symbol>\s*<Value>150<\/Value>/)
    expect(xml).toMatch(/<Index>7<\/Index>\s*<Name>Ratio<\/Name>\s*<Symbol>ratio<\/Symbol>\s*<Value>8<\/Value>/)
  })

  it('parses plugin order matching the chain', () => {
    const { path } = generateVoice('demon', 'Order Test', testDir)
    expect(parseCarxpPlugins(path)).toEqual(['AM pitchshifter', 'Calf Saturator', 'Calf Reverb'])
  })

  it('deduplicates file names instead of overwriting', () => {
    const first = generateVoice('cavern', 'My Voice', testDir)
    const second = generateVoice('cavern', 'My Voice', testDir)
    expect(first.path).not.toBe(second.path)
    expect(second.path).toContain('my-voice-2')
  })

  it('slugifies awkward names safely', () => {
    const { path } = generateVoice('demon', '  Grukk / The:: Devourer!  ', testDir)
    expect(path).toMatch(/grukk-the-devourer\.carxp$/)
  })

  it('throws for unknown archetypes', () => {
    expect(() => generateVoice('nope', 'X', testDir)).toThrow(/Unknown voice archetype/)
  })
})
