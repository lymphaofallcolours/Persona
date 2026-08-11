import type { Preset, AppStatus } from '../types'

interface StatusBarProps {
  status: AppStatus
  presets: Preset[]
}

export function StatusBar({ status, presets }: StatusBarProps) {
  const activePreset = presets.find(p => p.id === status.activePresetId)

  const handleMonitorToggle = () => {
    window.persona.micMonitor.toggle()
  }

  return (
    <footer className="px-4 py-2 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-500 flex items-center justify-between">
      <span>
        {activePreset ? (
          <>
            Active:{' '}
            <span className="text-zinc-300 font-medium" style={{ color: activePreset.color }}>
              {activePreset.name}
            </span>
          </>
        ) : (
          'No preset active'
        )}
      </span>

      <span className="flex items-center gap-3">
        {status.routeMode === 'discord' && (
          <span
            title={
              status.discordCapture === 'virtual'
                ? 'A call app is hearing the Persona Virtual Mic'
                : status.discordCapture === 'raw'
                  ? 'A call app is capturing your RAW mic — activate a voice to route it'
                  : 'No call app is capturing audio right now'
            }
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              status.discordCapture === 'virtual'
                ? 'bg-green-900/40 text-green-400'
                : status.discordCapture === 'raw'
                  ? 'bg-amber-900/40 text-amber-400'
                  : 'text-zinc-600'
            }`}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                status.discordCapture === 'virtual'
                  ? 'bg-green-500'
                  : status.discordCapture === 'raw'
                    ? 'bg-amber-400'
                    : 'bg-zinc-600'
              }`}
            />
            {status.discordCapture === 'virtual'
              ? 'Call: Persona mic'
              : status.discordCapture === 'raw'
                ? 'Call: RAW mic'
                : 'No call'}
          </span>
        )}
        <button
          onClick={handleMonitorToggle}
          title={status.micMonitoring ? 'Stop hearing your mic' : 'Hear your mic through output (for testing voices)'}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
            status.micMonitoring
              ? 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              status.micMonitoring ? 'bg-green-500' : 'bg-zinc-600'
            }`}
          />
          Monitor (Hear Mic)
        </button>
        <span>
          Links: {status.linksActive}
        </span>
        <span className="flex items-center gap-1">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              status.carlaRunning ? 'bg-green-500' : 'bg-zinc-600'
            }`}
          />
          Carla
        </span>
      </span>
    </footer>
  )
}
