import { execFile } from 'child_process'
import type { CaptureState } from '../../src/types'

/**
 * Virtual microphone for voice calls (Discord etc.) — a REAL PipeWire source
 * (`media.class=Audio/Source/Virtual`), not a sink monitor. Every app lists it
 * as a genuine microphone named "Persona Virtual Mic".
 *
 * Topology (measured live on PipeWire 1.0.5):
 *   persona_virtual_mic:input_FL/FR    — Persona feeds Carla's output here
 *   persona_virtual_mic:capture_FL/FR  — readable side (self-monitor listen path)
 *
 * Adoption: while a voice is routed here, Persona makes the virtual mic the
 * system default source and actively MOVES existing app capture streams
 * (Discord's WEBRTC VoiceEngine, browsers) off hardware mics onto it —
 * zero configuration inside the call app, works mid-call, and the app's
 * stream-restore memory then keeps it sticky across app restarts. Everything
 * is reverted on release: streams move back, default source is restored.
 *
 * Lifecycle: created at app start (stale instances cleaned), destroyed on quit
 * (which also releases adoption). All runtime state vanishes on reboot.
 */

export const VIRTUAL_MIC_NAME = 'persona_virtual_mic'
// Backslash-escaped spaces survive pactl's module-argument parser; plain or
// nested quoting truncates the description at the first space (measured).
const DESCRIPTION_ARG = 'sink_properties=device.description="Persona\\ Virtual\\ Mic"'

const TIMEOUT_MS = 2000

// Capture streams never worth adopting: monitoring UIs and our own test tools.
const ADOPTION_EXCLUDE = [/pavucontrol/i, /volume control/i, /^pw-cat$/i]

let moduleId: string | null = null
let savedDefaultSource: string | null = null
// Previous source per app name — stream INDEXES go stale the moment an app
// recreates its stream (Discord does this when its device dialog appears),
// so release works from the CURRENT stream list and only uses this map to
// pick each app's way home.
let previousSourceByApp = new Map<string, string>()

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

// --- Node lifecycle ---

/** Parse `pactl list short modules` for stale persona_virtual_mic module ids. */
export function parseStaleModuleIds(listOutput: string): string[] {
  return listOutput
    .split('\n')
    .filter(line => line.includes('module-null-sink') && line.includes(VIRTUAL_MIC_NAME))
    .map(line => line.split('\t')[0].trim())
    .filter(Boolean)
}

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

export async function create(): Promise<boolean> {
  if (moduleId !== null) return true
  try {
    await cleanupStale()
    const out = await exec([
      'load-module',
      'module-null-sink',
      'media.class=Audio/Source/Virtual',
      `sink_name=${VIRTUAL_MIC_NAME}`,
      'channel_map=front-left,front-right',
      DESCRIPTION_ARG
    ])
    moduleId = out.trim()
    return moduleId.length > 0
  } catch {
    moduleId = null
    return false
  }
}

