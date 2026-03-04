import { describe, it, expect } from 'vitest'
import { buildPresetLinks, buildMonitorLinks } from './pipewire'

const MIC = 'alsa_input.test-mic'
const SINK = 'alsa_output.test-headphones'

describe('buildPresetLinks', () => {
  it('returns empty array for Off preset', () => {
    const links = buildPresetLinks(MIC, SINK, null, null, true)
    expect(links).toEqual([])
  })

  it('creates direct passthrough when no Carla ports', () => {
    const links = buildPresetLinks(MIC, SINK, null, null, false)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: `${SINK}:playback_FL` },
      { source: `${MIC}:capture_FR`, destination: `${SINK}:playback_FR` }
    ])
  })

  it('creates passthrough when only carlaIn is null', () => {
    const carlaOut = { left: 'Calf Reverb:Out L', right: 'Calf Reverb:Out R' }
    const links = buildPresetLinks(MIC, SINK, null, carlaOut, false)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: `${SINK}:playback_FL` },
      { source: `${MIC}:capture_FR`, destination: `${SINK}:playback_FR` }
    ])
  })

  it('routes through Carla with individual plugin ports', () => {
    const carlaIn = { left: 'Calf Compressor:In L', right: 'Calf Compressor:In R' }
    const carlaOut = { left: 'Calf Reverb:Out L', right: 'Calf Reverb:Out R' }
    const links = buildPresetLinks(MIC, SINK, carlaIn, carlaOut, false)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: 'Calf Compressor:In L' },
      { source: `${MIC}:capture_FR`, destination: 'Calf Compressor:In R' },
      { source: 'Calf Reverb:Out L', destination: `${SINK}:playback_FL` },
      { source: 'Calf Reverb:Out R', destination: `${SINK}:playback_FR` }
    ])
  })

  it('routes through single Carla node ports', () => {
    const carlaIn = { left: 'Carla:audio-in1', right: 'Carla:audio-in2' }
    const carlaOut = { left: 'Carla:audio-out1', right: 'Carla:audio-out2' }
    const links = buildPresetLinks(MIC, SINK, carlaIn, carlaOut, false)
    expect(links).toEqual([
      { source: `${MIC}:capture_FL`, destination: 'Carla:audio-in1' },
      { source: `${MIC}:capture_FR`, destination: 'Carla:audio-in2' },
      { source: 'Carla:audio-out1', destination: `${SINK}:playback_FL` },
      { source: 'Carla:audio-out2', destination: `${SINK}:playback_FR` }
    ])
  })

  it('generates exactly 4 links for any port pair (stereo in + stereo out)', () => {
    const carlaIn = { left: 'Plugin A:In L', right: 'Plugin A:In R' }
    const carlaOut = { left: 'Plugin B:Out L', right: 'Plugin B:Out R' }
    const links = buildPresetLinks(MIC, SINK, carlaIn, carlaOut, false)
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
