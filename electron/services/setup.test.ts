import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('child_process', () => ({
  execFile: vi.fn()
}))

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn()
}))

import { execFile } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import {
  parseRuntimeBranch, parseOverrideEnv, parseIniValue, upsertIniValues,
  checkEngineConfig, fixEngineConfig, runAllChecks, applyFix
} from './setup'

const mockExecFile = vi.mocked(execFile)
const mockReadFileSync = vi.mocked(readFileSync)
const mockWriteFileSync = vi.mocked(writeFileSync)
const mockExistsSync = vi.mocked(existsSync)

/** Mock execFile: match on "cmd args" prefix; unmatched commands fail. */
function mockCommands(results: Record<string, string>) {
  mockExecFile.mockImplementation((cmd: any, args: any, _opts: any, callback: any) => {
    const key = `${cmd} ${(args as string[]).join(' ')}`
    const match = Object.keys(results).find(k => key.startsWith(k))
    if (match !== undefined) {
      callback(null, results[match], '')
    } else {
      callback(new Error(`no mock for: ${key}`), '', 'mock failure')
    }
    return {} as any
  })
}

function execCalls(): string[] {
  return mockExecFile.mock.calls.map(c => `${c[0]} ${(c[1] as string[]).join(' ')}`)
}

const CARLA_INFO = `Carla - LV2 and VST plugin host

        ID: studio.kx.carla
       Ref: app/studio.kx.carla/x86_64/stable
   Runtime: org.kde.Platform/x86_64/5.15-25.08
`

beforeEach(() => {
  vi.clearAllMocks()
})

describe('parseRuntimeBranch', () => {
  it('extracts branch from KDE runtime with SDK version prefix', () => {
    expect(parseRuntimeBranch(CARLA_INFO)).toBe('25.08')
  })

  it('extracts branch from plain freedesktop runtime', () => {
    expect(parseRuntimeBranch('Runtime: org.freedesktop.Platform/x86_64/23.08')).toBe('23.08')
  })

  it('returns null when no runtime line present', () => {
    expect(parseRuntimeBranch('ID: something')).toBeNull()
  })
})

describe('parseOverrideEnv', () => {
  const SHOW = `[Context]
filesystems=/usr/lib/ladspa:ro;

[Environment]
LADSPA_PATH=/home/user/.local/lib/ladspa
LV2_PATH=/home/user/.local/lib/lv2
`
  it('extracts env var values', () => {
    expect(parseOverrideEnv(SHOW, 'LV2_PATH')).toBe('/home/user/.local/lib/lv2')
    expect(parseOverrideEnv(SHOW, 'LADSPA_PATH')).toBe('/home/user/.local/lib/ladspa')
  })

  it('returns null for absent vars', () => {
    expect(parseOverrideEnv(SHOW, 'VST_PATH')).toBeNull()
    expect(parseOverrideEnv('', 'LV2_PATH')).toBeNull()
  })

  it('treats empty values (unset-env markers) as absent', () => {
    const unsetShow = '[Context]\nunset-environment=LADSPA_PATH;LV2_PATH;\n\n[Environment]\nLADSPA_PATH=\nLV2_PATH=\n'
    expect(parseOverrideEnv(unsetShow, 'LV2_PATH')).toBeNull()
    expect(parseOverrideEnv(unsetShow, 'LADSPA_PATH')).toBeNull()
  })
})

describe('INI parsing', () => {
  const INI = `[Engine]
AudioDriver=JACK
ProcessMode=3

[OSC]
Enabled=true
`
  it('reads values from the right section', () => {
    expect(parseIniValue(INI, 'Engine', 'AudioDriver')).toBe('JACK')
    expect(parseIniValue(INI, 'Engine', 'ProcessMode')).toBe('3')
    expect(parseIniValue(INI, 'OSC', 'Enabled')).toBe('true')
  })

  it('returns null for missing section or key', () => {
    expect(parseIniValue(INI, 'Engine', 'Missing')).toBeNull()
    expect(parseIniValue(INI, 'Nowhere', 'AudioDriver')).toBeNull()
  })

  it('upserts into an existing section, replacing and adding keys', () => {
    const result = upsertIniValues(INI, 'Engine', { AudioDriver: 'JACK', ProcessMode: '3', NewKey: 'x' })
    expect(parseIniValue(result, 'Engine', 'ProcessMode')).toBe('3')
    expect(parseIniValue(result, 'Engine', 'NewKey')).toBe('x')
    // Other sections untouched
    expect(parseIniValue(result, 'OSC', 'Enabled')).toBe('true')
  })

  it('replaces wrong values', () => {
    const wrong = '[Engine]\nAudioDriver=PulseAudio\nProcessMode=1\n'
    const result = upsertIniValues(wrong, 'Engine', { AudioDriver: 'JACK', ProcessMode: '3' })
    expect(parseIniValue(result, 'Engine', 'AudioDriver')).toBe('JACK')
    expect(parseIniValue(result, 'Engine', 'ProcessMode')).toBe('3')
    expect(result).not.toContain('PulseAudio')
  })

  it('creates the section when missing', () => {
    const result = upsertIniValues('', 'Engine', { AudioDriver: 'JACK' })
    expect(parseIniValue(result, 'Engine', 'AudioDriver')).toBe('JACK')
  })
})

