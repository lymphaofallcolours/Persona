import { execFile } from 'child_process'

/**
 * Virtual microphone for voice calls (Discord etc.).
 *
 * A PipeWire null sink named `persona_virtual_mic`: Persona routes the
 * processed voice (Carla output) into its playback ports, and call apps
 * select its monitor — shown as "Monitor of Persona Virtual Mic" — as their
 * input device. Nothing reaches physical speakers unless the user enables
 * monitoring.
 *
 * Lifecycle: created at app start, unloaded on quit. Stale instances from a
 * crashed run are unloaded before creating (idempotent). Fully reversible —
 * `pactl unload-module` or a reboot removes every trace.
 */

export const VIRTUAL_MIC_NAME = 'persona_virtual_mic'
export const VIRTUAL_MIC_DESCRIPTION = 'Persona Virtual Mic'

const TIMEOUT_MS = 2000

let moduleId: string | null = null

function exec(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('pactl', args, { timeout: TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`pactl ${args.join(' ')} failed: ${stderr || error.message}`))
        return
      }
      resolve(stdout)
    })
  })
}

/** Parse `pactl list short modules` for stale persona_virtual_mic module ids. */
export function parseStaleModuleIds(listOutput: string): string[] {
  return listOutput
    .split('\n')
    .filter(line => line.includes('module-null-sink') && line.includes(VIRTUAL_MIC_NAME))
    .map(line => line.split('\t')[0].trim())
    .filter(Boolean)
}

/** Unload any virtual mic left behind by a previous (crashed) run. */
export async function cleanupStale(): Promise<number> {
  const list = await exec(['list', 'short', 'modules'])
  const stale = parseStaleModuleIds(list)
  for (const id of stale) {
    try {
      await exec(['unload-module', id])
    } catch {
      // Already gone — fine
    }
  }
  return stale.length
}

/** Create the virtual mic sink. Idempotent: cleans up stale instances first. */
export async function create(): Promise<boolean> {
  if (moduleId !== null) return true
  try {
    await cleanupStale()
    const out = await exec([
      'load-module',
      'module-null-sink',
      `sink_name=${VIRTUAL_MIC_NAME}`,
      `sink_properties=device.description="${VIRTUAL_MIC_DESCRIPTION}"`
    ])
    moduleId = out.trim()
    return moduleId.length > 0
  } catch {
    moduleId = null
    return false
  }
}

export async function destroy(): Promise<void> {
  if (moduleId === null) return
  const id = moduleId
  moduleId = null
  try {
    await exec(['unload-module', id])
  } catch {
    // Sink already gone (e.g. PipeWire restarted) — nothing to clean
  }
}

export function isActive(): boolean {
  return moduleId !== null
}
