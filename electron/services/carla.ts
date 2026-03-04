import { spawn, execSync, ChildProcess } from 'child_process'
import { existsSync } from 'fs'

type StatusCallback = (running: boolean, plugins: string[]) => void
type CrashCallback = () => void

// Default Carla launch commands (tried in order)
const CARLA_COMMANDS = [
  { cmd: 'flatpak', args: ['run', 'studio.kx.carla'] },
  { cmd: 'carla', args: [] }
]

let carlaProcess: ChildProcess | null = null
let healthInterval: ReturnType<typeof setInterval> | null = null
let onStatusChange: StatusCallback | null = null
let onCrash: CrashCallback | null = null

/**
 * Check if Carla is already running (any instance, not just ours).
 */
export function isRunning(): boolean {
  try {
    const result = execSync('pgrep -f carla', { timeout: 1000, stdio: 'pipe' })
    return result.toString().trim().length > 0
  } catch {
    return false
  }
}

/**
 * Launch Carla, optionally with a .carxp project file.
 */
export function launch(projectFile?: string): boolean {
  if (carlaProcess && !carlaProcess.killed) {
    return true // Already running via us
  }

  for (const { cmd, args } of CARLA_COMMANDS) {
    try {
      const fullArgs = [...args]
      if (projectFile && existsSync(projectFile)) {
        fullArgs.push(projectFile)
      }

      carlaProcess = spawn(cmd, fullArgs, {
        detached: true,
        stdio: 'ignore'
      })

      carlaProcess.on('exit', (code) => {
        carlaProcess = null
        if (code !== 0 && code !== null) {
          onCrash?.()
        }
      })

      carlaProcess.on('error', () => {
        carlaProcess = null
        // This command doesn't work, try next
      })

      carlaProcess.unref()
      return true
    } catch {
      continue
    }
  }

  return false
}

/**
 * Stop the Carla process we spawned.
 */
export function stop(): void {
  if (carlaProcess && !carlaProcess.killed) {
    carlaProcess.kill('SIGTERM')
    carlaProcess = null
  }
}

/**
 * Set callbacks for status changes and crashes.
 */
export function onEvents(statusCb: StatusCallback, crashCb: CrashCallback): void {
  onStatusChange = statusCb
  onCrash = crashCb
}

/**
 * Start periodic health checks.
 * Checks if Carla is running and what plugins are visible in PipeWire.
 */
export function startHealthPolling(getCarlaPlugins: () => Promise<string[]>): void {
  stopHealthPolling()

  const check = async () => {
    const running = isRunning()
    let plugins: string[] = []

    if (running) {
      try {
        plugins = await getCarlaPlugins()
      } catch {
        // PipeWire not available
      }
    }

    onStatusChange?.(running, plugins)
  }

  healthInterval = setInterval(check, 3000)
  check()
}

export function stopHealthPolling(): void {
  if (healthInterval) {
    clearInterval(healthInterval)
    healthInterval = null
  }
}
