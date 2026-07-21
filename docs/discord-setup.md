# Discord Setup (Virtual Mic)

Persona creates a virtual microphone — **Persona Virtual Mic** — so voice
apps receive the *processed* voice instead of the raw mic. One-time setup:

1. In **Persona**: set the **Output** device to *Persona Virtual Mic (for Discord)*.
2. In **Discord** → User Settings → Voice & Video → Input Device: select
   **Monitor of Persona Virtual Mic**.
3. Activate a voice preset. Talk. Discord hears the modulated voice.

## How it works

```
Mic ──► Carla (effects) ──► persona_virtual_mic (null sink) ──► Discord input
                                    │ (monitor ports)
                                    └──► [optional] your headphones (Monitor toggle)
```

- The virtual mic is a PipeWire null sink (`pactl load-module module-null-sink`),
  created when Persona starts and removed when it quits. Stale instances from a
  crashed run are cleaned up at the next start.
- With the virtual mic as output, **nothing reaches your speakers** — you don't
  hear yourself. The **Monitor** toggle changes meaning here: instead of the raw
  mic, it plays the virtual mic's monitor — the processed voice, exactly what
  the call hears — through your default physical output.
- Keep using your physical output device instead when you want the room to hear
  the voice (in-person sessions).

## Reverting / troubleshooting

- Everything is runtime state: quitting Persona (or `pactl unload-module` on the
  null-sink module, or a reboot) removes the virtual mic entirely.
- Discord shows no "Monitor of Persona Virtual Mic" input → Persona isn't
  running, or the sink failed to create (a toast reports this).
- Discord hears your *raw* voice → Discord's input is set to the real mic, not
  the monitor. Also mute Discord's own noise suppression for effect-heavy
  voices — it can eat ring-mod/reverb tails.
- Discord hears nothing → check the preset is active (links exist:
  `pw-link -l | grep persona_virtual_mic`) and the system-level mic mute toast.
