import { useState, useEffect } from 'react'
import type { VoiceArchetype } from '../types'

interface NewVoiceWizardProps {
  onCreated: () => void
  onCancel: () => void
}

export function NewVoiceWizard({ onCreated, onCancel }: NewVoiceWizardProps) {
  const [archetypes, setArchetypes] = useState<VoiceArchetype[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [creating, setCreating] = useState(false)
  const [voicesDir, setVoicesDir] = useState('')

  useEffect(() => {
    window.persona.voices.getArchetypes().then(setArchetypes)
    window.persona.voices.getDir().then(setVoicesDir)
  }, [])

  const handleChangeDir = async () => {
    const dir = await window.persona.voices.pickDir()
    if (dir) {
      await window.persona.voices.setDir(dir)
      setVoicesDir(dir)
    }
  }

  const handleSelect = (archetype: VoiceArchetype) => {
    setSelectedId(archetype.id)
    if (!nameTouched) setName(archetype.name)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!selectedId || !trimmed || creating) return
    setCreating(true)
    try {
      await window.persona.voices.generate(selectedId, trimmed)
      onCreated()
    } catch {
      // Failure toast comes from the main process
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={onCancel}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-200">New Voice</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Pick a starting character. Persona builds the full effect chain — tweak it later in Carla if you want.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            {archetypes.map(a => (
              <button
                key={a.id}
                onClick={() => handleSelect(a)}
                className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                  selectedId === a.id
                    ? 'border-zinc-400 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <span className="text-xs font-medium text-zinc-200">{a.name}</span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">{a.description}</div>
                <div className="text-[10px] text-zinc-600 mt-1.5 truncate" title={a.pluginNames.join(' → ')}>
                  {a.pluginNames.join(' → ')}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Voice name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameTouched(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              placeholder="Pick an archetype first..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        <div className="px-4 pt-2 flex items-center gap-2 text-[10px] text-zinc-600">
          <span className="truncate" title={voicesDir}>Saving to: {voicesDir}</span>
          <button
            onClick={handleChangeDir}
            className="shrink-0 underline hover:text-zinc-400"
          >
            Change...
          </button>
        </div>

        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedId || !name.trim() || creating}
            className="px-3 py-1.5 rounded text-xs bg-zinc-700 border border-zinc-600 text-zinc-200 hover:bg-zinc-600 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Voice'}
          </button>
        </div>
      </div>
    </div>
  )
}
