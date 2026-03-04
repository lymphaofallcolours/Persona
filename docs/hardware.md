# Hardware

## System

- **Laptop**: Lenovo ThinkPad T440p
- **OS**: Zorin OS (based on Ubuntu 22.04 Jammy)
- **Kernel**: Linux 6.8.0-100-generic

## Microphone: Monster Soundbase N32

- **Connection**: USB (Bus 003)
- **ALSA card**: Card 2, `Soundbase N32` (USB-Audio driver)
- **PipeWire source name**: `alsa_input.usb-MaiYueTech_Soundbase_N32_20250701_1821_V1.0-01.analog-stereo`
- **PipeWire sink name** (speaker output on device): `alsa_output.usb-MaiYueTech_Soundbase_N32_20250701_1821_V1.0-01.analog-stereo`
- **Sample format**: s24le 2ch 48000Hz

The Soundbase N32 is both a microphone and a speaker/output device.
**Do not route audio output to the Soundbase while using it as a mic** — this creates
a feedback loop (the mic picks up the speaker output).

## Audio Output: Laptop Built-in

- **PipeWire sink name**: `alsa_output.pci-0000_00_1b.0.analog-stereo`
- **Active port**: Headphones (3.5mm jack)
- **Sample format**: s32le 2ch 48000Hz

Headphones must be plugged into the **laptop's headphone jack**, not the Soundbase.

## Verifying Device Detection

```bash
# List USB devices
lsusb | grep -i sound

# List PipeWire sinks (outputs)
pactl list sinks short

# List PipeWire sources (inputs)
pactl list sources short

# Check default devices
pactl info | grep -E "Default Sink|Default Source"
```

## Setting Defaults

```bash
# Set mic as default input
pactl set-default-source alsa_input.usb-MaiYueTech_Soundbase_N32_20250701_1821_V1.0-01.analog-stereo

# Set laptop audio as default output
pactl set-default-sink alsa_output.pci-0000_00_1b.0.analog-stereo
```
