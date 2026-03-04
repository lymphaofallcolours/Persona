import { spawn, execFile, execFileSync, execSync, ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { CARLA_OSC_PORT } from './carlaOsc'

type StatusCallback = (running: boolean, plugins: string[]) => void
type CrashCallback = () => void

/** Carla window mode: 'visible' shows GUI, 'minimized' minimizes it, 'no-gui' uses --no-gui flag */
export type CarlaWindowMode = 'visible' | 'minimized' | 'no-gui'

// Carla launch commands (tried in order)
// JACK env vars ensure Carla uses JACK backend (PipeWire's JACK compat layer)
const CARLA_COMMANDS = [
  { cmd: 'flatpak', args: ['run',
    '--env=JACK_NO_START_SERVER=1',
    '--env=PIPEWIRE_LATENCY=256/48000',
    'studio.kx.carla'] },
  { cmd: 'carla', args: [] }
]

const CARLA_COMMANDS_NOGUI = [
  { cmd: 'flatpak', args: ['run',
    '--env=JACK_NO_START_SERVER=1',
    '--env=PIPEWIRE_LATENCY=256/48000',
    'studio.kx.carla', '--no-gui'] },
  { cmd: 'carla', args: ['--no-gui'] }
]

let carlaProcess: ChildProcess | null = null
let healthInterval: ReturnType<typeof setInterval> | null = null
let onStatusChange: StatusCallback | null = null
let onCrash: CrashCallback | null = null
let windowMode: CarlaWindowMode = 'minimized'

export function setWindowMode(mode: CarlaWindowMode): void {
  windowMode = mode
  // Apply immediately if Carla is running (only for visible/minimized toggle)
  if (isRunning()) {
    if (mode === 'minimized') {
      minimizeCarlaWindow()
    } else if (mode === 'visible') {
      restoreCarlaWindow()
    }
    // 'no-gui' can't be applied to a running instance — takes effect on next launch
  }
}

export function getWindowMode(): CarlaWindowMode {
  return windowMode
}

/**
 * Refocus Persona's Electron window after Carla steals focus.
 * Uses xdotool to find and activate the Persona window.
 */
function refocusPersona(): void {
  try {
    execSync('xdotool search --name "Persona" windowactivate', {
      timeout: 2000,
      stdio: 'pipe'
    })
  } catch {
    // Persona window not found — that's fine
  }
}

/**
 * Minimize Carla's window using xdotool.
 * Retries a few times since the window may take a moment to appear after launch.
 */
export function minimizeCarlaWindow(retries = 5): void {
  try {
    execSync('xdotool search --name "Carla" windowminimize', {
      timeout: 2000,
      stdio: 'pipe'
    })
    // After minimizing Carla, refocus Persona
    refocusPersona()
  } catch {
    if (retries > 0) {
      setTimeout(() => minimizeCarlaWindow(retries - 1), 1000)
    }
  }
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
 * Uses pgrep with a specific pattern to avoid matching grep itself.
 */
export function isRunning(): boolean {
  try {
    const result = execSync('pgrep -f "[c]arla"', { timeout: 1000, stdio: 'pipe' })
    return result.toString().trim().length > 0
  } catch {
    return false
  }
}

/**
 * Launch Carla, optionally with a .carxp project file.
 * - 'visible': launches with GUI, refocuses Persona after
 * - 'minimized': launches with GUI, minimizes window + refocuses Persona
 * - 'no-gui': launches with --no-gui flag (may crash on Flatpak Carla)
 */
export function launch(projectFile?: string): boolean {
  if (carlaProcess && !carlaProcess.killed) {
    return true // Already running via us
  }

  const commands = windowMode === 'no-gui' ? CARLA_COMMANDS_NOGUI : CARLA_COMMANDS

  for (const { cmd, args } of commands) {
    try {
      const fullArgs = [...args]
      if (projectFile && existsSync(projectFile)) {
        fullArgs.push(projectFile)
      }

      carlaProcess = spawn(cmd, fullArgs, {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          CARLA_OSC_UDP_PORT: String(CARLA_OSC_PORT),
          JACK_NO_START_SERVER: '1',
          PIPEWIRE_LATENCY: '256/48000'
        }
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

      // Handle window after launch (GUI modes only)
      if (windowMode !== 'no-gui') {
        if (windowMode === 'minimized') {
          // Wait for window to appear, then minimize + refocus Persona
          setTimeout(() => minimizeCarlaWindow(10), 2000)
        } else {
          // Visible mode: still refocus Persona after a brief delay
          setTimeout(() => refocusPersona(), 3000)
        }
      }

      return true
    } catch {
      continue
    }
  }

  return false
}

/**
 * Stop all Carla processes and wait for them to die.
 * Flatpak wraps Carla in a sandbox — killing the `flatpak run` wrapper
 * doesn't kill the actual Carla process. Use pkill to ensure cleanup.
 */
export async function stop(): Promise<void> {
  // Kill our spawned process (the flatpak wrapper)
  if (carlaProcess && !carlaProcess.killed) {
    carlaProcess.kill('SIGTERM')
    carlaProcess = null
  }

  // Also kill any remaining Carla processes (handles Flatpak sandbox)
  try {
    execFileSync('pkill', ['-f', 'carla'], { timeout: 2000 })
  } catch {
    // No matching processes — that's fine
  }

  // Wait up to 5s for processes to actually die
  for (let i = 0; i < 10; i++) {
    if (!isRunning()) return
    await new Promise(r => setTimeout(r, 500))
  }

  // Force kill if still alive
  try {
    execFileSync('pkill', ['-9', '-f', 'carla'], { timeout: 2000 })
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
