import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { VoiceArchetype } from '../../src/types'

/**
 * Voice archetype generator — produces complete, wired Carla project files
 * (.carxp) so users never have to build plugin chains in Carla's GUI.
 *
 * Format verified against real Carla-2.5-saved projects:
 * - Patchbay connections are `<Patchbay><Connection><Source>Client:Port</Source>...`
 * - In patchbay process mode the hardware nodes are "Audio Input" (ports
 *   Left/Right) and "Audio Output" (ports Left/Right).
 * - Plugin patchbay clients are named by plugin name; Calf audio ports are
 *   "In L"/"In R"/"Out L"/"Out R"; SWH AM pitchshifter is mono "Input"/"Output".
 * - Parameter indices = sequential numbering of the plugin's LV2 control ports
 *   in port order (validated against Calf Reverb in a real project file).
 */

const VOICES_DIR = join(homedir(), '.config', 'persona', 'voices')

interface PluginParam {
  index: number
  name: string
  symbol: string
  value: number
}

interface ChainPlugin {
  name: string
  uri: string
  /** Audio port names as they appear in Carla's patchbay */
  inPorts: string[]
  outPorts: string[]
  params: PluginParam[]
}

interface ArchetypeDef {
  id: string
  name: string
  description: string
  color: string
  chain: ChainPlugin[]
}

const STEREO_IN = ['In L', 'In R']
const STEREO_OUT = ['Out L', 'Out R']

