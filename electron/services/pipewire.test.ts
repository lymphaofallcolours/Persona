import { describe, it, expect } from 'vitest'
import { buildPresetLinks } from './pipewire'

const MIC = 'alsa_input.test-mic'
const SINK = 'alsa_output.test-headphones'

describe('buildPresetLinks', () => {
  it('returns empty array for Off preset', () => {
    const links = buildPresetLinks(MIC, SINK, [], true)
    expect(links).toEqual([])
  })

  it('creates direct passthrough for empty plugin list (Normal)', () => {
    const links = buildPresetLinks(MIC, SINK, [], false)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: `${SINK}:playback_FL` },
      { source: `${MIC}:capture_FR`, destination: `${SINK}:playback_FR` }
    ])
  })

  it('creates full chain for single plugin', () => {
    const links = buildPresetLinks(MIC, SINK, ['Calf Reverb'], false)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: 'Calf Reverb:In L' },
      { source: `${MIC}:capture_FR`, destination: 'Calf Reverb:In R' },
      { source: 'Calf Reverb:Out L', destination: `${SINK}:playback_FL` },
      { source: 'Calf Reverb:Out R', destination: `${SINK}:playback_FR` }
    ])
  })

  it('chains multiple plugins in order', () => {
    const plugins = ['Calf Compressor', 'Calf EQ', 'Calf Reverb']
    const links = buildPresetLinks(MIC, SINK, plugins, false)

    expect(links).toEqual([
      // Mic → first plugin
      { source: `${MIC}:capture_FL`, destination: 'Calf Compressor:In L' },
      { source: `${MIC}:capture_FR`, destination: 'Calf Compressor:In R' },
      // Plugin chain
      { source: 'Calf Compressor:Out L', destination: 'Calf EQ:In L' },
      { source: 'Calf Compressor:Out R', destination: 'Calf EQ:In R' },
      { source: 'Calf EQ:Out L', destination: 'Calf Reverb:In L' },
      { source: 'Calf EQ:Out R', destination: 'Calf Reverb:In R' },
      // Last plugin → output
      { source: 'Calf Reverb:Out L', destination: `${SINK}:playback_FL` },
      { source: 'Calf Reverb:Out R', destination: `${SINK}:playback_FR` }
    ])
  })

  it('generates stereo pairs for every connection', () => {
    const links = buildPresetLinks(MIC, SINK, ['Plugin A', 'Plugin B'], false)
    // mic→A (2 stereo) + A→B (2 stereo) + B→sink (2 stereo) = 6
    expect(links.length).toBe(6)
    // Every pair should have matching L/R
    expect(links.filter(l => l.source.includes('L') || l.destination.includes('L')).length).toBe(3)
    expect(links.filter(l => l.source.includes('R') || l.destination.includes('R')).length).toBe(3)
  })
})
