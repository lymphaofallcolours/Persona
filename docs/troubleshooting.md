# Troubleshooting

## No sound at all

1. **Check PipeWire is running**:
   ```bash
   systemctl --user status pipewire pipewire-pulse wireplumber
   ```
   All three should be `active (running)`.

2. **Check PulseAudio isn't running** (conflicts with PipeWire-Pulse):
   ```bash
   systemctl --user status pulseaudio
   ```
   Should be `inactive`. If active:
   ```bash
   systemctl --user disable --now pulseaudio.service pulseaudio.socket
   systemctl --user restart pipewire pipewire-pulse wireplumber
   ```

3. **Check mic is detected**:
   ```bash
   pactl list sources short
   ```
   Should list the Soundbase N32.

## Can hear mic but no effects

- **Is Carla running?** Plugins only exist in PipeWire while Carla is open.
- **Is the project loaded?** File → Open → Techpriest.carxp
- **Are links wired?** Check with:
  ```bash
  pw-link -l | grep "Calf"
  ```
  If empty, click a preset button in Persona or use mic-monitor-toggle.

## Continuous high-pitched tone / feedback

Two possible causes:

1. **Test Signal enabled in Easy Effects**: Check
   `~/.var/app/com.github.wwmm.easyeffects/config/easyeffects/db/easyeffectsrc`
   and ensure `[TestSignals] enable=false`.

2. **Feedback loop**: Output is routed to the Soundbase N32 speaker while
   the Soundbase mic is active. Fix:
   ```bash
   pactl set-default-sink alsa_output.pci-0000_00_1b.0.analog-stereo
   ```

## Persona switching is slow

- Ensure the optimized version is running (uses parallel threads and tracks
  active links). Check that `_batch_pw_commands` and `_active_links` exist
  in persona.py.

## Plugins not visible in Carla

Carla Flatpak can't see host plugins by default. Ensure:
1. Plugins are copied to `~/.local/lib/ladspa/` and `~/.local/lib/lv2/`
2. Flatpak overrides are set:
   ```bash
   flatpak override --user --env=LADSPA_PATH=/home/lympha/.local/lib/ladspa studio.kx.carla
   flatpak override --user --env=LV2_PATH=/home/lympha/.local/lib/lv2 studio.kx.carla
   ```
3. After installing new plugin packages, re-copy to `~/.local/lib/`.

## PipeWire version is wrong after upgrade

If `pactl info` still shows old version after `apt upgrade`:
```bash
systemctl --user daemon-reload
systemctl --user restart pipewire pipewire-pulse wireplumber
```

## Easy Effects errors (port_set_io failed)

PipeWire version too old for Easy Effects. Requires PipeWire 1.0.x from the PPA:
```bash
sudo add-apt-repository ppa:pipewire-debian/pipewire-upstream
sudo apt update && sudo apt install pipewire pipewire-pulse wireplumber
```

## After reboot: things to start

1. PipeWire services start automatically (systemd)
2. Open **Carla** and load a project file
3. Launch **Persona**
4. Click a preset button or use mic-monitor-toggle hotkey

Easy Effects is **not** set to autostart (user preference).

## No tray icon (Persona, Discord, and other Electron apps)

**Symptom:** Persona (and every Chromium/Electron app) shows no tray icon, while
Steam and legacy indicator apps do.

**Cause:** the Unity-era `indicator-application-service` daemon (from the
`indicator-application` package, autostarted via `/etc/xdg/autostart/`) grabs
the `org.kde.StatusNotifierWatcher` DBus name at login before Zorin's own
`zorin-appindicator` GNOME extension can. That daemon accepts Chromium-style
tray items but cannot render their icons (it doesn't resolve the
`IconThemePath` mechanism Chromium uses), so they silently vanish.

**Diagnosis:** `busctl --user list | grep StatusNotifierWatcher` — if the owner
is `indicator-appli...` instead of `gnome-shell`, this is the problem.

**Fix (user-level, reversible):**
```bash
mkdir -p ~/.config/autostart
printf '[Desktop Entry]\nType=Application\nName=Indicator Application\nHidden=true\n' \
  > ~/.config/autostart/indicator-application.desktop
pkill -f indicator-application-service
gnome-extensions disable zorin-appindicator@zorinos.com && sleep 1 && \
  gnome-extensions enable zorin-appindicator@zorinos.com
```
All tray icons (including Discord's) reappear. Revert by deleting the override
file and logging out/in.

**Related app-side gotcha:** tray icons must be PNG — Electron's `nativeImage`
silently produces an empty image from SVG paths.
