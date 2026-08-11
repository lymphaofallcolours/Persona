import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

import { execFile } from 'child_process'
import {
  parseStaleModuleIds, parseCaptureStreams, classifyCapture,
  create, destroy, isActive, adoptDefaultSource, adoptCaptureStreams,
  releaseAdoption, getSavedDefaultSource, VIRTUAL_MIC_NAME
} from './virtualMic'

const mockExecFile = vi.mocked(execFile)

function mockPactl(handler: (args: string[]) => string | Error) {
  mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, callback: any) => {
    const result = handler(args as string[])
    if (result instanceof Error) callback(result, '', 'err')
    else callback(null, result, '')
    return {} as any
  })
}

function calls(): string[][] {
  return mockExecFile.mock.calls.map(c => c[1] as string[])
}

const SHORT_SOURCES = [
  '53\talsa_input.pci-0000.analog-stereo\tPipeWire\ts16le',
  '160\tpersona_virtual_mic\tPipeWire\tfloat32le',
  '161\talsa_output.pci-0000.analog-stereo.monitor\tPipeWire\ts16le'
].join('\n')

function sourceOutput(index: string, sourceIdx: string, app: string): string {
  return `Source Output #${index}\n\tDriver: PipeWire\n\tSource: ${sourceIdx}\n\tProperties:\n\t\tapplication.name = "${app}"\n`
}

beforeEach(async () => {
  vi.clearAllMocks()
  mockPactl(() => '')
  await destroy() // reset module state
  await releaseAdoption()
  vi.clearAllMocks()
})

describe('parseStaleModuleIds', () => {
  it('finds persona null-sink modules only', () => {
    const list = [
      '23\tmodule-alsa-card\tdevice_id=1',
      '99\tmodule-null-sink\tsink_name=persona_virtual_mic media.class=Audio/Source/Virtual',
      '31\tmodule-null-sink\tsink_name=other_sink'
    ].join('\n')
    expect(parseStaleModuleIds(list)).toEqual(['99'])
  })
})

describe('create', () => {
  it('creates a virtual SOURCE with escaped description', async () => {
    mockPactl(args => {
      if (args[0] === 'list') return ''
      if (args[0] === 'load-module') return '536870913\n'
      return new Error('unexpected')
    })

    expect(await create()).toBe(true)
    expect(isActive()).toBe(true)

    const load = calls().find(a => a[0] === 'load-module')!
    expect(load).toContain('media.class=Audio/Source/Virtual')
    expect(load).toContain(`sink_name=${VIRTUAL_MIC_NAME}`)
    // Measured: only backslash-escaped spaces survive pactl's parser
    expect(load).toContain('sink_properties=device.description="Persona\\ Virtual\\ Mic"')
  })

  it('reports failure when pactl fails', async () => {
    mockPactl(() => new Error('no pulse'))
    expect(await create()).toBe(false)
    expect(isActive()).toBe(false)
  })
})

describe('parseCaptureStreams', () => {
  it('parses streams with resolved source names', () => {
    const out = sourceOutput('23812', '53', 'WEBRTC VoiceEngine') + sourceOutput('24000', '160', 'obs')
    expect(parseCaptureStreams(out, SHORT_SOURCES)).toEqual([
      { index: '23812', sourceName: 'alsa_input.pci-0000.analog-stereo', appName: 'WEBRTC VoiceEngine' },
      { index: '24000', sourceName: 'persona_virtual_mic', appName: 'obs' }
    ])
  })

  it('returns empty for no streams', () => {
    expect(parseCaptureStreams('', SHORT_SOURCES)).toEqual([])
  })
})

describe('classifyCapture', () => {
  it('reports virtual when any relevant app hears the virtual mic', () => {
    expect(classifyCapture([
      { index: '1', sourceName: VIRTUAL_MIC_NAME, appName: 'WEBRTC VoiceEngine' }
    ])).toBe('virtual')
  })

  it('reports raw when apps capture hardware mics', () => {
    expect(classifyCapture([
      { index: '1', sourceName: 'alsa_input.usb-mic', appName: 'WEBRTC VoiceEngine' }
    ])).toBe('raw')
  })

  it('ignores excluded monitoring apps', () => {
    expect(classifyCapture([
      { index: '1', sourceName: 'alsa_input.usb-mic', appName: 'PulseAudio Volume Control' }
    ])).toBe('none')
  })

  it('reports none with no capture streams', () => {
    expect(classifyCapture([])).toBe('none')
  })
})

