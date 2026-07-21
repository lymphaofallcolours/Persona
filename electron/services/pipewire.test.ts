import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

import { execFile } from 'child_process'
import { buildPresetLinks, buildMonitorLinks, buildVirtualMicMonitorLinks, disconnectStaleDeviceLinks } from './pipewire'

const mockExecFile = vi.mocked(execFile)

const MIC = 'alsa_input.test-mic'
const SINK = 'alsa_output.test-headphones'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('disconnectStaleDeviceLinks', () => {
  // Realistic pw-link -l output: each port lists peers in both directions
  const LINK_OUTPUT = [
    'alsa_output.pci-0000.analog-stereo:playback_FL',
    '  |<- speech-dispatcher-dummy:output_FL',
    '  |<- alsa_input.pci-0000.analog-stereo:capture_FL',
    'alsa_input.pci-0000.analog-stereo:capture_FL',
    '  |-> alsa_output.pci-0000.analog-stereo:playback_FL',
    'alsa_input.pci-0000.analog-stereo:capture_FR',
    '  |-> alsa_output.pci-0000.analog-stereo:playback_FR',
    'speech-dispatcher-dummy:output_FL',
    '  |-> discord_capture:input_FL',
    'alsa_input.usb-mic:capture_FL',
    '  |-> Calf Compressor:In L'
  ].join('\n')

  function calls(): string[][] {
    return mockExecFile.mock.calls.map(c => c[1] as string[])
  }

  it('disconnects only direct mic→output links, leaving streams and Carla links alone', async () => {
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, callback: any) => {
      callback(null, (args as string[])[0] === '-l' ? LINK_OUTPUT : '')
      return {} as any
    })

    const removed = await disconnectStaleDeviceLinks()
    expect(removed).toBe(2)

    const disconnects = calls().filter(args => args[0] === '-d')
    expect(disconnects).toEqual([
      ['-d', 'alsa_input.pci-0000.analog-stereo:capture_FL', 'alsa_output.pci-0000.analog-stereo:playback_FL'],
      ['-d', 'alsa_input.pci-0000.analog-stereo:capture_FR', 'alsa_output.pci-0000.analog-stereo:playback_FR']
    ])
  })

  it('sweeps stale virtual-mic links too', async () => {
    const output = [
      'alsa_input.usb-mic:capture_FL',
      '  |-> persona_virtual_mic:playback_FL',
      'persona_virtual_mic:monitor_FL',
      '  |-> alsa_output.pci-0000.analog-stereo:playback_FL'
    ].join('\n')
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, callback: any) => {
      callback(null, (args as string[])[0] === '-l' ? output : '')
      return {} as any
    })

    expect(await disconnectStaleDeviceLinks()).toBe(2)
  })

  it('does nothing when no direct device links exist', async () => {
    mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, callback: any) => {
      callback(null, (args as string[])[0] === '-l' ? 'speech-dispatcher-dummy:output_FL\n  |-> discord_capture:input_FL\n' : '')
      return {} as any
    })

    const removed = await disconnectStaleDeviceLinks()
    expect(removed).toBe(0)
    expect(calls().filter(args => args[0] === '-d')).toHaveLength(0)
  })
})

describe('buildVirtualMicMonitorLinks', () => {
  it('routes the virtual mic monitor (processed voice) to a physical output', () => {
    expect(buildVirtualMicMonitorLinks('persona_virtual_mic', SINK)).toEqual([
      { source: 'persona_virtual_mic:monitor_FL', destination: `${SINK}:playback_FL` },
      { source: 'persona_virtual_mic:monitor_FR', destination: `${SINK}:playback_FR` }
    ])
  })
})

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
