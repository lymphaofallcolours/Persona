# Persona

Real-time voice preset switcher for tabletop RPG sessions. Rewires PipeWire audio links to route your microphone through Carla-hosted LV2/LADSPA plugin chains — switch between voice effects with a single click.

Built for Warhammer 40K sessions where you need a Techpriest voice on demand.

## Features

- **Preset switching** — click to rewire your entire audio chain instantly
- **Preset editor** — create, edit, duplicate, delete, and drag-to-reorder presets
- **Plugin chain builder** — drag-and-drop plugin ordering per preset
- **Dynamic device discovery** — auto-detects PipeWire input/output devices
- **Carla lifecycle management** — auto-start, crash detection, health monitoring
- **`.carxp` project files** — associate Carla project files with presets
- **Mic monitoring** — hear yourself through headphones with one click
- **System tray** — switch presets from the tray without opening the window
- **Mini panel** — detachable always-on-top floating preset switcher
- **Toast notifications** — instant feedback for errors and status changes

## Requirements

- **Linux** (tested on Zorin OS / Ubuntu 22.04+)
- **Node.js** >= 18
- **PipeWire** with `pipewire-jack` (for Carla JACK compatibility)
- **Carla** — via Flatpak (`flatpak install flathub studio.kx.carla`) or native package
- **Audio plugins** — e.g. `calf-plugins` for LV2 effects

## Quick Start

```bash
# Clone
git clone https://github.com/lymphaofallcolours/Persona.git
cd Persona

# Install dependencies
npm install

# Install git hooks (conventional commits, auto-versioning)
bash scripts/install-hooks.sh

# Run in development mode
npm run dev
```

## Commands

```bash
npm run dev          # Development mode with hot reload
npm run build        # Build for production
npm run package      # Package as .AppImage / .deb
npm run test         # Run unit + component tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright E2E tests (requires build)
```

## How It Works

```
Mic (USB) ──> [Carla plugins in series] ──> Laptop headphone jack
                 rewired by Persona
```

1. **PipeWire** — audio server, moves audio between devices
2. **Carla** — plugin host, keeps LV2/LADSPA effects loaded
3. **Persona** — Electron app: switching GUI + Carla lifecycle + device discovery

Persona never processes audio itself. It's purely a routing controller that calls `pw-link` to connect/disconnect PipeWire ports.

## Setting Up Carla with Flatpak

If using Carla via Flatpak, plugins need explicit path overrides:

```bash
# Copy plugins to user-accessible locations
mkdir -p ~/.local/lib/lv2 ~/.local/lib/ladspa
cp -r /usr/lib/lv2/* ~/.local/lib/lv2/
cp -r /usr/lib/x86_64-linux-gnu/lv2/* ~/.local/lib/lv2/
cp /usr/lib/ladspa/*.so ~/.local/lib/ladspa/

# Set Flatpak overrides
flatpak override --user --env=LV2_PATH=$HOME/.local/lib/lv2 studio.kx.carla
flatpak override --user --env=LADSPA_PATH=$HOME/.local/lib/ladspa studio.kx.carla
```

## Factory Presets

| Preset | Plugins | Description |
|--------|---------|-------------|
| Normal | None | Direct mic-to-output passthrough |
| Techpriest | Compressor, EQ, Ring Mod, Flanger, Reverb | Metallic Warhammer 40K voice |
| Clean | Compressor, EQ, Reverb | Processed but human voice |
| Off | None | Disconnects all audio links |

## Creating Custom Presets

1. Click **"+ New Preset"** in the app
2. Name it, pick a color
3. Add plugins from the dropdown (discovered from PipeWire)
4. Optionally browse for a `.carxp` Carla project file
5. Drag to reorder plugins in the chain
6. Click **Save**

Tweak plugin parameters in Carla's GUI, then save the Carla project.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for system diagrams and [`docs/code-architecture.md`](docs/code-architecture.md) for code-level structure.

## License

GPL-3.0 — see [LICENSE](LICENSE)
