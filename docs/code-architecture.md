# Code Architecture

## Overview

Persona is an Electron desktop app that switches voice effect presets by
rewiring PipeWire audio links between microphones, Carla-hosted plugins,
and output devices. Built with React + Tailwind CSS for the UI.

## Directory Structure

```
persona/
├── electron/                    # Main process (Node.js)
│   ├── main.ts                  # App entry, window management, tray
│   ├── preload.ts               # IPC bridge (contextBridge)
│   ├── tray.ts                  # System tray management
│   ├── services/
│   │   ├── pipewire.ts          # pw-link CLI wrapper
│   │   ├── carla.ts             # Carla lifecycle (spawn, health, crash)
│   │   ├── carlaOsc.ts          # OSC client for Carla parameter control
│   │   ├── devices.ts           # Device discovery + default detection
│   │   ├── presets.ts           # JSON config persistence (CRUD)
│   │   ├── carxp.ts             # .carxp validation (plugins, patchbay)
│   │   ├── setup.ts             # Setup doctor: system checks + user-scope fixes
│   │   └── voices.ts            # Voice archetype → wired .carxp generator
│   └── ipc/
│       ├── channels.ts          # IPC channel name constants
│       └── handlers.ts          # ipcMain handler registration
├── src/                         # Renderer process (React)
│   ├── App.tsx                  # Root: routes to MainApp or MiniPanel
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Tailwind import
│   ├── env.d.ts                 # Window.persona type declaration
│   ├── components/
│   │   ├── PresetPanel.tsx      # Preset grid with CRUD + drag reorder
│   │   ├── PresetEditor.tsx     # Create/edit dialog with plugin chain builder
│   │   ├── DeviceSelector.tsx   # Input/output device dropdowns
│   │   ├── CarlaControls.tsx    # Launch/stop button + health indicator
│   │   ├── StatusBar.tsx        # Bottom bar: preset, links, Carla status
│   │   ├── ParameterPanel.tsx   # OSC parameter sliders per plugin
│   │   ├── Toast.tsx            # Auto-dismiss notification system
│   │   ├── MiniPanel.tsx        # Compact view for always-on-top window
│   │   ├── SetupDoctor.tsx      # One-time setup / self-healing checklist modal
│   │   └── NewVoiceWizard.tsx   # Archetype picker → generated voice preset
│   └── types/
│       └── index.ts             # Shared type definitions
├── presets/
│   └── factory.json             # Shipped default presets
└── electron.vite.config.ts      # Build config (main + preload + renderer)
```

## Dependency Rule

Main process services have no cross-dependencies. Each service is standalone:
- `pipewire.ts` — wraps `pw-link` CLI, knows nothing about presets or UI
- `carla.ts` — manages Carla process, knows nothing about PipeWire links
- `carlaOsc.ts` — OSC UDP client for Carla parameter control, knows nothing about presets
- `devices.ts` — discovers PipeWire devices, knows nothing about presets
- `presets.ts` — reads/writes JSON config, knows nothing about audio
- `carxp.ts` — validates .carxp files, knows nothing about Carla's process
- `setup.ts` — checks/repairs system config (flatpak, Carla2.conf), knows nothing about presets
- `voices.ts` — generates .carxp files from archetype data, knows nothing about Carla's process

The IPC handlers (`handlers.ts`) compose these services into use cases.

## Ports & Adapters

### Driving Ports (user → app)

| Port | Adapter(s) | Description |
|------|-----------|-------------|
| Preset Switching | PresetPanel, MiniPanel, Tray menu | User selects a voice preset |
| Preset CRUD | PresetEditor, PresetPanel context menu | Create/edit/delete/duplicate presets |
| Device Selection | DeviceSelector dropdowns | User picks input/output devices |
| Carla Control | CarlaControls buttons | Launch/stop Carla |
| Parameter Control | ParameterPanel sliders | Real-time plugin parameter adjustment via OSC |

### Driven Ports (app → system)

| Port | Adapter | Description |
|------|---------|-------------|
| Audio Routing | `PipeWireService` (`pw-link` CLI) | Create/destroy audio links |
| Plugin Discovery | `DeviceService` (`pw-link -o`) | Query visible Carla plugins |
| Device Discovery | `DeviceService` (`pw-link -o/-i`, `pactl`) | Enumerate audio devices |
| Plugin Host | `CarlaService` (`flatpak run` / `carla`) | Spawn/stop/monitor Carla |
| Plugin Parameters | `CarlaOscService` (`node-osc` UDP) | Set plugin parameters in real time |
| Persistence | `PresetStore` (JSON file) | Read/write preset config |

## Key Data Flows

### Preset Switching
```
User click → IPC preset:activate → activatePreset()
  → disconnectBatch(activeLinks)
  → if plugins && different .carxp: restart Carla, wait for plugins, connect OSC
  → if plugins && same .carxp: skip restart (reuse running Carla)
  → buildPresetLinks(input, output, plugins)
  → connectBatch(newLinks)
  → if parameterSnapshots: restore via OSC (instant)
  → broadcastStatus() → all windows + tray
```

### Device Polling (every 3s)
```
setInterval → getInputDevices() + getOutputDevices()
  → compare with known devices
  → if changed: broadcast devices:changed + toast warnings
```

### Carla Health Polling (every 3s)
```
setInterval → pgrep carla + getCarlaPlugins()
  → compare with known state
  → if changed: broadcastStatus()
  → if crashed: sendToast('error', ...)
```
