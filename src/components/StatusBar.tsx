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
        <button
          onClick={handleMonitorToggle}
          title={status.micMonitoring ? 'Disable mic monitoring' : 'Enable mic monitoring'}
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
          Monitor
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