describe('checkEngineConfig', () => {
  it('warns when Carla has never been configured', () => {
    mockExistsSync.mockReturnValue(false)
    const check = checkEngineConfig()
    expect(check.status).toBe('warning')
    expect(check.fixable).toBe(true)
  })

  it('passes with JACK driver and patchbay mode', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[Engine]\nAudioDriver=JACK\nProcessMode=3\n')
    const check = checkEngineConfig()
    expect(check.status).toBe('ok')
    expect(check.fixable).toBe(false)
  })

  it('warns on wrong driver or mode', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[Engine]\nAudioDriver=ALSA\nProcessMode=1\n')
    const check = checkEngineConfig()
    expect(check.status).toBe('warning')
    expect(check.fixable).toBe(true)
    expect(check.detail).toContain('ALSA')
  })
})

describe('fixEngineConfig', () => {
  it('writes JACK + patchbay mode preserving other settings', () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[Engine]\nAudioDriver=ALSA\n\n[OSC]\nEnabled=true\n')
    fixEngineConfig('/fake/Carla2.conf')

    expect(mockWriteFileSync).toHaveBeenCalledOnce()
    const written = mockWriteFileSync.mock.calls[0][1] as string
    expect(parseIniValue(written, 'Engine', 'AudioDriver')).toBe('JACK')
    expect(parseIniValue(written, 'Engine', 'ProcessMode')).toBe('3')
    expect(parseIniValue(written, 'OSC', 'Enabled')).toBe('true')
  })

  it('creates the config from scratch when missing', () => {
    mockExistsSync.mockReturnValue(false)
    fixEngineConfig('/fake/Carla2.conf')
    const written = mockWriteFileSync.mock.calls[0][1] as string
    expect(parseIniValue(written, 'Engine', 'AudioDriver')).toBe('JACK')
    expect(parseIniValue(written, 'Engine', 'ProcessMode')).toBe('3')
  })
})

