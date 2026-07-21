# Adding New Voice Presets

## For users: the New Voice wizard

1. Click **New Voice** in the header
2. Pick an archetype:
   - **Techpriest** — cold metallic machine-priest (ring mod core)
   - **Demon** — deep pitched-down growl with saturation
   - **Vox Caster** — crackling battlefield radio
   - **Cavern Spirit** — distant echoing presence
   - **Multitudes** — a legion speaking in unison (detune + multi-chorus)
   - **Psychic Chorus** — ethereal choir inside the mind
   - **Insect** — chittering hive-thing (high ring mod + bit decimation)
   - **Aquatic People** — muffled wavering deep-water voice
   - **Elf** — lifted, airy, silver shimmer
   - **Wizard** — lowered voice with weight and trailing echo
   - **Astartes** — deep transhuman rumble through a helmet vox-grille
   - **Psychic Sage** — serene voice arriving from everywhere at once
   - **Child** — pitched up, thin and bright
   - **Servitor** — lobotomized degraded mono-drone
   - **Wraith** — hollow whisper, more echo than voice
3. Name it, click **Create Voice**

Persona generates a complete Carla project (`~/.config/persona/voices/<name>.carxp`)
with the plugin chain wired and curated parameters, plus the preset pointing at
it. It works immediately — no Carla interaction required.

To fine-tune: open Carla while the voice is active, double-click a plugin,
adjust, File → Save.

There is also **New Preset** (in the preset grid) for presets that reference an
existing `.carxp` you made yourself, and Off / passthrough presets.

## For developers: adding an archetype

Archetypes live in `electron/services/voices.ts` (`ARCHETYPES`). Each is a
chain of plugins with LV2 URI, audio port names, and parameter overrides:

```ts
{
  name: 'Calf Reverb',
  uri: 'http://calf.sourceforge.net/plugins/Reverb',
  inPorts: STEREO_IN, outPorts: STEREO_OUT,   // mono plugins: ['Input'], ['Output']
  params: [
    { index: 3, name: 'Decay time', symbol: 'decay_time', value: 1.8 }
  ]
}
```

Rules that make generated projects load correctly:

- **Plugins must exist in the Flathub extensions** (Calf, SWH — see
  `docs/carla-setup.md`). Notably Calf Pitch is NOT in the extension; use SWH
  `AM pitchshifter` for pitch.
- **Parameter `index`** = the plugin's LV2 control ports numbered sequentially
  in port order (audio ports skipped). Extract from the extension's TTL files:
  `/var/lib/flatpak/runtime/org.freedesktop.LinuxAudio.Plugins.Calf/x86_64/<branch>/active/files/lv2/calf.lv2/*.ttl`
  — count `ControlPort` entries in `lv2:index` order. Validated against real
  Carla-saved projects (symbol is also written, which Carla can fall back to).
- **Port names** are the LV2 port *names* (not symbols): Calf uses
  `In L`/`In R`/`Out L`/`Out R`; SWH AM pitchshifter uses `Input`/`Output`.
- Internal patchbay hardware endpoints are `Audio Input:Left/Right` and
  `Audio Output:Left/Right`. Mono plugins are fanned in/out automatically by
  `buildConnections()`.
- No duplicate plugin names in one chain (Carla would suffix ` (2)` and the
  generated connections would miss).

`voices.test.ts` validates every archetype against the same `validateCarxp`
gate used at activation — a new archetype with a broken chain fails CI.

## Verifying a chain end-to-end (headless, silent)

```bash
flatpak run --env=JACK_NO_START_SERVER=1 studio.kx.carla --no-gui <file>.carxp
# wait for the node:  pw-link -o | grep Carla
# feed it a tone with autoconnect OFF (never touches speakers), record its output:
pw-cat -p -P '{ node.autoconnect = false, node.name = "test-src" }' sine.wav &
pw-cat -r -P '{ node.autoconnect = false, node.name = "test-rec" }' out.wav &
pw-link test-src:output_FL Carla:audio-in1   # + FR/in2, out1/rec pairs
```

A wired chain produces transformed output (e.g. ring-mod sidebands at
carrier±mod); an unwired one records silence. Always use
`node.autoconnect = false` — pw-cat's `--target` does not link to JACK client
nodes and silently falls back to the speakers.

## Preset Operations

| Action | How |
|---|---|
| Switch presets | Click the preset button |
| Edit a preset | Right-click → Edit |
| Duplicate | Right-click → Duplicate |
| Delete | Right-click → Delete (factory presets are protected) |
| Reorder | Drag presets to rearrange |

## Config File

Presets are stored in `~/.config/persona/presets.json` (schema v3): each preset
is `{ id, name, color, carxpPath?, groupId?, volume?, hotbarSlot?, isFactory }`.
There is no plugin list — the `.carxp` file is the single source of truth for
the chain. **Off** (no carxpPath) disconnects everything; presets without a
carxpPath act as direct passthrough.
