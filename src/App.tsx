import { useState, useEffect } from 'react'
import type { Preset, AppStatus } from './types'
import { PresetPanel } from './components/PresetPanel'
import { StatusBar } from './components/StatusBar'

export default function App() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [status, setStatus] = useState<AppStatus>({
    activePresetId: null,
    carlaRunning: false,
    carlaPlugins: [],
    linksActive: 0
  })

  useEffect(() => {
    window.persona.presets.getAll().then(setPresets)
    window.persona.status.get().then(setStatus)

    const unsubscribe = window.persona.status.onChange(setStatus)
    return unsubscribe
  }, [])

  const handleActivate = async (id: string) => {
    await window.persona.presets.activate(id)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white">
      <header className="px-4 py-3 border-b border-zinc-800">
        <h1 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
          Persona
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <PresetPanel
          presets={presets}
          activePresetId={status.activePresetId}
          onActivate={handleActivate}
        />
      </main>

      <StatusBar status={status} presets={presets} />
    </div>
  )
}
