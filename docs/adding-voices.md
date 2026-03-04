# Adding New Voice Presets

## Quick Guide (GUI)

1. Open Persona
2. Click the **"+ New Preset"** button at the bottom of the preset grid
3. Enter a name and pick a color
4. Add plugins from the dropdown and reorder them by dragging
5. Click **Save**

## Step-by-Step Example: Adding a "Dark" Voice

### 1. Decide which plugins to use

Check which plugins are loaded in Carla. Common Calf plugins:

| Plugin | Use case |
|---|---|
| Calf Compressor | Dynamics control |
| Calf Equalizer 8 Band | Tone shaping |
| Calf Ring Modulator | Robotic / inhuman effect |
| Calf Flanger | Sweeping metallic effect |
| Calf Reverb | Space / room ambience |
| Calf Pitch | Pitch shifting |
| Calf Phaser | Sweeping phase effect |
| Calf Crusher | Bitcrushing |
| Calf Saturator | Warm overdrive |
| Calf Multi Chorus | Thick chorus |
| Calf Rotary Speaker | Leslie speaker simulation |
| Calf Pulsator | Tremolo |
| Calf Vinyl | Vinyl record simulation |

A "Dark" voice might use: Compressor → EQ → Flanger → Reverb.

### 2. Create the preset in the GUI

1. Click **"+ New Preset"**
2. Name it "Dark", pick a color (e.g. purple `#6633cc`)
3. From the **Add Plugin** dropdown, add in order:
   - Calf Compressor
   - Calf Equalizer 8 Band
   - Calf Flanger
   - Calf Reverb
4. Drag to reorder if needed
5. Click **Save**

The preset appears in your grid immediately.

### 3. Tweak plugin parameters

Open Carla (from the Carla Controls section in Persona) and adjust each plugin's
GUI to get the sound you want. Save the Carla state (File → Save).

## Preset Operations

| Action | How |
|---|---|
| Switch presets | Click the preset button |
| Edit a preset | Right-click → Edit |
| Duplicate | Right-click → Duplicate |
| Delete | Right-click → Delete (factory presets are protected) |
| Reorder | Drag presets to rearrange |

## Using New Plugins

If you need a plugin not currently loaded in Carla:

1. **In Carla**: open the plugin browser, search for the plugin, add it
2. **Wait** for the plugin to appear in PipeWire (Persona auto-detects it)
3. **Edit or create** a preset and add the plugin from the dropdown

Check what plugins PipeWire sees:
```bash
pw-link -o | grep "Calf\|SWH"
```

## Plugin Chain Tips

- **Order matters**: Compressor → EQ → Effects → Reverb is a good default chain
- The **Ring Modulator** is the main "inhuman" effect — without it voices sound processed but human
- Keep **Reverb last** in the chain
- Tweak plugin parameters in **Carla's GUIs**, not in Persona
- Save Carla state after tweaking so settings persist across sessions

## Special Presets

- **Normal** — direct mic-to-headphones passthrough, no plugins
- **Off** — disconnects all audio links (mute monitoring)

These are factory presets and cannot be deleted.

## Config File

Presets are stored in `~/.config/persona/presets.json`. The GUI is the recommended
way to manage presets, but you can edit this file directly if needed. The format:

```json
{
  "version": 1,
  "presets": [
    {
      "id": "uuid",
      "name": "Dark",
      "color": "#6633cc",
      "plugins": ["Calf Compressor", "Calf Equalizer 8 Band", "Calf Flanger", "Calf Reverb"],
      "isFactory": false
    }
  ]
}
```

Plugin names must exactly match their PipeWire client names.