export async function destroy(): Promise<void> {
  await releaseAdoption()
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

// --- Capture stream inspection ---

export interface CaptureStream {
  index: string
  sourceName: string
  appName: string
}

/** Parse `pactl list source-outputs` + a source index→name map into streams. */
export function parseCaptureStreams(
  sourceOutputs: string,
  shortSources: string
): CaptureStream[] {
  const sourceNames = new Map<string, string>()
  for (const line of shortSources.split('\n')) {
    const [idx, name] = line.split('\t')
    if (idx && name) sourceNames.set(idx.trim(), name.trim())
  }

  const streams: CaptureStream[] = []
  for (const block of sourceOutputs.split(/^Source Output #/m)) {
    const index = block.match(/^(\d+)/)?.[1]
    if (!index) continue
    const sourceIdx = block.match(/^\s*Source:\s*(\d+)/m)?.[1]
    const appName = block.match(/application\.name = "([^"]*)"/)?.[1] ?? ''
    streams.push({
      index,
      sourceName: sourceIdx ? sourceNames.get(sourceIdx) ?? '' : '',
      appName
    })
  }
  return streams
}

export async function listCaptureStreams(): Promise<CaptureStream[]> {
  const [sourceOutputs, shortSources] = await Promise.all([
    exec(['list', 'source-outputs']),
    exec(['list', 'short', 'sources'])
  ])
  return parseCaptureStreams(sourceOutputs, shortSources)
}

function isAdoptable(stream: CaptureStream): boolean {
  if (!/^alsa_input\./.test(stream.sourceName)) return false
  return !ADOPTION_EXCLUDE.some(p => p.test(stream.appName))
}

/**
 * Overall capture picture for status display: 'virtual' when at least one app
 * hears the virtual mic, 'raw' when apps are still on a hardware mic, 'none'
 * when nothing is capturing.
 */
export function classifyCapture(streams: CaptureStream[]): CaptureState {
  const relevant = streams.filter(
    s => !ADOPTION_EXCLUDE.some(p => p.test(s.appName))
  )
  if (relevant.some(s => s.sourceName === VIRTUAL_MIC_NAME)) return 'virtual'
  if (relevant.some(s => /^alsa_input\./.test(s.sourceName))) return 'raw'
  return 'none'
}

// --- Adoption (default source + live stream migration) ---

export async function adoptDefaultSource(): Promise<void> {
  try {
    const current = (await exec(['get-default-source'])).trim()
    if (current && current !== VIRTUAL_MIC_NAME && savedDefaultSource === null) {
      savedDefaultSource = current
    }
    if (current !== VIRTUAL_MIC_NAME) {
      await exec(['set-default-source', VIRTUAL_MIC_NAME])
    }
  } catch {
    // pactl unavailable — adoption simply doesn't happen
  }
}

/**
 * The hardware source adoption displaced — the REAL microphone behind the
 * virtual one. Consumers must use this when 'auto' input resolution lands on
 * the virtual mic itself (feeding the chain from it would be circular).
 */
export function getSavedDefaultSource(): string | null {
  return savedDefaultSource
}

/** First hardware input source — last-resort fallback when nothing is saved
 *  (e.g. Persona was killed mid-adoption and restarted). */
async function firstHardwareSource(): Promise<string | null> {
  try {
    const list = await exec(['list', 'short', 'sources'])
    for (const line of list.split('\n')) {
      const name = line.split('\t')[1]?.trim()
      if (name?.startsWith('alsa_input.')) return name
    }
  } catch {
    // pactl unavailable
  }
  return null
}

/**
 * Move hardware-mic capture streams onto the virtual mic.
 * Returns the newly moved streams (for user-facing toasts).
 */
export async function adoptCaptureStreams(): Promise<CaptureStream[]> {
  if (moduleId === null) return []
  let streams: CaptureStream[]
  try {
    streams = await listCaptureStreams()
  } catch {
    return []
  }
  const adopted: CaptureStream[] = []
  for (const stream of streams) {
    if (!isAdoptable(stream)) continue
    try {
      await exec(['move-source-output', stream.index, VIRTUAL_MIC_NAME])
      if (!previousSourceByApp.has(stream.appName)) {
        previousSourceByApp.set(stream.appName, stream.sourceName)
      }
      adopted.push(stream)
    } catch {
      // Stream vanished mid-move — ignore
    }
  }
  return adopted
}

/**
 * Undo everything: streams back to their former sources, default restored.
 * Works from the CURRENT stream list (indexes remembered at adoption time are
 * unreliable — apps recreate streams), so it also cleans up streams that
 * landed on the virtual mic through the app's own stream-restore memory.
 */
export async function releaseAdoption(): Promise<void> {
  const fallback = savedDefaultSource
  try {
    const streams = await listCaptureStreams()
    for (const stream of streams) {
      if (stream.sourceName !== VIRTUAL_MIC_NAME) continue
      const home = previousSourceByApp.get(stream.appName) ?? fallback
      if (!home) continue
      try {
        await exec(['move-source-output', stream.index, home])
      } catch {
        // Stream or source gone — nothing to restore
      }
    }
  } catch {
    // pactl unavailable — nothing to release
  }
  previousSourceByApp = new Map()

  // Never leave the system default pointing at the (soon-gone) virtual mic —
  // even when nothing was saved (Persona killed mid-adoption and restarted).
  try {
    const current = (await exec(['get-default-source'])).trim()
    if (current === VIRTUAL_MIC_NAME) {
      const target = savedDefaultSource ?? await firstHardwareSource()
      if (target) {
        await exec(['set-default-source', target])
      }
    }
  } catch {
    // pactl unavailable — PipeWire picks its own default
  }
  savedDefaultSource = null
}
