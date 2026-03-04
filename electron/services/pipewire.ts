import { execFile } from 'child_process'

const PW_LINK = 'pw-link'
const TIMEOUT_MS = 2000

function exec(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(PW_LINK, args, { timeout: TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`pw-link ${args.join(' ')} failed: ${stderr || error.message}`))
        return
      }
      resolve(stdout)
    })
  })
}

export interface AudioLink {
  source: string
  destination: string
}

export async function listOutputPorts(): Promise<string[]> {
  const output = await exec(['-o'])
  return output.trim().split('\n').filter(Boolean)
}

export async function listInputPorts(): Promise<string[]> {
  const output = await exec(['-i'])
  return output.trim().split('\n').filter(Boolean)
}

export async function listLinks(): Promise<AudioLink[]> {
  const output = await exec(['-l'])
  const links: AudioLink[] = []
  const lines = output.trim().split('\n').filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // pw-link -l output format: source -> destination (indented lines show connections)
    // Lines starting without whitespace are output ports
    // Lines starting with whitespace are their linked input ports
    if (line.startsWith('   ') || line.startsWith('\t')) {
      // This is a destination linked to the previous source
      const destination = line.trim().replace(/^\|-> /, '')
      if (i > 0) {
        // Find the most recent non-indented line (the source)
        for (let j = i - 1; j >= 0; j--) {
          const candidate = lines[j]
          if (!candidate.startsWith('   ') && !candidate.startsWith('\t')) {
            links.push({ source: candidate.trim(), destination })
            break
          }
        }
      }
    }
  }

  return links
}

export async function connect(source: string, destination: string): Promise<void> {
  await exec([source, destination])
}

export async function disconnect(source: string, destination: string): Promise<void> {
  await exec(['-d', source, destination])
}

export async function connectBatch(links: AudioLink[]): Promise<void> {
  await Promise.allSettled(links.map(l => connect(l.source, l.destination)))
}

export async function disconnectBatch(links: AudioLink[]): Promise<void> {
  await Promise.allSettled(links.map(l => disconnect(l.source, l.destination)))
}

/**
 * Build direct mic-to-output links for monitoring (hearing yourself).
 */
export function buildMonitorLinks(
  inputDevice: string,
  outputDevice: string
): AudioLink[] {
  return [
    { source: `${inputDevice}:capture_FL`, destination: `${outputDevice}:playback_FL` },
    { source: `${inputDevice}:capture_FR`, destination: `${outputDevice}:playback_FR` }
  ]
}

/**
 * Build the link chain for a preset.
 * - Empty plugins + name "Off": no links (disconnect everything)
 * - Empty plugins: direct mic → output passthrough
 * - With plugins: mic → plugin1 → plugin2 → ... → output
 */
export function buildPresetLinks(
  inputDevice: string,
  outputDevice: string,
  plugins: string[],
  isOff: boolean
): AudioLink[] {
  if (isOff) return []

  if (plugins.length === 0) {
    return [
      { source: `${inputDevice}:capture_FL`, destination: `${outputDevice}:playback_FL` },
      { source: `${inputDevice}:capture_FR`, destination: `${outputDevice}:playback_FR` }
    ]
  }

  const links: AudioLink[] = []

  // Mic → first plugin
  links.push(
    { source: `${inputDevice}:capture_FL`, destination: `${plugins[0]}:In L` },
    { source: `${inputDevice}:capture_FR`, destination: `${plugins[0]}:In R` }
  )

  // Plugin chain
  for (let i = 0; i < plugins.length - 1; i++) {
    links.push(
      { source: `${plugins[i]}:Out L`, destination: `${plugins[i + 1]}:In L` },
      { source: `${plugins[i]}:Out R`, destination: `${plugins[i + 1]}:In R` }
    )
  }

  // Last plugin → output
  const last = plugins[plugins.length - 1]
  links.push(
    { source: `${last}:Out L`, destination: `${outputDevice}:playback_FL` },
    { source: `${last}:Out R`, destination: `${outputDevice}:playback_FR` }
  )

  return links
}
