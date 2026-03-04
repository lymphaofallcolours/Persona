import { describe, it, expect } from 'vitest'
import { buildPresetLinks, buildMonitorLinks } from './pipewire'

const MIC = 'alsa_input.test-mic'
const SINK = 'alsa_output.test-headphones'

describe('buildPresetLinks', () => {
  it('returns empty array for Off preset', () => {
    const links = buildPresetLinks(MIC, SINK, null, true)
    expect(links).toEqual([])
  })

  it('creates direct passthrough when no endpoints (no .carxp)', () => {
    const links = buildPresetLinks(MIC, SINK, null, false)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: `${SINK}:playback_FL` },
      { source: `${MIC}:capture_FR`, destination: `${SINK}:playback_FR` }
    ])
  })

  it('routes mic→first and last→output for single plugin', () => {
    const endpoints = { first: 'Calf Reverb', last: 'Calf Reverb' }
    const links = buildPresetLinks(MIC, SINK, endpoints, false)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: 'Calf Reverb:In L' },
      { source: `${MIC}:capture_FR`, destination: 'Calf Reverb:In R' },
      { source: 'Calf Reverb:Out L', destination: `${SINK}:playback_FL` },
      { source: 'Calf Reverb:Out R', destination: `${SINK}:playback_FR` }
    ])
  })

  it('routes mic→first and last→output for multi-plugin chain', () => {
    // Carla handles Compressor→EQ→Reverb internally
    const endpoints = { first: 'Calf Compressor', last: 'Calf Reverb' }
    const links = buildPresetLinks(MIC, SINK, endpoints, false)

    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: 'Calf Compressor:In L' },
      { source: `${MIC}:capture_FR`, destination: 'Calf Compressor:In R' },
      { source: 'Calf Reverb:Out L', destination: `${SINK}:playback_FL` },
      { source: 'Calf Reverb:Out R', destination: `${SINK}:playback_FR` }
    ])
  })

  it('generates exactly 4 links for any endpoint pair (stereo in + stereo out)', () => {
    const endpoints = { first: 'Plugin A', last: 'Plugin B' }
    const links = buildPresetLinks(MIC, SINK, endpoints, false)
    expect(links).toHaveLength(4)
  })
})

describe('buildMonitorLinks', () => {
  it('creates direct mic-to-output stereo pair', () => {
    const links = buildMonitorLinks(MIC, SINK)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: `${SINK}:playback_FL` },
      { source: `${MIC}:capture_FR`, destination: `${SINK}:playback_FR` }
    ])
  })

  it('returns exactly 2 links (stereo pair)', () => {
    const links = buildMonitorLinks(MIC, SINK)
    expect(links).toHaveLength(2)
  })
})