describe('adoption', () => {
  async function createActive() {
    mockPactl(args => (args[0] === 'load-module' ? '42\n' : ''))
    await create()
    vi.clearAllMocks()
  }

  it('saves and replaces the default source', async () => {
    await createActive()
    mockPactl(args => {
      if (args[0] === 'get-default-source') return 'alsa_input.usb-mic\n'
      return ''
    })
    await adoptDefaultSource()
    expect(calls()).toContainEqual(['set-default-source', VIRTUAL_MIC_NAME])
    expect(getSavedDefaultSource()).toBe('alsa_input.usb-mic')

    vi.clearAllMocks()
    mockPactl(args => {
      if (args[0] === 'get-default-source') return `${VIRTUAL_MIC_NAME}\n`
      return ''
    })
    await releaseAdoption()
    expect(calls()).toContainEqual(['set-default-source', 'alsa_input.usb-mic'])
    expect(getSavedDefaultSource()).toBeNull()
  })

  it('does not save the virtual mic itself as the previous default', async () => {
    await createActive()
    mockPactl(args => {
      if (args[0] === 'get-default-source') return `${VIRTUAL_MIC_NAME}\n`
      return ''
    })
    await adoptDefaultSource()
    expect(getSavedDefaultSource()).toBeNull()
    // Already default — no redundant set call
    expect(calls().filter(a => a[0] === 'set-default-source')).toHaveLength(0)
  })

  it('release falls back to a hardware source when nothing was saved', async () => {
    await createActive()
    // No adoptDefaultSource ran (Persona killed mid-adoption + restarted):
    // default is stranded on the virtual mic with no saved previous.
    mockPactl(args => {
      if (args[0] === 'get-default-source') return `${VIRTUAL_MIC_NAME}\n`
      if (args[0] === 'list' && args[1] === 'short') return SHORT_SOURCES
      if (args[0] === 'list' && args[1] === 'source-outputs') return ''
      return ''
    })
    await releaseAdoption()
    expect(calls()).toContainEqual(['set-default-source', 'alsa_input.pci-0000.analog-stereo'])
  })

  it('moves hardware-mic streams to the virtual mic and back', async () => {
    await createActive()
    mockPactl(args => {
      if (args[0] === 'list' && args[1] === 'source-outputs') {
        return sourceOutput('100', '53', 'WEBRTC VoiceEngine') +
               sourceOutput('101', '160', 'AlreadyVirtual') +
               sourceOutput('102', '53', 'pavucontrol')
      }
      if (args[0] === 'list' && args[1] === 'short') return SHORT_SOURCES
      return ''
    })

    const adopted = await adoptCaptureStreams()
    expect(adopted.map(s => s.appName)).toEqual(['WEBRTC VoiceEngine'])
    expect(calls()).toContainEqual(['move-source-output', '100', VIRTUAL_MIC_NAME])
    // Already-virtual and excluded apps untouched
    expect(calls().filter(a => a[0] === 'move-source-output')).toHaveLength(1)

    vi.clearAllMocks()
    // Release reads the CURRENT state: the stream now sits on the virtual mic
    mockPactl(args => {
      if (args[0] === 'list' && args[1] === 'source-outputs') {
        return sourceOutput('100', '160', 'WEBRTC VoiceEngine')
      }
      if (args[0] === 'list' && args[1] === 'short') return SHORT_SOURCES
      return ''
    })
    await releaseAdoption()
    expect(calls()).toContainEqual(['move-source-output', '100', 'alsa_input.pci-0000.analog-stereo'])
  })

  it('releases streams that were recreated with new indexes (Discord device dialog)', async () => {
    await createActive()
    mockPactl(args => {
      if (args[0] === 'list' && args[1] === 'source-outputs') {
        return sourceOutput('100', '53', 'WEBRTC VoiceEngine')
      }
      if (args[0] === 'list' && args[1] === 'short') return SHORT_SOURCES
      return ''
    })
    await adoptCaptureStreams()
    vi.clearAllMocks()

    // Discord dropped stream #100 and recreated #205 — landing on the virtual
    // mic via its own stream-restore memory
    mockPactl(args => {
      if (args[0] === 'list' && args[1] === 'source-outputs') {
        return sourceOutput('205', '160', 'WEBRTC VoiceEngine')
      }
      if (args[0] === 'list' && args[1] === 'short') return SHORT_SOURCES
      return ''
    })
    await releaseAdoption()
    // Moved home by app name despite the stale remembered index
    expect(calls()).toContainEqual(['move-source-output', '205', 'alsa_input.pci-0000.analog-stereo'])
  })

  it('does not adopt when the virtual mic is inactive', async () => {
    // no create() — module inactive
    const adopted = await adoptCaptureStreams()
    expect(adopted).toEqual([])
    expect(calls()).toHaveLength(0)
  })
})

describe('destroy', () => {
  it('releases adoption before unloading', async () => {
    mockPactl(args => {
      if (args[0] === 'load-module') return '42\n'
      if (args[0] === 'get-default-source') return 'alsa_input.usb-mic\n'
      return ''
    })
    await create()
    await adoptDefaultSource()
    vi.clearAllMocks()

    mockPactl(args => {
      if (args[0] === 'get-default-source') return `${VIRTUAL_MIC_NAME}\n`
      return ''
    })
    await destroy()
    const argv = calls()
    const restoreIdx = argv.findIndex(a => a[0] === 'set-default-source')
    const unloadIdx = argv.findIndex(a => a[0] === 'unload-module')
    expect(restoreIdx).toBeGreaterThanOrEqual(0)
    expect(unloadIdx).toBeGreaterThan(restoreIdx)
    expect(isActive()).toBe(false)
  })
})
