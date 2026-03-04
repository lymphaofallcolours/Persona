# Rules for persona.py

- This file is a Python/Tk GUI. It will be migrated to TypeScript — do NOT invest in Python-specific abstractions.
- All PipeWire interaction via subprocess calls to `pw-link`. No dbus, no native bindings.
- Plugin names in PRESETS must exactly match PipeWire client names. Verify with `pw-link -o`.
- The global `_active_links` tracks current state. Always disconnect before reconnecting.
- Threading is used for pw-link parallelism. GUI updates must use `.after(0, ...)` to run on the main thread.
- No external packages. stdlib only (tkinter, subprocess, threading).