describe('runAllChecks', () => {
  it('reports all ok on a fully configured system', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[Engine]\nAudioDriver=JACK\nProcessMode=3\n')
    mockCommands({
      'pw-cli info 0': 'core info',
      'flatpak remotes --user --columns=name': 'flathub\n',
      'flatpak info studio.kx.carla': CARLA_INFO,
      'flatpak info org.freedesktop.LinuxAudio.Plugins.Calf//25.08': 'ok',
      'flatpak info org.freedesktop.LinuxAudio.Plugins.swh//25.08': 'ok',
      'flatpak info org.freedesktop.LinuxAudio.Plugins.MDA//25.08': 'ok',
      'flatpak override --user --show studio.kx.carla': '',
      'flatpak override --show studio.kx.carla': ''
    })

    const report = await runAllChecks()
    expect(report.allOk).toBe(true)
    expect(report.checks).toHaveLength(6)
  })

  it('flags missing plugin packs against the Carla runtime branch', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[Engine]\nAudioDriver=JACK\nProcessMode=3\n')
    mockCommands({
      'pw-cli info 0': 'core info',
      'flatpak remotes --user --columns=name': 'flathub\n',
      'flatpak info studio.kx.carla': CARLA_INFO,
      'flatpak info org.freedesktop.LinuxAudio.Plugins.Calf//25.08': 'ok',
      // swh missing — no mock entry
      'flatpak override --user --show studio.kx.carla': '',
      'flatpak override --show studio.kx.carla': ''
    })

    const report = await runAllChecks()
    const plugins = report.checks.find(c => c.id === 'plugins')!
    expect(plugins.status).toBe('warning')
    expect(plugins.detail).toContain('swh')
    expect(report.allOk).toBe(false)
  })

  it('flags stale LV2_PATH overrides that shadow extension plugins', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[Engine]\nAudioDriver=JACK\nProcessMode=3\n')
    mockCommands({
      'pw-cli info 0': 'core info',
      'flatpak remotes --user --columns=name': 'flathub\n',
      'flatpak info studio.kx.carla': CARLA_INFO,
      'flatpak info org.freedesktop.LinuxAudio.Plugins.Calf//25.08': 'ok',
      'flatpak info org.freedesktop.LinuxAudio.Plugins.swh//25.08': 'ok',
      'flatpak info org.freedesktop.LinuxAudio.Plugins.MDA//25.08': 'ok',
      'flatpak override --user --show studio.kx.carla': '',
      'flatpak override --show studio.kx.carla': '[Environment]\nLV2_PATH=/home/user/.local/lib/lv2\n'
    })

    const report = await runAllChecks()
    const overrides = report.checks.find(c => c.id === 'overrides')!
    expect(overrides.status).toBe('warning')
    expect(overrides.fixable).toBe(true)
  })

  it('accepts a user override pointing at the sandbox extension paths', async () => {
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('[Engine]\nAudioDriver=JACK\nProcessMode=3\n')
    mockCommands({
      'pw-cli info 0': 'core info',
      'flatpak remotes --user --columns=name': 'flathub\n',
      'flatpak info studio.kx.carla': CARLA_INFO,
      'flatpak info org.freedesktop.LinuxAudio.Plugins.Calf//25.08': 'ok',
      'flatpak info org.freedesktop.LinuxAudio.Plugins.swh//25.08': 'ok',
      'flatpak info org.freedesktop.LinuxAudio.Plugins.MDA//25.08': 'ok',
      'flatpak override --user --show studio.kx.carla':
        '[Environment]\nLV2_PATH=/app/extensions/Plugins/lv2:/app/lib/lv2\nLADSPA_PATH=/app/extensions/Plugins/ladspa:/app/lib/ladspa\n',
      'flatpak override --show studio.kx.carla': '[Environment]\nLV2_PATH=/home/user/.local/lib/lv2\n'
    })

    const report = await runAllChecks()
    const overrides = report.checks.find(c => c.id === 'overrides')!
    expect(overrides.status).toBe('ok')
  })
})

describe('applyFix', () => {
  it('adds the flathub remote at user scope', async () => {
    mockCommands({ 'flatpak remote-add': '' })
    const result = await applyFix('flathub')
    expect(result.ok).toBe(true)
    expect(execCalls()[0]).toBe(
      'flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo'
    )
  })

  it('installs Carla at user scope without sudo', async () => {
    mockCommands({ 'flatpak install': '' })
    const result = await applyFix('carla')
    expect(result.ok).toBe(true)
    expect(execCalls()[0]).toBe('flatpak install --user -y flathub studio.kx.carla')
  })

  it('installs plugin packs pinned to the Carla runtime branch', async () => {
    mockCommands({
      'flatpak info studio.kx.carla': CARLA_INFO,
      'flatpak install': ''
    })
    const result = await applyFix('plugins')
    expect(result.ok).toBe(true)
    const installs = execCalls().filter(c => c.includes('install'))
    expect(installs).toContain('flatpak install --user -y flathub org.freedesktop.LinuxAudio.Plugins.Calf//25.08')
    expect(installs).toContain('flatpak install --user -y flathub org.freedesktop.LinuxAudio.Plugins.swh//25.08')
  })

  it('shadows system-level overrides with sandbox extension paths', async () => {
    mockCommands({
      'flatpak override --user --unset-env=LV2_PATH': '',
      'flatpak override --show studio.kx.carla': '[Environment]\nLV2_PATH=/home/user/.local/lib/lv2\n',
      'flatpak override --user --env=LV2_PATH': ''
    })
    const result = await applyFix('overrides')
    expect(result.ok).toBe(true)
    const shadowCall = execCalls().find(c => c.includes('--env=LV2_PATH'))
    expect(shadowCall).toContain('--env=LV2_PATH=/app/extensions/Plugins/lv2:/app/lib/lv2')
    expect(shadowCall).toContain('--env=LADSPA_PATH=/app/extensions/Plugins/ladspa:/app/lib/ladspa')
  })

  it('skips the shadow override when no system override exists', async () => {
    mockCommands({
      'flatpak override --user --unset-env=LV2_PATH': '',
      'flatpak override --show studio.kx.carla': ''
    })
    const result = await applyFix('overrides')
    expect(result.ok).toBe(true)
    expect(execCalls().find(c => c.includes('--env=LV2_PATH'))).toBeUndefined()
  })

  it('reports failure for unknown fixes and failed commands', async () => {
    expect((await applyFix('nonsense')).ok).toBe(false)

    mockCommands({}) // everything fails
    const result = await applyFix('carla')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Fix failed')
  })
})
