# Audio State Snapshot & Recovery

Safety net for the system audio configuration. Motivated by the Zorin OS 18.0
incident: while working on Persona, Discord audio routing broke persistently
(participants heard the mic doubled during screen share). The breakage survived
reboots because it lived in *persistent* audio state, not in Persona itself.
Upgrading to Zorin OS 18.1 (which moved to native PipeWire audio management)
happened to fix it, but we never had a way to roll back deliberately.

## What can and cannot break

| Layer | Persistent? | Risk |
|---|---|---|
| `pw-link` connections made by Persona | No — gone on reboot / service restart | None after restart |
| `~/.local/state/wireplumber/` | **Yes** | WirePlumber remembers per-app routing targets and volumes (`restore-stream`), default devices (`default-nodes`), device profiles. **This is the usual culprit** when one app (e.g. Discord) suddenly routes wrong while everything else works. |
| `~/.config/pipewire/`, `~/.config/wireplumber/` | **Yes** | User config overrides (loopbacks, virtual devices, filter chains) survive reboots. Currently both contain only empty leftover dirs. |
| systemd `--user` unit enablement | **Yes** | Enabling/masking pipewire units changes what runs at login. `filter-chain.service` is enabled on this machine but its stock config defines no filters, so it is inert. |
| `~/.config/persona/presets.json` | Yes | Persona's own config — low risk, but captured anyway. |

## Taking a snapshot

```bash
bash scripts/audio-snapshot.sh [label]     # e.g. audio-snapshot.sh before-loopback-test
```

Stored under `~/.local/share/persona/audio-snapshots/<timestamp>[-label]/` with a
`latest` symlink. ~350K each. Also captures diagnostics (full `pw-dump` graph,
`pw-link` listings, pactl summaries, package versions) for before/after
comparison — these are not restored, only kept for debugging.

**Take a snapshot before:** editing anything under `~/.config/pipewire/` or
`~/.config/wireplumber/`, loading pactl modules (loopback, echo-cancel),
enabling/masking audio services, or OS upgrades.

## Restoring

```bash
bash scripts/audio-restore.sh                    # list snapshots
bash scripts/audio-restore.sh latest --dry-run   # preview what would change
bash scripts/audio-restore.sh latest             # restore (asks for confirmation)
```

Restore stops the PipeWire stack, makes the config/state dirs **identical** to
the snapshot (files created after the snapshot are deleted; dirs that did not
exist are removed), re-applies systemd unit enablement, and restarts the stack.
Close Discord/Carla/browsers first — their audio streams drop during the
restart and the apps may need restarting.

## Baseline

`20260721-130709-known-good-zorin18.1` — taken on Zorin OS 18.1 (PipeWire 1.0.5,
WirePlumber 0.4.17) with clean routing verified: one analog input, one analog
output, no loopbacks/virtual devices, Discord capture working. If audio ever
behaves strangely after a Persona session, restore this first and see if the
problem disappears.

## Diagnosing "Discord hears me double" specifically

Doubling during screen share means Discord receives the mic via two paths.
Check, in order:

1. `pw-link -l` — is the mic linked both directly to Discord's capture *and*
   through a Carla chain that also reaches an output Discord monitors?
2. `pactl list short modules | grep -E 'loopback|echo'` — leftover loopback or
   echo-cancel modules create duplicate paths.
3. Compare `pw-dump` against the baseline snapshot's `diagnostics/pw-dump.json`
   to spot nodes that shouldn't exist.
4. `~/.local/state/wireplumber/restore-stream` — WirePlumber may be restoring
   Discord's stream to a monitor/virtual target. Restoring the snapshot resets this.
