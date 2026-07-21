import { execFile } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import type { SetupCheck, SetupReport, SetupFixResult } from '../../src/types'

/**
 * Setup doctor — detects and repairs the one-time system configuration Persona
 * depends on. Every fix is user-scope (no sudo): Carla and plugin packs install
 * as user Flatpaks, and Carla's engine config is a plain INI file.
 *
 * Plugin strategy: Flathub LinuxAudio.Plugins extensions (Calf, swh) mounted
 * into the Carla sandbox at /app/extensions/Plugins — no host packages, no
 * LADSPA_PATH/LV2_PATH overrides. Stale overrides from older setups shadow the
 * extension mount, so the doctor detects and neutralizes them.
 */

const CARLA_APP_ID = 'studio.kx.carla'
const FLATHUB_REPO_URL = 'https://dl.flathub.org/repo/flathub.flatpakrepo'
const PLUGIN_PACK_PREFIX = 'org.freedesktop.LinuxAudio.Plugins.'
export const REQUIRED_PLUGIN_PACKS = ['Calf', 'swh', 'MDA']
// Paths the Carla sandbox mounts plugin extensions at. Used to neutralize
// stale env overrides without root: a user-level override pointing here wins
// over a system-level override pointing anywhere else.
const SANDBOX_LV2_PATH = '/app/extensions/Plugins/lv2:/app/lib/lv2'
const SANDBOX_LADSPA_PATH = '/app/extensions/Plugins/ladspa:/app/lib/ladspa'

const CARLA_CONF_PATH = join(homedir(), '.var', 'app', CARLA_APP_ID, 'config', 'falkTX', 'Carla2.conf')

const QUICK_TIMEOUT_MS = 10000
const INSTALL_TIMEOUT_MS = 600000

function run(cmd: string, args: string[], timeout = QUICK_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr || error.message}`))
        return
      }
      resolve(stdout)
    })
  })
}

/** Extract the runtime branch (e.g. "25.08") from `flatpak info` output. */
export function parseRuntimeBranch(infoOutput: string): string | null {
  const match = infoOutput.match(/Runtime:\s*\S+\/[^/]+\/(\S+)/)
  return match ? match[1].split('-').pop() ?? null : null
}

/** Extract an env var value from `flatpak override --show` output.
 *  An empty value is flatpak's marker for `--unset-env` — treated as absent. */
export function parseOverrideEnv(overrideOutput: string, varName: string): string | null {
  const match = overrideOutput.match(new RegExp(`^${varName}=(.*)$`, 'm'))
  return match && match[1] !== '' ? match[1] : null
}

async function getCarlaRuntimeBranch(): Promise<string | null> {
  try {
    const info = await run('flatpak', ['info', CARLA_APP_ID])
    return parseRuntimeBranch(info)
  } catch {
    return null
  }
}

// --- Individual checks ---

async function checkPipewire(): Promise<SetupCheck> {
  const base = { id: 'pipewire', label: 'PipeWire audio system', fixable: false }
  try {
    await run('pw-cli', ['info', '0'], 2000)
    return { ...base, status: 'ok', detail: 'PipeWire is running.' }
  } catch {
    return {
      ...base,
      status: 'error',
      detail: 'PipeWire is not responding. Persona requires a PipeWire-based distro (Ubuntu 22.10+, Fedora, Zorin 17+).'
    }
  }
}

async function checkFlathubRemote(): Promise<SetupCheck> {
  const base = { id: 'flathub', label: 'Flathub app source', fixable: true, fixLabel: 'Add Flathub' }
  try {
    const remotes = await run('flatpak', ['remotes', '--user', '--columns=name'])
    if (remotes.toLowerCase().includes('flathub')) {
      return { ...base, status: 'ok', detail: 'Flathub is configured.', fixable: false }
    }
    return { ...base, status: 'warning', detail: 'Flathub is not configured for user installs. Needed to install Carla and plugins.' }
  } catch {
    return {
      ...base,
      status: 'error',
      detail: 'Flatpak is not installed. Install it with your distro\'s package manager (usually preinstalled).',
      fixable: false
    }
  }
}

async function checkCarlaInstalled(): Promise<SetupCheck> {
  const base = { id: 'carla', label: 'Carla plugin host', fixable: true, fixLabel: 'Install (~1 GB download)' }
  try {
    await run('flatpak', ['info', CARLA_APP_ID])
    return { ...base, status: 'ok', detail: 'Carla is installed (Flatpak).', fixable: false }
  } catch {
    // Fall through to native check
  }
  try {
    await run('which', ['carla'], 2000)
    return { ...base, status: 'ok', detail: 'Native Carla installation detected.', fixable: false }
  } catch {
    return { ...base, status: 'error', detail: 'Carla is not installed. Persona uses it to host the voice effect plugins.' }
  }
}

async function checkPluginPacks(): Promise<SetupCheck> {
  const base = { id: 'plugins', label: 'Voice effect plugins (Calf, SWH, MDA)', fixable: true, fixLabel: 'Install plugins' }
  const branch = await getCarlaRuntimeBranch()
  if (!branch) {
    return { ...base, status: 'error', detail: 'Install Carla first — plugin packs must match its runtime version.', fixable: false }
  }
  const missing: string[] = []
  for (const pack of REQUIRED_PLUGIN_PACKS) {
    try {
      await run('flatpak', ['info', `${PLUGIN_PACK_PREFIX}${pack}//${branch}`])
    } catch {
      missing.push(pack)
    }
  }
  if (missing.length === 0) {
    return { ...base, status: 'ok', detail: 'All plugin packs are installed.', fixable: false }
  }
  return { ...base, status: 'warning', detail: `Missing plugin packs: ${missing.join(', ')}. Voices will not sound without them.` }
}

