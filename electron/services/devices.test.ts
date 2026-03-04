import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock child_process before importing
vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

import { execFile } from 'child_process'
import {
  getInputDevices, getOutputDevices, getCarlaPlugins,
  getDefaultSource, getDefaultSink, snapshotBaseline,
  waitForCarlaPort, discoverCarlaRoutingPorts
} from './devices'

const mockExecFile = vi.mocked(execFile)

let execResults: Record<string, string> = {}

function mockExecResult(stdout: string) {
  mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
    callback(null, stdout)
    return {} as any
  })
}

function mockExecByArgs(results: Record<string, string>) {
  execResults = results
  mockExecFile.mockImplementation((_cmd: any, args: any, _opts: any, callback: any) => {
    const key = Array.isArray(args) ? args.join(' ') : String(args)
    const stdout = execResults[key] ?? ''
    callback(null, stdout)
    return {} as any
  })
}

function mockExecError() {
  mockExecFile.mockImplementation((_cmd, _args, _opts, callback: any) => {
    callback(new Error('command failed'), '')
    return {} as any
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  execResults = {}
})

describe('getInputDevices', () => {
  it('parses pw-link -o output into input devices', async () => {
    mockExecResult(
      'alsa_input.usb-mic:capture_FL\n' +
      'alsa_input.usb-mic:capture_FR\n' +
      'alsa_output.headphones:monitor_FL\n' +
      'Calf Compressor:Out L\n'
    )

    const devices = await getInputDevices()
    expect(devices).toHaveLength(1)
    expect(devices[0].name).toBe('alsa_input.usb-mic')
    expect(devices[0].ports).toEqual(['capture_FL', 'capture_FR'])
    expect(devices[0].type).toBe('input')
  })

  it('returns empty array when no ALSA inputs', async () => {
    mockExecResult('Calf Reverb:Out L\nCalf Reverb:Out R\n')
    const devices = await getInputDevices()
    expect(devices).toEqual([])
  })

  it('handles multiple input devices', async () => {
    mockExecResult(
      'alsa_input.usb-mic:capture_FL\n' +
      'alsa_input.usb-mic:capture_FR\n' +
      'alsa_input.pci-builtin:capture_FL\n' +
      'alsa_input.pci-builtin:capture_FR\n'
    )

    const devices = await getInputDevices()
    expect(devices).toHaveLength(2)
    expect(devices.map(d => d.name)).toEqual([
      'alsa_input.usb-mic',
      'alsa_input.pci-builtin'
    ])
  })
})

describe('getOutputDevices', () => {
  it('parses pw-link -i output into output devices', async () => {
    mockExecResult(
      'alsa_output.headphones:playback_FL\n' +
      'alsa_output.headphones:playback_FR\n' +
      'Calf Compressor:In L\n'
    )

    const devices = await getOutputDevices()
    expect(devices).toHaveLength(1)
    expect(devices[0].name).toBe('alsa_output.headphones')
    expect(devices[0].ports).toEqual(['playback_FL', 'playback_FR'])
    expect(devices[0].type).toBe('output')
  })
})

describe('getCarlaPlugins', () => {
  it('returns only nodes that appeared after baseline snapshot', async () => {
    // Step 1: snapshot baseline (before Carla launches)
    mockExecByArgs({
      '-o': 'alsa_input.mic:capture_FL\nalsa_output.headphones:monitor_FL\nfirefox:output_FL\npipewire-pulse:capture_1\n',
      '-i': 'alsa_output.headphones:playback_FL\n'
    })
    await snapshotBaseline()

    // Step 2: after Carla launches, new plugins appear
    mockExecResult(
      'alsa_input.mic:capture_FL\n' +
      'alsa_output.headphones:monitor_FL\n' +
      'firefox:output_FL\n' +
      'pipewire-pulse:capture_1\n' +
      'Calf Compressor:Out L\n' +
      'Calf Reverb:Out L\n'
    )

    const plugins = await getCarlaPlugins()
    expect(plugins).toEqual(['Calf Compressor', 'Calf Reverb'])
  })

  it('excludes Firefox and other pre-existing apps', async () => {
    // Firefox was running before Carla
    mockExecByArgs({
      '-o': 'firefox:output_FL\nfirefox:output_FR\n',
      '-i': ''
    })
    await snapshotBaseline()

    // Still just Firefox — no Carla plugins
    mockExecResult('firefox:output_FL\nfirefox:output_FR\n')
    const plugins = await getCarlaPlugins()
    expect(plugins).toEqual([])
  })

  it('returns empty when no baseline and no new nodes', async () => {
    mockExecByArgs({
      '-o': 'alsa_input.mic:capture_FL\nalsa_output.headphones:monitor_FL\n',
      '-i': ''
    })
    await snapshotBaseline()

    // Same nodes — nothing new
    mockExecResult(
      'alsa_input.mic:capture_FL\n' +
      'alsa_output.headphones:monitor_FL\n'
    )
    const plugins = await getCarlaPlugins()
    expect(plugins).toEqual([])
  })
})

describe('discoverCarlaRoutingPorts', () => {
  it('discovers individual plugin ports (Calf-style)', async () => {
    // Set baseline with just system nodes
    mockExecByArgs({
      '-o': 'alsa_input.mic:capture_FL\nalsa_input.mic:capture_FR\n',
      '-i': 'alsa_output.hp:playback_FL\nalsa_output.hp:playback_FR\n'
    })
    await snapshotBaseline()

    // After Carla: plugins appear
    mockExecByArgs({
      '-o': 'alsa_input.mic:capture_FL\nalsa_input.mic:capture_FR\nCalf Compressor:Out L\nCalf Compressor:Out R\nCalf Reverb:Out L\nCalf Reverb:Out R\n',
      '-i': 'alsa_output.hp:playback_FL\nalsa_output.hp:playback_FR\nCalf Compressor:In L\nCalf Compressor:In R\nCalf Reverb:In L\nCalf Reverb:In R\n'
    })

    const routing = await discoverCarlaRoutingPorts()
    // First input node = first plugin's input
    expect(routing.inputPorts).toEqual({
      left: 'Calf Compressor:In L',
      right: 'Calf Compressor:In R'
    })
    // Last output node = last plugin's output
    expect(routing.outputPorts).toEqual({
      left: 'Calf Reverb:Out L',
      right: 'Calf Reverb:Out R'
    })
  })

  it('discovers single Carla node ports', async () => {
    mockExecByArgs({
      '-o': 'alsa_input.mic:capture_FL\n',
      '-i': 'alsa_output.hp:playback_FL\n'
    })
    await snapshotBaseline()

    mockExecByArgs({
      '-o': 'alsa_input.mic:capture_FL\nCarla:audio-out1\nCarla:audio-out2\n',
      '-i': 'alsa_output.hp:playback_FL\nCarla:audio-in1\nCarla:audio-in2\n'
    })

    const routing = await discoverCarlaRoutingPorts()
    expect(routing.inputPorts).toEqual({
      left: 'Carla:audio-in1',
      right: 'Carla:audio-in2'
    })
    expect(routing.outputPorts).toEqual({
      left: 'Carla:audio-out1',
      right: 'Carla:audio-out2'
    })
  })

  it('returns null ports when no new nodes', async () => {
    mockExecByArgs({
      '-o': 'alsa_input.mic:capture_FL\n',
      '-i': 'alsa_output.hp:playback_FL\n'
    })
    await snapshotBaseline()

    // No new nodes after "launch"
    mockExecByArgs({
      '-o': 'alsa_input.mic:capture_FL\n',
      '-i': 'alsa_output.hp:playback_FL\n'
    })

    const routing = await discoverCarlaRoutingPorts()
    expect(routing.inputPorts).toBeNull()
    expect(routing.outputPorts).toBeNull()
  })
})

describe('getDefaultSource', () => {
  it('returns trimmed source name', async () => {
    mockExecResult('alsa_input.usb-mic\n')
    const source = await getDefaultSource()
    expect(source).toBe('alsa_input.usb-mic')
  })

  it('returns null on error', async () => {
    mockExecError()
    const source = await getDefaultSource()
    expect(source).toBeNull()
  })
})

describe('getDefaultSink', () => {
  it('returns trimmed sink name', async () => {
    mockExecResult('alsa_output.headphones\n')
    const sink = await getDefaultSink()
    expect(sink).toBe('alsa_output.headphones')
  })

  it('returns null on error', async () => {
    mockExecError()
    const sink = await getDefaultSink()
    expect(sink).toBeNull()
  })
})
