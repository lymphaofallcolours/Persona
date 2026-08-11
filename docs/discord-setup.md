# Discord Setup (Virtual Mic)

**There is no setup.** Flip the **Route to** toggle in Persona's header to
**Discord**, activate a voice, talk. Persona does the rest automatically:

1. It maintains a real virtual microphone — **Persona Virtual Mic** — visible
   to every app as a genuine input device (a PipeWire `Audio/Source/Virtual`
   node, not a sink monitor).
2. The voice chain routes mic → Carla → the virtual mic. Nothing reaches your
   speakers.
3. **Automatic adoption:** while a voice is active, Persona makes the virtual
   mic the system default input *and* actively moves any live call-app capture
   streams (Discord's `WEBRTC VoiceEngine`, browsers) off hardware mics onto
   it — mid-call, no Discord settings touched. A toast reports each move.
4. Adoption is **sticky for the whole Discord-mode session** — it survives Off
   and preset switches. Only switching Route to **Speakers** or quitting
   Persona reverts it (streams move home, the previous default input is
   restored). This is deliberate: flipping the system default input mid-call
   makes Discord raise device-change dialogs and rebind its stream
   unpredictably.
5. **Off in Discord mode = your clean, unprocessed voice** (the call app stays
   on the Persona mic, fed by a direct passthrough). To go silent, use the
   call app's own mute.

The status bar shows live truth while in Discord mode:
- **green "Call: Persona mic"** — a call app is hearing the processed voice
- **amber "Call: RAW mic"** — a call app is still on a hardware mic (activate
  a voice; adoption runs within ~3 s)
- **gray "No call"** — nothing is capturing right now

**Monitor toggle in Discord mode** plays the virtual mic's feed — exactly what
the call hears — through your Output device (relabelled "Monitor Output").

## How it works

```
Mic ──► Carla (effects) ──► persona_virtual_mic (Audio/Source/Virtual)
                                   │ appears as a REAL microphone
                                   ├──► Discord / any call app (auto-adopted)
                                   └──► [Monitor toggle] your headphones
```

## Troubleshooting

- **Status stays amber:** the app resisted adoption (rare). In its own audio
  settings pick "Persona Virtual Mic" — it's a normal microphone entry now,
  not a "Monitor of…" pseudo-device.
- **Voice sounds thinned/gated in the call:** Discord's noise suppression
  (Krisp) eats ring-mod buzz and reverb tails — turn it off or low.
- **Everything reverts on its own:** you probably switched Route to Speakers
  or activated Off — both intentionally release adoption.
- Manual reset of all runtime state: quit Persona (tray → Quit) or reboot;
  the virtual mic and every adoption change are runtime-only.

## History

The first iteration (2026-07-21) exposed a null sink's monitor and required
manual device selection in Discord; it failed in real use for three reasons
recorded in `docs/decisions-log.md` (device-list race hid the pseudo-device,
monitor sources are second-class, no feedback). This zero-config design
replaced it the next day.
