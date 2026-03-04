import { spawn, execFile, execSync, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { CARLA_OSC_PORT } from './carlaOsc'

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
let launchMinimized = false

export function setLaunchMinimized(minimized: boolean): void {
  launchMinimized = minimized
}

export function getLaunchMinimized(): boolean {
  return launchMinimized
}

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
        stdio: 'ignore',
        env: { ...process.env, CARLA_OSC_UDP_PORT: String(CARLA_OSC_PORT) }
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

      // Minimize Carla window after it appears (if option is set)
      if (launchMinimized) {
        minimizeCarlaWindow()
      }

      return true
    } catch {
      continue
    }
  }

  return false
}

/**
 * Stop all Carla processes.
 * Flatpak wraps Carla in a sandbox — killing the `flatpak run` wrapper
 * doesn't kill the actual Carla process. Use pkill to ensure cleanup.
 */
export function stop(): void {
  // Kill our spawned process (the flatpak wrapper)
  if (carlaProcess && !carlaProcess.killed) {
    carlaProcess.kill('SIGTERM')
    carlaProcess = null
  }

  // Also kill any remaining Carla processes (handles Flatpak sandbox)
  try {
    execFile('pkill', ['-f', 'carla'], { timeout: 2000 })
  } catch {
    // No matching processes — that's fine
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

/**
 * Attempt to minimize Carla's window via xdotool.
 * Retries a few times since Carla's window may take a moment to appear.
 */
function minimizeCarlaWindow(): void {
  let attempts = 0
  const interval = setInterval(() => {
    attempts++
    if (attempts > 10) {
      clearInterval(interval)
      return
    }
    try {
      execFile('xdotool', ['search', '--name', 'Carla', 'windowminimize'], { timeout: 2000 })
      clearInterval(interval)
    } catch {
      // Window not found yet, retry
    }
  }, 1000)
}
