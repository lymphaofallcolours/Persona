import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock child_process before importing
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn()
}))

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true)
}))

import { execSync, spawn } from 'child_process'
import { isRunning, launch, stop } from './carla'

const mockExecSync = vi.mocked(execSync)
const mockSpawn = vi.mocked(spawn)

beforeEach(() => {
  vi.clearAllMocks()
  // Reset module state — stop any lingering process reference
  stop()
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

  it('tries flatpak first', () => {
    const proc = makeFakeProcess()
    mockSpawn.mockReturnValue(proc)

    const result = launch()
    expect(result).toBe(true)
    expect(mockSpawn).toHaveBeenCalledWith(
      'flatpak',
      ['run', 'studio.kx.carla'],
      expect.objectContaining({ detached: true })
    )
  })

  it('passes project file when provided', () => {
    const proc = makeFakeProcess()
    mockSpawn.mockReturnValue(proc)

    launch('/path/to/project.carxp')
    expect(mockSpawn).toHaveBeenCalledWith(
      'flatpak',
      ['run', 'studio.kx.carla', '/path/to/project.carxp'],
      expect.any(Object)
    )
  })

  it('returns true if already running via us', () => {
    const proc = makeFakeProcess()
    mockSpawn.mockReturnValue(proc)

    launch() // first launch
    const result = launch() // second launch
    expect(result).toBe(true)
    // spawn only called once
    expect(mockSpawn).toHaveBeenCalledTimes(1)
  })
})

describe('stop', () => {
  it('kills the carla process', () => {
    const proc = {
      on: vi.fn(),
      unref: vi.fn(),
      killed: false,
      kill: vi.fn()
    } as any
    mockSpawn.mockReturnValue(proc)

    launch()
    stop()
    expect(proc.kill).toHaveBeenCalledWith('SIGTERM')
  })
})