// Parameter indices/symbols extracted from the LV2 TTLs shipped in the
// Flathub plugin extensions (Calf 0.90.x, SWH 0.4.17) — see docs/adding-voices.md.
const ARCHETYPES: ArchetypeDef[] = [
  {
    id: 'techpriest',
    name: 'Techpriest',
    description: 'Cold, metallic machine-priest. Ring modulation over a flattened, presence-boosted voice.',
    color: '#b45309',
    chain: [
      {
        name: 'Calf Compressor',
        uri: 'http://calf.sourceforge.net/plugins/Compressor',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 6, name: 'Threshold', symbol: 'threshold', value: 0.0625 },
          { index: 7, name: 'Ratio', symbol: 'ratio', value: 8 },
          { index: 8, name: 'Attack', symbol: 'attack', value: 5 },
          { index: 9, name: 'Release', symbol: 'release', value: 120 },
          { index: 10, name: 'Makeup Gain', symbol: 'makeup', value: 2 }
        ]
      },
      {
        name: 'Calf Equalizer 8 Band',
        uri: 'http://calf.sourceforge.net/plugins/Equalizer8Band',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 11, name: 'HP Active', symbol: 'hp_active', value: 1 },
          { index: 12, name: 'HP Freq', symbol: 'hp_freq', value: 250 },
          { index: 27, name: 'F1 Active', symbol: 'p1_active', value: 1 },
          { index: 28, name: 'Level 1', symbol: 'p1_level', value: 0.5 },
          { index: 29, name: 'Freq 1', symbol: 'p1_freq', value: 1100 },
          { index: 30, name: 'Q 1', symbol: 'p1_q', value: 1.5 },
          { index: 31, name: 'F2 Active', symbol: 'p2_active', value: 1 },
          { index: 32, name: 'Level 2', symbol: 'p2_level', value: 2 },
          { index: 33, name: 'Freq 2', symbol: 'p2_freq', value: 3200 },
          { index: 34, name: 'Q 2', symbol: 'p2_q', value: 1 }
        ]
      },
      {
        name: 'Calf Ring Modulator',
        uri: 'http://calf.sourceforge.net/plugins/RingModulator',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 12, name: 'Mod Freq', symbol: 'mod_freq', value: 150 },
          { index: 13, name: 'Mod Amount', symbol: 'mod_amount', value: 0.75 }
        ]
      },
      {
        name: 'Calf Flanger',
        uri: 'http://calf.sourceforge.net/plugins/Flanger',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 0, name: 'Min delay', symbol: 'min_delay', value: 3 },
          { index: 1, name: 'Mod depth', symbol: 'mod_depth', value: 3 },
          { index: 3, name: 'Feedback', symbol: 'feedback', value: 0.7 },
          { index: 6, name: 'Amount', symbol: 'amount', value: 0.6 }
        ]
      },
      {
        name: 'Calf Reverb',
        uri: 'http://calf.sourceforge.net/plugins/Reverb',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 3, name: 'Decay time', symbol: 'decay_time', value: 1.8 },
          { index: 4, name: 'High Frq Damp', symbol: 'hf_damp', value: 8000 },
          { index: 5, name: 'Room size', symbol: 'room_size', value: 2 },
          { index: 7, name: 'Wet Amount', symbol: 'amount', value: 0.25 }
        ]
      }
    ]
  },
  {
    id: 'demon',
    name: 'Demon',
    description: 'Deep pitched-down growl with saturation and a dark cavernous tail.',
    color: '#991b1b',
    chain: [
      {
        name: 'AM pitchshifter',
        uri: 'http://plugin.org.uk/swh-plugins/amPitchshift',
        inPorts: ['Input'], outPorts: ['Output'],
        params: [
          // 2^(-5/12) ≈ 0.749 — five semitones down
          { index: 0, name: 'Pitch shift', symbol: 'pitch', value: 0.749 },
          { index: 1, name: 'Buffer size', symbol: 'size', value: 4 }
        ]
      },
      {
        name: 'Calf Saturator',
        uri: 'http://calf.sourceforge.net/plugins/Saturator',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 12, name: 'Saturation', symbol: 'drive', value: 7 }
        ]
      },
      {
        name: 'Calf Reverb',
        uri: 'http://calf.sourceforge.net/plugins/Reverb',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 3, name: 'Decay time', symbol: 'decay_time', value: 2.5 },
          { index: 4, name: 'High Frq Damp', symbol: 'hf_damp', value: 4000 },
          { index: 5, name: 'Room size', symbol: 'room_size', value: 4 },
          { index: 7, name: 'Wet Amount', symbol: 'amount', value: 0.3 }
        ]
      }
    ]
  },
  {
    id: 'voxcaster',
    name: 'Vox Caster',
    description: 'Crackling battlefield comms. Narrow bandpass with hard saturation, like a war-torn radio.',
    color: '#3f6212',
    chain: [
      {
        name: 'Calf Filter',
        uri: 'http://calf.sourceforge.net/plugins/Filter',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 0, name: 'Frequency', symbol: 'freq', value: 1800 },
          { index: 1, name: 'Resonance', symbol: 'res', value: 1.5 },
          // 7 = 12dB/oct Bandpass
          { index: 2, name: 'Mode', symbol: 'mode', value: 7 }
        ]
      },
      {
        name: 'Calf Saturator',
        uri: 'http://calf.sourceforge.net/plugins/Saturator',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 12, name: 'Saturation', symbol: 'drive', value: 6 }
        ]
      },
      {
        name: 'Calf Compressor',
        uri: 'http://calf.sourceforge.net/plugins/Compressor',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 6, name: 'Threshold', symbol: 'threshold', value: 0.125 },
          { index: 7, name: 'Ratio', symbol: 'ratio', value: 6 },
          { index: 10, name: 'Makeup Gain', symbol: 'makeup', value: 1.5 }
        ]
      }
    ]
  },
  {
    id: 'cavern',
    name: 'Cavern Spirit',
    description: 'Distant echoing presence. Long delay repeats dissolving into a vast reverb.',
    color: '#1e40af',
    chain: [
      {
        name: 'Calf Vintage Delay',
        uri: 'http://calf.sourceforge.net/plugins/VintageDelay',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 11, name: 'Subdivide', symbol: 'subdiv', value: 4 },
          { index: 12, name: 'Time L', symbol: 'time_l', value: 3 },
          { index: 13, name: 'Time R', symbol: 'time_r', value: 5 },
          { index: 14, name: 'Feedback', symbol: 'feedback', value: 0.45 },
          { index: 15, name: 'Wet', symbol: 'amount', value: 0.35 },
          { index: 24, name: 'BPM', symbol: 'bpm', value: 90 }
        ]
      },
      {
        name: 'Calf Reverb',
        uri: 'http://calf.sourceforge.net/plugins/Reverb',
        inPorts: STEREO_IN, outPorts: STEREO_OUT,
        params: [
          { index: 3, name: 'Decay time', symbol: 'decay_time', value: 3.5 },
          { index: 4, name: 'High Frq Damp', symbol: 'hf_damp', value: 3500 },
          { index: 5, name: 'Room size', symbol: 'room_size', value: 5 },
          { index: 6, name: 'Diffusion', symbol: 'diffusion', value: 0.7 },
          { index: 7, name: 'Wet Amount', symbol: 'amount', value: 0.45 }
        ]
      }
    ]
  }
]

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
}

