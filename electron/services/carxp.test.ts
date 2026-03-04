import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseCarxpPlugins, getCarxpEndpoints } from './carxp'

const tempDir = mkdtempSync(join(tmpdir(), 'carxp-test-'))

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

const SAMPLE_CARXP = `<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE CARLA-PROJECT>
<CARLA-PROJECT VERSION='2.5'>
  <Plugin>
    <Info>
      <Type>LV2</Type>
      <Name>Calf Compressor</Name>
    </Info>
  </Plugin>
  <Plugin>
    <Info>
      <Type>LV2</Type>
      <Name>Calf EQ</Name>
    </Info>
  </Plugin>
  <Plugin>
    <Info>
      <Type>LV2</Type>
      <Name>Calf Reverb</Name>
    </Info>
  </Plugin>
</CARLA-PROJECT>`

const SINGLE_PLUGIN_CARXP = `<?xml version='1.0' encoding='UTF-8'?>
<CARLA-PROJECT VERSION='2.5'>
  <Plugin>
    <Info>
      <Type>LV2</Type>
      <Name>Calf Reverb</Name>
    </Info>
  </Plugin>
</CARLA-PROJECT>`

const EMPTY_CARXP = `<?xml version='1.0' encoding='UTF-8'?>
<CARLA-PROJECT VERSION='2.5'>
</CARLA-PROJECT>`

describe('parseCarxpPlugins', () => {
  it('extracts plugin names in order', () => {
    const file = join(tempDir, 'test.carxp')
    writeFileSync(file, SAMPLE_CARXP)
    const plugins = parseCarxpPlugins(file)
    expect(plugins).toEqual(['Calf Compressor', 'Calf EQ', 'Calf Reverb'])
  })

  it('returns single plugin', () => {
    const file = join(tempDir, 'single.carxp')
    writeFileSync(file, SINGLE_PLUGIN_CARXP)
    expect(parseCarxpPlugins(file)).toEqual(['Calf Reverb'])
  })

  it('returns empty array for no plugins', () => {
    const file = join(tempDir, 'empty.carxp')
    writeFileSync(file, EMPTY_CARXP)
    expect(parseCarxpPlugins(file)).toEqual([])
  })

  it('throws for missing file', () => {
    expect(() => parseCarxpPlugins('/nonexistent/file.carxp')).toThrow()
  })
})

describe('getCarxpEndpoints', () => {
  it('returns first and last plugin', () => {
    const file = join(tempDir, 'chain.carxp')
    writeFileSync(file, SAMPLE_CARXP)
    const endpoints = getCarxpEndpoints(file)
    expect(endpoints).toEqual({ first: 'Calf Compressor', last: 'Calf Reverb' })
  })

  it('returns same plugin for both when only one plugin', () => {
    const file = join(tempDir, 'single.carxp')
    writeFileSync(file, SINGLE_PLUGIN_CARXP)
    const endpoints = getCarxpEndpoints(file)
    expect(endpoints).toEqual({ first: 'Calf Reverb', last: 'Calf Reverb' })
  })

  it('returns null for empty project', () => {
    const file = join(tempDir, 'empty.carxp')
    writeFileSync(file, EMPTY_CARXP)
    expect(getCarxpEndpoints(file)).toBeNull()
  })
})
