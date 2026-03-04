import { useState, useEffect, useRef } from 'react'
import type { Preset } from '../types'

const PRESET_COLORS = [
  '#4a9eff', '#cc3333', '#cc8833', '#33cc33', '#9933cc',
  '#cc33aa', '#33cccc', '#ff6633', '#666666', '#cccc33'
]

interface PresetEditorProps {
  preset?: Preset | null
  onSave: (data: { name: string; color: string; plugins: string[]; carxpPath?: string }) => void
  onCancel: () => void
}

export function PresetEditor({ preset, onSave, onCancel }: PresetEditorProps) {
  const [name, setName] = useState(preset?.name ?? '')
  const [color, setColor] = useState(preset?.color ?? PRESET_COLORS[0])
  const [plugins, setPlugins] = useState<string[]>(preset?.plugins ?? [])
  const [carxpPath, setCarxpPath] = useState<string | undefined>(preset?.carxpPath)
  const [available, setAvailable] = useState<string[]>([])
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  useEffect(() => {
    window.persona.plugins.getAvailable().then(setAvailable)
  }, [])

  const addPlugin = (plugin: string) => {
    setPlugins((prev) => [...prev, plugin])
  }

  const removePlugin = (index: number) => {
    setPlugins((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverIndex.current = index
  }

  const handleDrop = () => {
    if (dragIndex.current === null || dragOverIndex.current === null) return
    if (dragIndex.current === dragOverIndex.current) return

    setPlugins((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex.current!, 1)
      next.splice(dragOverIndex.current!, 0, moved)
      return next
    })

    dragIndex.current = null
    dragOverIndex.current = null
  }

  const handleBrowseCarxp = async () => {
    const path = await window.persona.dialog.openFile([
      { name: 'Carla Projects', extensions: ['carxp'] }
    ])
    if (path) setCarxpPath(path)
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ name: trimmed, color, plugins, carxpPath })
  }

  // Plugins available to add (not already in chain)
  const addable = available.filter((p) => !plugins.includes(p))

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={onCancel}>
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-200">
            {preset ? 'Edit Preset' : 'New Preset'}
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Preset name..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Plugin chain */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Plugin Chain ({plugins.length})
            </label>

            {plugins.length === 0 ? (
              <p className="text-xs text-zinc-600 italic py-2">
                No plugins — direct passthrough (mic to output)
              </p>
            ) : (
              <div className="space-y-1">
                {plugins.map((plugin, i) => (
                  <div
                    key={`${plugin}-${i}`}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={handleDrop}
                    className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 cursor-grab active:cursor-grabbing hover:border-zinc-600"
                  >
                    <span className="text-zinc-600 text-[10px] w-4 text-right shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-zinc-500 select-none">&#x2261;</span>
                    <span className="flex-1 truncate">{plugin}</span>
                    <button
                      onClick={() => removePlugin(i)}
                      className="shrink-0 text-zinc-600 hover:text-red-400 text-sm leading-none"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add plugin */}
            {addable.length > 0 && (
              <div className="mt-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addPlugin(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  defaultValue=""
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-zinc-500"
                >
                  <option value="" disabled>
                    + Add plugin...
                  </option>
                  {addable.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Carla project file */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Carla Project File
            </label>
            {carxpPath ? (
              <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300">
                <span className="flex-1 truncate" title={carxpPath}>
                  {carxpPath.split('/').pop()}
                </span>
                <button
                  onClick={handleBrowseCarxp}
                  className="shrink-0 text-zinc-500 hover:text-zinc-300 text-[10px]"
                >
                  Change
                </button>
                <button
                  onClick={() => setCarxpPath(undefined)}
                  className="shrink-0 text-zinc-600 hover:text-red-400 text-sm leading-none"
                >
                  x
                </button>
              </div>
            ) : (
              <button
                onClick={handleBrowseCarxp}
                className="w-full text-left bg-zinc-800 border border-zinc-700 border-dashed rounded px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                + Browse for .carxp file...
              </button>
            )}
            <p className="text-[10px] text-zinc-600 mt-1">
              Optional. Carla will load this project when the preset is activated.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {preset ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