async function checkOverrides(): Promise<SetupCheck> {
  const base = { id: 'overrides', label: 'Carla plugin paths', fixable: true, fixLabel: 'Repair paths' }
  let userShow = ''
  let systemShow = ''
  try {
    userShow = await run('flatpak', ['override', '--user', '--show', CARLA_APP_ID])
  } catch { /* no user overrides */ }
  try {
    systemShow = await run('flatpak', ['override', '--show', CARLA_APP_ID])
  } catch { /* no system overrides */ }

  for (const varName of ['LV2_PATH', 'LADSPA_PATH']) {
    // User-level value wins over system-level
    const effective = parseOverrideEnv(userShow, varName) ?? parseOverrideEnv(systemShow, varName)
    if (effective !== null && !effective.startsWith('/app/extensions/Plugins')) {
      return {
        ...base,
        status: 'warning',
        detail: `A stale ${varName} override points Carla away from its plugin packs (${effective}). This hides the installed plugins.`
      }
    }
  }
  return { ...base, status: 'ok', detail: 'No stale plugin path overrides.', fixable: false }
}

/** Parse Carla2.conf-style INI: returns the value of a key inside a section. */
export function parseIniValue(ini: string, section: string, key: string): string | null {
  const lines = ini.split('\n')
  let inSection = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[')) {
      inSection = trimmed === `[${section}]`
      continue
    }
    if (inSection) {
      const eq = trimmed.indexOf('=')
      if (eq > 0 && trimmed.slice(0, eq) === key) {
        return trimmed.slice(eq + 1)
      }
    }
  }
  return null
}

