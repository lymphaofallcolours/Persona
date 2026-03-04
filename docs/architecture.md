# Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      PipeWire 1.0.7                     │
│                   (audio server layer)                  │
│                                                         │
│  ┌──────────┐    ┌──────────────────┐    ┌───────────┐  │
│  │ Soundbase│    │     Carla        │    │  Laptop   │  │
│  │ N32 Mic  │───►│  (plugin host)   │───►│ Headphone │  │
│  │  (USB)   │    │                  │    │   Jack    │  │
│  └──────────┘    │  ┌────────────┐  │    └───────────┘  │
│                  │  │ Compressor │  │                    │
│                  │  │ EQ 8-Band  │  │                    │
│                  │  │ Ring Mod   │  │                    │
│                  │  │ Flanger    │  │                    │
│                  │  │ Reverb     │  │                    │
│                  │  └────────────┘  │                    │
│                  └──────────────────┘                    │
└─────────────────────────────────────────────────────────┘
        ▲
        │ pw-link commands
        │
┌───────┴──────┐
│  Persona   │  ◄── Python/Tk GUI
│  (switcher)  │      Always-on-top window
└──────────────┘      with preset buttons
```

## Component Responsibilities

### PipeWire (system service)
- Routes all audio between devices and applications
- Provides JACK compatibility layer for Carla
- Provides PulseAudio compatibility for desktop audio
- Manages audio links (connections between ports)

### Carla (Flatpak application)
- Hosts LV2 and LADSPA audio plugins
- Exposes each plugin as a JACK client in PipeWire
- Provides visual GUIs for tweaking plugin parameters
- Saves/loads plugin states via `.carxp` project files
- Must be running for any effects-based preset to work

### persona.py (this project)
- Small always-on-top GUI with one button per voice preset
- Switches voices by rewiring PipeWire links (via `pw-link` CLI)
- Tracks active links to minimize disconnect overhead
- Runs all pw-link commands in parallel threads for speed
- No audio processing — purely a routing controller

### mic-monitor-toggle (hotkey script)
- Separate script at `~/.local/bin/mic-monitor-toggle`
- Toggles mic monitoring on/off via hotkey
- Auto-detects whether Carla is running and routes accordingly
- Carla running: wires full plugin chain
- Carla not running: wires mic direct to headphones

## Data Flow

### Preset with plugins (e.g., "Techpriest")
```
Mic:capture_FL ──► Calf Compressor:In L ──► Calf EQ:In L ──► Calf Ring Mod:In L ──► Calf Flanger:In L ──► Calf Reverb:In L ──► Headphones:playback_FL
Mic:capture_FR ──► Calf Compressor:In R ──► Calf EQ:In R ──► Calf Ring Mod:In R ──► Calf Flanger:In R ──► Calf Reverb:In R ──► Headphones:playback_FR
```

### Normal (no effects)
```
Mic:capture_FL ──► Headphones:playback_FL
Mic:capture_FR ──► Headphones:playback_FR
```

### Off
All links disconnected. No audio monitoring.

## Preset Switching Mechanism

1. User clicks a button in Persona
2. A background thread is spawned (keeps UI responsive)
3. All currently active links are disconnected in parallel
4. New links for the selected preset are created in parallel
5. UI updates to reflect the active preset
