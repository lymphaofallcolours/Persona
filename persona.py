#!/usr/bin/env python3
"""Persona — real-time voice preset switcher for PipeWire + Carla."""

import subprocess
import threading
import tkinter as tk

MIC = "alsa_input.usb-MaiYueTech_Soundbase_N32_20250701_1821_V1.0-01.analog-stereo"
SINK = "alsa_output.pci-0000_00_1b.0.analog-stereo"

# Plugin chain in order (as they appear in Carla)
PLUGINS = [
    "Calf Compressor",
    "Calf Equalizer 8 Band",
    "Calf Ring Modulator",
    "Calf Flanger",
    "Calf Reverb",
]

# Voice presets: name → list of plugins to include in chain (in order)
PRESETS = {
    "Normal": [],
    "Techpriest": [
        "Calf Compressor",
        "Calf Equalizer 8 Band",
        "Calf Ring Modulator",
        "Calf Flanger",
        "Calf Reverb",
    ],
    "Clean": [
        "Calf Compressor",
        "Calf Equalizer 8 Band",
        "Calf Reverb",
    ],
    "Off": None,  # Special: disconnect everything
}

COLORS = {
    "Normal": "#4a9eff",
    "Techpriest": "#cc3333",
    "Clean": "#cc8833",
    "Off": "#666666",
}

# Track current links so we only disconnect what's active
_active_links = []


def _run_pw_link(args):
    """Run a single pw-link command."""
    subprocess.run(["pw-link"] + args, capture_output=True, timeout=2)


def _batch_pw_commands(commands):
    """Run multiple pw-link commands in parallel threads."""
    threads = []
    for cmd in commands:
        t = threading.Thread(target=_run_pw_link, args=(cmd,))
        t.start()
        threads.append(t)
    for t in threads:
        t.join(timeout=3)


def disconnect_current():
    """Remove only the currently active links."""
    global _active_links
    if not _active_links:
        return
    commands = [["-d", src, dst] for src, dst in _active_links]
    _batch_pw_commands(commands)
    _active_links = []


def connect_links(links):
    """Create new links in parallel."""
    global _active_links
    commands = [[src, dst] for src, dst in links]
    _batch_pw_commands(commands)
    _active_links = list(links)


def activate_preset(name, buttons, status_label):
    def _do():
        chain = PRESETS[name]
        disconnect_current()

        if chain is None:
            pass  # Off
        elif len(chain) == 0:
            # Normal: mic → headphones direct
            connect_links([
                (f"{MIC}:capture_FL", f"{SINK}:playback_FL"),
                (f"{MIC}:capture_FR", f"{SINK}:playback_FR"),
            ])
        else:
            links = []
            # Mic → first plugin
            links.append((f"{MIC}:capture_FL", f"{chain[0]}:In L"))
            links.append((f"{MIC}:capture_FR", f"{chain[0]}:In R"))
            # Plugins in series
            for i in range(len(chain) - 1):
                links.append((f"{chain[i]}:Out L", f"{chain[i+1]}:In L"))
                links.append((f"{chain[i]}:Out R", f"{chain[i+1]}:In R"))
            # Last plugin → headphones
            links.append((f"{chain[-1]}:Out L", f"{SINK}:playback_FL"))
            links.append((f"{chain[-1]}:Out R", f"{SINK}:playback_FR"))
            connect_links(links)

        # Update UI from main thread
        status_label.after(0, lambda: status_label.config(text=name))
        for bname, btn in buttons.items():
            if bname == name:
                btn.after(0, lambda b=btn, c=COLORS.get(bname, "#4a9eff"):
                          b.config(relief=tk.SUNKEN, bg=c))
            else:
                btn.after(0, lambda b=btn: b.config(relief=tk.RAISED, bg="#2b2b2b"))

    threading.Thread(target=_do, daemon=True).start()


def main():
    root = tk.Tk()
    root.title("Persona")
    root.configure(bg="#1a1a1a")
    root.attributes("-topmost", True)
    root.resizable(False, False)

    title = tk.Label(root, text="PERSONA", font=("monospace", 11, "bold"),
                     fg="#aaaaaa", bg="#1a1a1a", pady=5)
    title.pack()

    status = tk.Label(root, text="Off", font=("monospace", 10),
                      fg="#ffffff", bg="#1a1a1a", pady=2)
    status.pack()

    buttons = {}
    frame = tk.Frame(root, bg="#1a1a1a", padx=8, pady=4)
    frame.pack()

    for name in PRESETS:
        btn = tk.Button(
            frame,
            text=name,
            font=("monospace", 12, "bold"),
            fg="#ffffff",
            bg="#2b2b2b",
            activebackground=COLORS.get(name, "#4a9eff"),
            activeforeground="#ffffff",
            width=14,
            height=2,
            relief=tk.RAISED,
            bd=2,
            command=lambda n=name: activate_preset(n, buttons, status),
        )
        btn.pack(pady=3)
        buttons[name] = btn

    root.mainloop()


if __name__ == "__main__":
    main()
