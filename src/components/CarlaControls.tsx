import { useState, useEffect } from 'react'
import type { AppStatus } from '../types'

interface CarlaControlsProps {
  status: AppStatus
}

export function CarlaControls({ status }: CarlaControlsProps) {
  const [minimized, setMinimized] = useState(true)

  useEffect(() => {
    window.persona.carla.getMinimized().then(setMinimized)
  }, [])

  const handleLaunch = async () => {
    await window.persona.carla.launch()
  }

  const handleStop = async () => {
    await window.persona.carla.stop()
  }

  const handleToggleMinimized = async () => {
    const next = !minimized
    setMinimized(next)
    await window.persona.carla.setMinimized(next)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            status.carlaRunning ? 'bg-green-500' : 'bg-zinc-600'
          }`}
        />
        <span className={status.carlaRunning ? 'text-zinc-300' : ''}>
          Carla
        </span>
        {status.carlaRunning && status.carlaPlugins.length > 0 && (
          <span className="text-zinc-600">
            ({status.carlaPlugins.length} plugin{status.carlaPlugins.length !== 1 ? 's' : ''})
          </span>
        )}
      </span>

      <button
        onClick={handleToggleMinimized}
        title={minimized ? 'Carla window is minimized. Click to show it.' : 'Carla window is visible. Click to minimize it.'}
        className={`px-1.5 py-0.5 rounded text-[10px] border ${
          minimized
            ? 'bg-blue-900/30 border-blue-700 text-blue-400'
            : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {minimized ? 'Minimized' : 'Visible'}
      </button>

      {status.carlaRunning ? (
        <button
          onClick={handleStop}
          className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleLaunch}
          className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
        >
          Launch
        </button>
      )}
    </div>
  )
}
