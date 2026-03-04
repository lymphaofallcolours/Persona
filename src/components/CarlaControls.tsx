import { useState, useEffect } from 'react'
import type { AppStatus } from '../types'

type WindowMode = 'visible' | 'minimized' | 'no-gui'

const MODE_LABELS: Record<WindowMode, string> = {
  'visible': 'Visible',
  'minimized': 'Minimized',
  'no-gui': 'No GUI'
}

const MODE_TITLES: Record<WindowMode, string> = {
  'visible': 'Carla window is visible. Click to cycle: Minimized → No GUI.',
  'minimized': 'Carla window is minimized. Click to cycle: No GUI → Visible.',
  'no-gui': 'Carla runs without GUI (may crash on Flatpak). Click to cycle: Visible → Minimized.'
}

const MODE_ORDER: WindowMode[] = ['visible', 'minimized', 'no-gui']

interface CarlaControlsProps {
  status: AppStatus
}

export function CarlaControls({ status }: CarlaControlsProps) {
  const [mode, setMode] = useState<WindowMode>('minimized')

  useEffect(() => {
    window.persona.carla.getWindowMode().then(setMode)
  }, [])

  const handleCycleMode = async () => {
    const currentIndex = MODE_ORDER.indexOf(mode)
    const next = MODE_ORDER[(currentIndex + 1) % MODE_ORDER.length]
    setMode(next)
    await window.persona.carla.setWindowMode(next)
  }

  const handleLaunch = async () => {
    await window.persona.carla.launch()
  }

  const handleStop = async () => {
    await window.persona.carla.stop()
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
        onClick={handleCycleMode}
        title={MODE_TITLES[mode]}
        className={`px-1.5 py-0.5 rounded text-[10px] border ${
          mode === 'no-gui'
            ? 'bg-purple-900/30 border-purple-700 text-purple-400'
            : mode === 'minimized'
            ? 'bg-blue-900/30 border-blue-700 text-blue-400'
            : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
        }`}
      >
        {MODE_LABELS[mode]}
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
