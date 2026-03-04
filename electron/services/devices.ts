import { execFile } from 'child_process'
import type { AudioDevice } from '../../src/types'

const TIMEOUT_MS = 2000

function exec(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: TIMEOUT_MS }, (error, stdout) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout)
    })
  })
}

/**
 * Parse pw-link port output into grouped devices.
 * pw-link -o/-i outputs lines like:
 *   alsa_input.usb-...:capture_FL
 *   alsa_input.usb-...:capture_FR
 *   Calf Compressor:Out L
 *
 * We group by the part before the colon (the node/client name).
 */
function parsePorts(output: string, type: 'input' | 'output'): AudioDevice[] {
  const deviceMap = new Map<string, string[]>()

  for (const line of output.trim().split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const colonIndex = trimmed.lastIndexOf(':')
    if (colonIndex === -1) continue

    const deviceName = trimmed.substring(0, colonIndex)
    const portName = trimmed.substring(colonIndex + 1)

    if (!deviceMap.has(deviceName)) {
      deviceMap.set(deviceName, [])
    }
    deviceMap.get(deviceName)!.push(portName)
  }

  return Array.from(deviceMap.entries()).map(([name, ports]) => ({
    name,
    description: name.replace(/^alsa_(input|output)\./, '').replace(/-/g, ' '),
    ports,
    type
  }))
}

/**
 * Get hardware input devices (microphones).
 * Filters to ALSA devices only (excludes Carla plugins, monitors, etc.)
 */
export async function getInputDevices(): Promise<AudioDevice[]> {
  const output = await exec('pw-link', ['-o'])
  const all = parsePorts(output, 'input')
  return all.filter(d => d.name.startsWith('alsa_input.'))
}

/**
 * Get hardware output devices (speakers/headphones).
 * Filters to ALSA devices only.
 */
export async function getOutputDevices(): Promise<AudioDevice[]> {
  const output = await exec('pw-link', ['-i'])
  const all = parsePorts(output, 'output')
  return all.filter(d => d.name.startsWith('alsa_output.'))
}

/**
 * Baseline PipeWire node names captured BEFORE Carla launches.
 * getCarlaPlugins() returns only nodes that appeared AFTER the baseline,
 * which eliminates Firefox, Discord, system nodes, etc.
 */
let baselineNodes: Set<string> = new Set()

/**
 * Capture a snapshot of all current PipeWire nodes (both input and output).
 * Call this BEFORE launching Carla so we can diff later.
 */
export async function snapshotBaseline(): Promise<void> {
  try {
    const [outputRaw, inputRaw] = await Promise.all([
      exec('pw-link', ['-o']),
      exec('pw-link', ['-i'])
    ])
    const outputNames = parsePorts(outputRaw, 'output').map(d => d.name)
    const inputNames = parsePorts(inputRaw, 'input').map(d => d.name)
    baselineNodes = new Set([...outputNames, ...inputNames])
  } catch {
    baselineNodes = new Set()
  }
}

/**
 * Get all Carla plugin clients visible in PipeWire.
 * Uses a diff against the baseline snapshot taken before Carla launched.
 * Only returns nodes that appeared AFTER Carla started — this filters out
 * Firefox, Discord, system nodes, and anything else that was already running.
 */
export async function getCarlaPlugins(): Promise<string[]> {
  const output = await exec('pw-link', ['-o'])
  const all = parsePorts(output, 'output')
  return all
    .filter(d => !baselineNodes.has(d.name))
    .map(d => d.name)
}

/**
 * Wait for any new PipeWire port to appear after Carla launch.
 * Returns the name of the first new node, or null on timeout.
 */
export async function waitForCarlaPort(timeoutMs = 15000): Promise<string | null> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const plugins = await getCarlaPlugins()
    if (plugins.length > 0) return plugins[0]

    // Also check for a "Carla" system node in outputs
    try {
      const output = await exec('pw-link', ['-o'])
      const all = parsePorts(output, 'output')
      const carlaNode = all.find(d =>
        !baselineNodes.has(d.name) && !d.name.startsWith('alsa_')
      )
      if (carlaNode) return carlaNode.name
    } catch {
      // pw-link not available yet
    }

    await new Promise(r => setTimeout(r, 500))
  }
  return null
}

/**
 * Discover Carla's actual PipeWire routing ports after launch.
 * Scans for new nodes (post-baseline) and finds input/output port pairs.
 *
 * Works for both:
 * - Individual plugins visible (e.g., "Calf Compressor:In L")
 * - Single Carla node (e.g., "Carla:audio-in1")
 */
export async function discoverCarlaRoutingPorts(): Promise<{
  inputPorts: { left: string; right: string } | null
  outputPorts: { left: string; right: string } | null
}> {
  const result = { inputPorts: null as { left: string; right: string } | null, outputPorts: null as { left: string; right: string } | null }

  try {
    // Find new output nodes (Carla's audio outputs we route to speaker)
    const outputRaw = await exec('pw-link', ['-o'])
    const outputNodes = parsePorts(outputRaw, 'output')
      .filter(d => !baselineNodes.has(d.name) && !d.name.startsWith('alsa_'))

    if (outputNodes.length > 0) {
      const lastNode = outputNodes[outputNodes.length - 1]
      const ports = lastNode.ports
      // Try common port naming patterns
      const left = findPort(ports, ['Out L', 'audio-out1', 'output_FL', 'out_1', 'Out #1'])
      const right = findPort(ports, ['Out R', 'audio-out2', 'output_FR', 'out_2', 'Out #2'])
      if (left && right) {
        result.outputPorts = { left: `${lastNode.name}:${left}`, right: `${lastNode.name}:${right}` }
      } else if (ports.length >= 2) {
        // Fallback: use first two ports
        result.outputPorts = { left: `${lastNode.name}:${ports[0]}`, right: `${lastNode.name}:${ports[1]}` }
      }
    }

    // Find new input nodes (Carla's audio inputs we send mic to)
    // Capture baseline for inputs too
    const inputRaw = await exec('pw-link', ['-i'])
    const inputNodes = parsePorts(inputRaw, 'input')
      .filter(d => !baselineNodes.has(d.name) && !d.name.startsWith('alsa_'))

    if (inputNodes.length > 0) {
      const firstNode = inputNodes[0]
      const ports = firstNode.ports
      const left = findPort(ports, ['In L', 'audio-in1', 'input_FL', 'in_1', 'In #1'])
      const right = findPort(ports, ['In R', 'audio-in2', 'input_FR', 'in_2', 'In #2'])
      if (left && right) {
        result.inputPorts = { left: `${firstNode.name}:${left}`, right: `${firstNode.name}:${right}` }
      } else if (ports.length >= 2) {
        result.inputPorts = { left: `${firstNode.name}:${ports[0]}`, right: `${firstNode.name}:${ports[1]}` }
      }
    }
  } catch {
    // PipeWire not available
  }

  return result
}

/** Find a port matching any of the candidate names (case-insensitive) */
function findPort(ports: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const match = ports.find(p => p.toLowerCase() === candidate.toLowerCase())
    if (match) return match
  }
  return null
}

/**
 * Get PipeWire default source (mic) name.
 */
export async function getDefaultSource(): Promise<string | null> {
  try {
    const output = await exec('pactl', ['get-default-source'])
    return output.trim() || null
  } catch {
    return null
  }
}

/**
 * Get PipeWire default sink (output) name.
 */
export async function getDefaultSink(): Promise<string | null> {
  try {
    const output = await exec('pactl', ['get-default-sink'])
    return output.trim() || null
  } catch {
    return null
  }
}
