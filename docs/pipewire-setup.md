# PipeWire Setup

## Version and Source

- PipeWire **1.0.7** from PPA: `ppa:pipewire-debian/pipewire-upstream`
- Base OS: Zorin OS (Ubuntu 22.04 Jammy)
- Default repos only ship PipeWire 0.3.48, which is too old for Easy Effects 8.x

## Installed Packages

```
pipewire
pipewire-pulse    # Replaces PulseAudio
pipewire-jack     # JACK compatibility (used by Carla)
wireplumber       # Session manager
```

## Service Status

PulseAudio is **disabled**. PipeWire handles all audio.

```bash
# These should be active:
systemctl --user status pipewire
systemctl --user status pipewire-pulse
systemctl --user status wireplumber

# These should be disabled:
systemctl --user status pulseaudio.service   # disabled
systemctl --user status pulseaudio.socket    # disabled
```

## How PulseAudio Was Replaced

```bash
systemctl --user disable --now pulseaudio.service pulseaudio.socket
systemctl --user enable --now pipewire-pulse.service wireplumber.service
```

## Verifying the Audio Server

```bash
pactl info | grep "Server Name"
# Should show: PulseAudio (on PipeWire 1.0.7)
```

## Key PipeWire Commands

```bash
pw-link -o              # List output ports
pw-link -i              # List input ports
pw-link -l              # List all links
pw-link <out> <in>      # Create a link
pw-link -d <out> <in>   # Destroy a link
pw-link -I -l           # List links with node IDs
```

## Config Directory

User overrides: `~/.config/pipewire/pipewire.conf.d/`

Currently empty (the voice-grille.conf filter chain was removed in favor of Carla).

## Audio Devices

Default source (mic): `alsa_input.usb-MaiYueTech_Soundbase_N32_20250701_1821_V1.0-01.analog-stereo`
Default sink (output): `alsa_output.pci-0000_00_1b.0.analog-stereo`

Set defaults with:
```bash
pactl set-default-source <name>
pactl set-default-sink <name>
```