/** Upsert key=value pairs inside a section, preserving all other content. */
export function upsertIniValues(ini: string, section: string, values: Record<string, string>): string {
  const lines = ini.length > 0 ? ini.split('\n') : []
  const pending = { ...values }
  const result: string[] = []
  let inSection = false
  let sectionFound = false

  const flushPending = () => {
    for (const [k, v] of Object.entries(pending)) {
      result.push(`${k}=${v}`)
      delete pending[k]
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[')) {
      if (inSection) flushPending() // leaving target section — add missing keys before the next header
      inSection = trimmed === `[${section}]`
      if (inSection) sectionFound = true
      result.push(line)
      continue
    }
    if (inSection) {
      const eq = trimmed.indexOf('=')
      const key = eq > 0 ? trimmed.slice(0, eq) : null
      if (key && key in pending) {
        result.push(`${key}=${pending[key]}`)
        delete pending[key]
        continue
      }
    }
    result.push(line)
  }

  if (!sectionFound) {
    if (result.length > 0 && result[result.length - 1] !== '') result.push('')
    result.push(`[${section}]`)
  }
  flushPending()
  return result.join('\n')
}

export function checkEngineConfig(confPath = CARLA_CONF_PATH): SetupCheck {
  const base = { id: 'engine', label: 'Carla audio engine settings', fixable: true, fixLabel: 'Configure' }
  if (!existsSync(confPath)) {
    return { ...base, status: 'warning', detail: 'Carla has no saved settings yet. The JACK driver and patchbay mode must be set for Persona routing.' }
  }
  try {
    const ini = readFileSync(confPath, 'utf-8')
    const driver = parseIniValue(ini, 'Engine', 'AudioDriver')
    const mode = parseIniValue(ini, 'Engine', 'ProcessMode')
    if (driver === 'JACK' && mode === '3') {
      return { ...base, status: 'ok', detail: 'Audio driver is JACK, process mode is Patchbay.', fixable: false }
    }
    return {
      ...base,
      status: 'warning',
      detail: `Engine is set to driver=${driver ?? 'unset'}, mode=${mode ?? 'unset'}. Persona needs JACK driver with Patchbay mode.`
    }
  } catch {
    return { ...base, status: 'error', detail: 'Could not read Carla settings file.' }
  }
}

export function fixEngineConfig(confPath = CARLA_CONF_PATH): void {
  const existing = existsSync(confPath) ? readFileSync(confPath, 'utf-8') : ''
  const updated = upsertIniValues(existing, 'Engine', { AudioDriver: 'JACK', ProcessMode: '3' })
  mkdirSync(dirname(confPath), { recursive: true })
  writeFileSync(confPath, updated)
}

// --- Public API ---

export async function runAllChecks(): Promise<SetupReport> {
  const checks: SetupCheck[] = [
    await checkPipewire(),
    await checkFlathubRemote(),
    await checkCarlaInstalled(),
    await checkPluginPacks(),
    await checkOverrides(),
    checkEngineConfig()
  ]
  return { checks, allOk: checks.every(c => c.status === 'ok') }
}

export async function applyFix(checkId: string): Promise<SetupFixResult> {
  try {
    switch (checkId) {
      case 'flathub': {
        await run('flatpak', ['remote-add', '--user', '--if-not-exists', 'flathub', FLATHUB_REPO_URL])
        return { ok: true, message: 'Flathub configured.' }
      }
      case 'carla': {
        await run('flatpak', ['install', '--user', '-y', 'flathub', CARLA_APP_ID], INSTALL_TIMEOUT_MS)
        return { ok: true, message: 'Carla installed.' }
      }
      case 'plugins': {
        const branch = await getCarlaRuntimeBranch()
        if (!branch) return { ok: false, message: 'Install Carla first.' }
        for (const pack of REQUIRED_PLUGIN_PACKS) {
          await run('flatpak', ['install', '--user', '-y', 'flathub', `${PLUGIN_PACK_PREFIX}${pack}//${branch}`], INSTALL_TIMEOUT_MS)
        }
        return { ok: true, message: 'Plugin packs installed.' }
      }
      case 'overrides': {
        // Clear any user-level stale override
        await run('flatpak', ['override', '--user', '--unset-env=LV2_PATH', '--unset-env=LADSPA_PATH', CARLA_APP_ID])
        // If a system-level override remains (needs root to remove), shadow it
        // with a user-level override pointing at the sandbox extension paths.
        let systemShow = ''
        try {
          systemShow = await run('flatpak', ['override', '--show', CARLA_APP_ID])
        } catch { /* none */ }
        if (parseOverrideEnv(systemShow, 'LV2_PATH') !== null || parseOverrideEnv(systemShow, 'LADSPA_PATH') !== null) {
          await run('flatpak', [
            'override', '--user',
            `--env=LV2_PATH=${SANDBOX_LV2_PATH}`,
            `--env=LADSPA_PATH=${SANDBOX_LADSPA_PATH}`,
            CARLA_APP_ID
          ])
        }
        return { ok: true, message: 'Plugin paths repaired. Restart Carla to apply.' }
      }
      case 'engine': {
        fixEngineConfig()
        return { ok: true, message: 'Carla engine configured (JACK driver, Patchbay mode).' }
      }
      default:
        return { ok: false, message: `Unknown fix: ${checkId}` }
    }
  } catch (err: any) {
    return { ok: false, message: `Fix failed: ${err.message}` }
  }
}
