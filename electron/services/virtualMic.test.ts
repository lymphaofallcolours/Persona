import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

import { execFile } from 'child_process'
import { parseStaleModuleIds, create, destroy, isActive, VIRTUAL_MIC_NAME } from './virtualMic'

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

beforeEach(async () => {
  vi.clearAllMocks()
  // Reset module state between tests
  mockPactl(() => '')
  await destroy()
  vi.clearAllMocks()
})

describe('parseStaleModuleIds', () => {
  it('finds persona null-sink modules only', () => {
    const list = [
      '23\tmodule-alsa-card\tdevice_id=1',
      '536870913\tmodule-null-sink\tsink_name=persona_virtual_mic sink_properties=...',
      '31\tmodule-null-sink\tsink_name=other_sink',
      ''
    ].join('\n')
    expect(parseStaleModuleIds(list)).toEqual(['536870913'])
  })

  it('returns empty for no matches', () => {
    expect(parseStaleModuleIds('23\tmodule-alsa-card\t\n')).toEqual([])
  })
})

describe('create', () => {
  it('cleans up stale sinks then loads the module', async () => {
    mockPactl(args => {
      if (args[0] === 'list') return '99\tmodule-null-sink\tsink_name=persona_virtual_mic\n'
      if (args[0] === 'unload-module') return ''
      if (args[0] === 'load-module') return '536870913\n'
      return new Error('unexpected')
    })

    expect(await create()).toBe(true)
    expect(isActive()).toBe(true)

    const argv = calls()
    expect(argv[0][0]).toBe('list')
    expect(argv[1]).toEqual(['unload-module', '99'])
    expect(argv[2][0]).toBe('load-module')
    expect(argv[2]).toContain('module-null-sink')
    expect(argv[2]).toContain(`sink_name=${VIRTUAL_MIC_NAME}`)
  })

  it('is idempotent while active', async () => {
    mockPactl(args => (args[0] === 'load-module' ? '1\n' : ''))
    await create()
    vi.clearAllMocks()
    expect(await create()).toBe(true)
    expect(calls()).toHaveLength(0)
  })

  it('reports failure when pactl fails', async () => {
    mockPactl(() => new Error('no pulse'))
    expect(await create()).toBe(false)
    expect(isActive()).toBe(false)
  })
})

describe('destroy', () => {
  it('unloads the created module', async () => {
    mockPactl(args => (args[0] === 'load-module' ? '42\n' : ''))
    await create()
    vi.clearAllMocks()

    mockPactl(() => '')
    await destroy()
    expect(calls()).toEqual([['unload-module', '42']])
    expect(isActive()).toBe(false)
  })

  it('is a no-op when nothing was created', async () => {
    await destroy()
    expect(calls()).toHaveLength(0)
  })
})