function pluginXml(plugin: ChainPlugin): string {
  const params = plugin.params
    .map(
      p => `   <Parameter>
    <Index>${p.index}</Index>
    <Name>${xmlEscape(p.name)}</Name>
    <Symbol>${xmlEscape(p.symbol)}</Symbol>
    <Value>${p.value}</Value>
   </Parameter>`
    )
    .join('\n\n')

  return ` <Plugin>
  <Info>
   <Type>LV2</Type>
   <Name>${xmlEscape(plugin.name)}</Name>
   <URI>${xmlEscape(plugin.uri)}</URI>
  </Info>

  <Data>
   <Active>Yes</Active>
${params ? params + '\n' : ''}  </Data>
 </Plugin>`
}

function connectionXml(source: string, target: string): string {
  return `  <Connection>
   <Source>${xmlEscape(source)}</Source>
   <Target>${xmlEscape(target)}</Target>
  </Connection>`
}

/**
 * Wire the chain: hardware input → plugin 1 → ... → plugin N → hardware output.
 * Mono plugins fan in (both channels → single input) and fan out (single
 * output → both next inputs).
 */
function buildConnections(chain: ChainPlugin[]): Array<{ source: string; target: string }> {
  const connections: Array<{ source: string; target: string }> = []
  const hwIn = ['Audio Input:Left', 'Audio Input:Right']
  const hwOut = ['Audio Output:Left', 'Audio Output:Right']

  const portRef = (plugin: ChainPlugin, port: string) => `${plugin.name}:${port}`

  const connectStage = (sources: string[], targetPlugin: ChainPlugin) => {
    const targets = targetPlugin.inPorts.map(p => portRef(targetPlugin, p))
    if (targets.length === 1) {
      // Fan in: every source channel feeds the mono input
      for (const s of sources) connections.push({ source: s, target: targets[0] })
    } else {
      // Stereo: match channels; a mono source feeds both
      for (let i = 0; i < targets.length; i++) {
        connections.push({ source: sources[Math.min(i, sources.length - 1)], target: targets[i] })
      }
    }
  }

  let sources = hwIn
  for (const plugin of chain) {
    connectStage(sources, plugin)
    sources = plugin.outPorts.map(p => portRef(plugin, p))
  }
  // Last plugin → hardware output
  for (let i = 0; i < hwOut.length; i++) {
    connections.push({ source: sources[Math.min(i, sources.length - 1)], target: hwOut[i] })
  }
  return connections
}

/** Generate the full .carxp XML for an archetype. Exported for tests. */
export function generateCarxpXml(archetype: ArchetypeDef): string {
  const plugins = archetype.chain.map(pluginXml).join('\n\n')
  const connections = buildConnections(archetype.chain)
    .map(c => connectionXml(c.source, c.target))
    .join('\n')

  return `<?xml version='1.0' encoding='UTF-8'?>
<!DOCTYPE CARLA-PROJECT>
<CARLA-PROJECT VERSION='2.0'>

${plugins}

 <Patchbay>
${connections}
 </Patchbay>

</CARLA-PROJECT>
`
}

export function getArchetypes(): VoiceArchetype[] {
  return ARCHETYPES.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    color: a.color,
    pluginNames: a.chain.map(p => p.name)
  }))
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'voice'
}

export function generateVoice(
  archetypeId: string,
  voiceName: string,
  dir = VOICES_DIR
): { path: string; archetype: VoiceArchetype } {
  const def = ARCHETYPES.find(a => a.id === archetypeId)
  if (!def) throw new Error(`Unknown voice archetype: ${archetypeId}`)

  mkdirSync(dir, { recursive: true })

  const slug = slugify(voiceName)
  let path = join(dir, `${slug}.carxp`)
  let counter = 2
  while (existsSync(path)) {
    path = join(dir, `${slug}-${counter}.carxp`)
    counter++
  }

  writeFileSync(path, generateCarxpXml(def))

  const archetype = getArchetypes().find(a => a.id === archetypeId)!
  return { path, archetype }
}
