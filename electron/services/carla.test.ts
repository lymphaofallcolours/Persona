import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock child_process before importing
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  execFile: vi.fn(),
  execFileSync: vi.fn(),
  spawn: vi.fn()
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true)
}))

// Must re-import fresh module for each test to avoid state leaks
// Since vitest module caching makes this hard, we reset via the exported API
import { execSync, execFileSync, spawn } from 'child_process'
import { isRunning, launch, stop, setWindowMode, getWindowMode } from './carla'

const mockExecSync = vi.mocked(execSync)
const mockExecFileSync = vi.mocked(execFileSync)
const mockSpawn = vi.mocked(spawn)

beforeEach(async () => {
  vi.clearAllMocks()
  // isRunning returns false so stop() completes quickly
  mockExecSync.mockImplementation(() => {
    throw new Error('exit code 1')
  })
  await stop()
  vi.clearAllMocks()
  setWindowMode('minimized')
})

describe('isRunning', () => {
  it('returns true when pgrep finds carla', () => {
    mockExecSync.mockReturnValue(Buffer.from('12345\n'))
    expect(isRunning()).toBe(true)
  })

  it('returns false when pgrep finds nothing', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('exit code 1')
    })
    expect(isRunning()).toBe(false)
  })

  it('returns false when pgrep returns empty string', () => {
    mockExecSync.mockReturnValue(Buffer.from(''))
    expect(isRunning()).toBe(false)
  })
})

describe('launch', () => {
  function makeFakeProcess() {
    const handlers: Record<string, (...args: any[]) => void> = {}
    return {
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        handlers[event] = handler
      }),
      unref: vi.fn(),
      killed: false,
      kill: vi.fn(),
      _handlers: handlers
    } as any
  }

  it('launches with JACK env vars in flatpak args', () => {
    const proc = makeFakeProcess()
    mockSpawn.mockReturnValue(proc)

    const result = launch()
    expect(result).toBe(true)
    expect(mockSpawn).toHaveBeenCalledWith(
      'flatpak',
      expect.arrayContaining([
        'run',
        '--env=JACK_NO_START_SERVER=1',
        '--env=PIPEWIRE_LATENCY=256/48000',
        'studio.kx.carla'
      ]),
      expect.objectContaining({ detached: true })
    )
  })

  it('passes JACK env vars in spawn env', () => {
    const proc = makeFakeProcess()
    mockSpawn.mockReturnValue(proc)

    launch()
    const spawnCall = mockSpawn.mock.calls[0]
    const env = spawnCall[2]?.env as Record<string, string>
    expect(env.JACK_NO_START_SERVER).toBe('1')
    expect(env.PIPEWIRE_LATENCY).toBe('256/48000')
  })

  it('launches with --no-gui in no-gui mode', () => {
    setWindowMode('no-gui')
    const proc = makeFakeProcess()
    mockSpawn.mockReturnValue(proc)

    launch()
    expect(mockSpawn).toHaveBeenCalledWith(
      'flatpak',
      expect.arrayContaining(['--no-gui']),
      expect.objectContaining({ detached: true })
    )
  })

  it('passes project file when provided', () => {
    const proc = makeFakeProcess()
    mockSpawn.mockReturnValue(proc)

    launch('/path/to/project.carxp')
    expect(mockSpawn).toHaveBeenCalledWith(
      'flatpak',
      expect.arrayContaining(['/path/to/project.carxp']),
      expect.any(Object)
    )
  })

  it('returns true if already running via us', () => {
    const proc = makeFakeProcess()
    mockSpawn.mockReturnValue(proc)

    launch()
    const result = launch()
    expect(result).toBe(true)
    expect(mockSpawn).toHaveBeenCalledTimes(1)
  })
})

describe('stop', () => {
  it('kills the carla process and calls pkill', async () => {
    const proc = {
      on: vi.fn(),
      unref: vi.fn(),
      killed: false,
      kill: vi.fn()
    } as any
    mockSpawn.mockReturnValue(proc)

    // isRunning returns false after pkill (process died)
    mockExecSync.mockImplementation(() => {
      throw new Error('exit code 1')
    })

    launch()
    await stop()
    expect(proc.kill).toHaveBeenCalledWith('SIGTERM')
    expect(mockExecFileSync).toHaveBeenCalledWith('pkill', ['-f', 'carla'], { timeout: 2000 })
  })

  it('force kills if process survives SIGTERM', async () => {
    const proc = {
      on: vi.fn(),
      unref: vi.fn(),
      killed: false,
      kill: vi.fn()
    } as any
    mockSpawn.mockReturnValue(proc)

    // isRunning keeps returning true (zombie process)
    mockExecSync.mockReturnValue(Buffer.from('12345\n'))

    launch()
    await stop()
    // Should have called pkill -9 as last resort
    expect(mockExecFileSync).toHaveBeenCalledWith('pkill', ['-9', '-f', 'carla'], { timeout: 2000 })
  }, 10000)
})

describe('window mode', () => {
  it('defaults to minimized', () => {
    expect(getWindowMode()).toBe('minimized')
  })

  it('can be set to visible', () => {
    setWindowMode('visible')
    expect(getWindowMode()).toBe('visible')
  })

  it('can be set to no-gui', () => {
    setWindowMode('no-gui')
    expect(getWindowMode()).toBe('no-gui')
  })

  it('cycles through all modes', () => {
    setWindowMode('visible')
    expect(getWindowMode()).toBe('visible')
    setWindowMode('minimized')
    expect(getWindowMode()).toBe('minimized')
    setWindowMode('no-gui')
    expect(getWindowMode()).toBe('no-gui')
  })
})
