# Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      PipeWire                            │
│                   (audio server)                         │
│                                                          │
│  ┌──────────┐    ┌──────────────────┐    ┌───────────┐  │
│  │   Any    │    │     Carla        │    │   Any     │  │
│  │   Mic    │───►│  (plugin host)   │───►│  Output   │  │
│  │  Input   │    │                  │    │  Device   │  │
│  └──────────┘    │  ┌────────────┐  │    └───────────┘  │
│                  │  │ Plugin 1   │  │                    │
│                  │  │ Plugin 2   │  │                    │
│                  │  │ ...        │  │                    │
│                  │  └────────────┘  │                    │
│                  └──────────────────┘                    │
└─────────────────────────────────────────────────────────┘
        ▲
        │ pw-link commands
        │
┌───────┴──────┐
│   Persona    │  ◄── Electron desktop app
│  (switcher)  │      React + Tailwind UI
└──────────────┘      System tray + mini panel
```

## Component Responsibilities

### PipeWire (system service)
- Routes all audio between devices and applications
- Provides JACK compatibility layer for Carla
- Provides PulseAudio compatibility for desktop audio
- Manages audio links (connections between ports)

### Carla (Flatpak or native)
- Hosts LV2 and LADSPA audio plugins
- Exposes each plugin as a JACK client in PipeWire
- Provides visual GUIs for tweaking plugin parameters
- Saves/loads plugin states via `.carxp` project files
- Managed by Persona (auto-start, crash detection, health monitoring)

### Persona (this project)
- **Electron main process**: PipeWire service, Carla lifecycle, preset storage, device discovery
- **React renderer**: Preset grid with CRUD, device dropdowns, Carla controls, status bar, toasts
- **System tray**: Preset switching, show/hide window, quit
- **Mini panel**: Detachable always-on-top compact preset view
- No audio processing — purely a routing controller

## Electron Process Model

```
Main Process (Node.js)              Renderer Process (Chromium)
├── PipeWireService (pw-link CLI)   ├── React App
├── CarlaService (spawn/health)     │   ├── PresetPanel (CRUD grid)
├── DeviceService (discovery)       │   ├── PresetEditor (drag-drop)
├── PresetStore (JSON persistence)  │   ├── DeviceSelector (dropdowns)
├── TrayManager                     │   ├── CarlaControls
└── MiniPanel window                │   ├── StatusBar
                                    │   └── ToastContainer
                                    └── IPC bridge (preload)
```

Communication: Electron IPC via contextBridge. Renderer never calls system APIs directly.

## Data Flow

### Preset with plugins (e.g., "Techpriest")
```
Mic:capture_FL ──► Plugin1:In L ──► Plugin2:In L ──► ... ──► Output:playback_FL
Mic:capture_FR ──► Plugin1:In R ──► Plugin2:In R ──► ... ──► Output:playback_FR
```

### Normal (no effects)
```
Mic:capture_FL ──► Output:playback_FL
Mic:capture_FR ──► Output:playback_FR
```

### Off
All links disconnected. No audio monitoring.

## Preset Switching Mechanism

1. User clicks a preset button (main window, mini panel, or tray)
2. Current active links are disconnected in parallel (Promise.allSettled)
3. If preset has plugins and Carla isn't running, auto-launch Carla and wait for plugins
4. New links are built based on preset's plugin chain
5. Links are created in parallel
6. Status broadcast to all windows and tray
