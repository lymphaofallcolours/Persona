import { useState, useEffect, useCallback } from 'react'
import type { Preset, AppStatus } from './types'
import { PresetPanel } from './components/PresetPanel'
import { PresetEditor } from './components/PresetEditor'
import { DeviceSelector } from './components/DeviceSelector'
import { StatusBar } from './components/StatusBar'
import { CarlaControls } from './components/CarlaControls'
import { ToastContainer } from './components/Toast'

export default function App() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [status, setStatus] = useState<AppStatus>({
    activePresetId: null,
    carlaRunning: false,
    carlaPlugins: [],
    linksActive: 0
  })
  const [editingPreset, setEditingPreset] = useState<Preset | null | undefined>(undefined)
  // undefined = closed, null = new preset, Preset = editing existing

  const refreshPresets = useCallback(() => {
    window.persona.presets.getAll().then(setPresets)
  }, [])

  useEffect(() => {
    refreshPresets()
    window.persona.status.get().then(setStatus)
    const unsubscribe = window.persona.status.onChange(setStatus)
    return unsubscribe
  }, [refreshPresets])

  const handleActivate = async (id: string) => {
    await window.persona.presets.activate(id)
  }

  const handleNewPreset = () => {
    setEditingPreset(null)
  }

  const handleEditPreset = (preset: Preset) => {
    setEditingPreset(preset)
  }

  const handleSavePreset = async (data: { name: string; color: string; plugins: string[] }) => {
    if (editingPreset === null) {
      // Creating new
      await window.persona.presets.create(data.name, data.color, data.plugins)
    } else if (editingPreset) {
      // Editing existing
      await window.persona.presets.update(editingPreset.id, data)
    }
    setEditingPreset(undefined)
    refreshPresets()
  }

  const handleCancelEdit = () => {
    setEditingPreset(undefined)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white">
      <header className="px-4 py-3 border-b border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
            Persona
          </h1>
          <CarlaControls status={status} />
        </div>
        <DeviceSelector />
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <PresetPanel
          presets={presets}
          activePresetId={status.activePresetId}
          onActivate={handleActivate}
          onEdit={handleEditPreset}
          onNew={handleNewPreset}
          onRefresh={refreshPresets}
        />
      </main>

      <StatusBar status={status} presets={presets} />
      <ToastContainer />

      {editingPreset !== undefined && (
        <PresetEditor
          preset={editingPreset}
          onSave={handleSavePreset}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  )
}
