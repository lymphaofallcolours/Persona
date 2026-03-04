import { spawn, execFile, execSync, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { CARLA_OSC_PORT } from './carlaOsc'

type StatusCallback = (running: boolean, plugins: string[]) => void
type CrashCallback = () => void

// Carla launch commands (tried in order)
// Note: --no-gui crashes Flatpak Carla, so we always launch with GUI
// and use xdotool to minimize the window when minimized mode is on.
const CARLA_COMMANDS = [
  { cmd: 'flatpak', args: ['run', 'studio.kx.carla'] },
  { cmd: 'carla', args: [] }
]

let carlaProcess: ChildProcess | null = null
let healthInterval: ReturnType<typeof setInterval> | null = null
let onStatusChange: StatusCallback | null = null
let onCrash: CrashCallback | null = null
let minimizedMode = true // Default: minimize Carla window after launch

export function setMinimized(minimized: boolean): void {
  minimizedMode = minimized
  // If Carla is running, apply immediately
  if (isRunning()) {
    if (minimized) {
      minimizeCarlaWindow()
    } else {
      restoreCarlaWindow()
    }
  }
}

export function getMinimized(): boolean {
  return minimizedMode
}

/**
 * Minimize Carla's window using xdotool.
 * Retries a few times since the window may take a moment to appear after launch.
 */
export function minimizeCarlaWindow(retries = 5): void {
  const attempt = () => {
    try {
      execSync('xdotool search --name "Carla" windowminimize', {
        timeout: 2000,
        stdio: 'pipe'
      })
    } catch {
      if (retries > 0) {
        setTimeout(() => minimizeCarlaWindow(retries - 1), 1000)
      }
    }
  }
  attempt()
}

/**
 * Restore (unminimize) Carla's window.
 */
function restoreCarlaWindow(): void {
  try {
    execSync('xdotool search --name "Carla" windowactivate', {
      timeout: 2000,
      stdio: 'pipe'
    })
  } catch {
    // Window not found — that's fine
  }
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
 * Always launches with GUI (--no-gui crashes Flatpak Carla).
 * If minimizedMode is on, the window is minimized after it appears.
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

      // Minimize the window after it appears (if minimized mode is on)
      if (minimizedMode) {
        setTimeout(() => minimizeCarlaWindow(8), 2000)
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
