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
 * Get all Carla plugin clients visible in PipeWire.
 * These are non-ALSA output ports (plugin outputs).
 */
export async function getCarlaPlugins(): Promise<string[]> {
  const output = await exec('pw-link', ['-o'])
  const all = parsePorts(output, 'output')
  return all
    .filter(d => !d.name.startsWith('alsa_') && !d.name.startsWith('pipewire'))
    .map(d => d.name)
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
