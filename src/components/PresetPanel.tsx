import { useState, useRef } from 'react'
import type { Preset } from '../types'

interface PresetPanelProps {
  presets: Preset[]
  activePresetId: string | null
  onActivate: (id: string) => void
  onEdit: (preset: Preset) => void
  onNew: () => void
  onRefresh: () => void
}

interface ContextMenu {
  x: number
  y: number
  preset: Preset
}

export function PresetPanel({ presets, activePresetId, onActivate, onEdit, onNew, onRefresh }: PresetPanelProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  const handleContextMenu = (e: React.MouseEvent, preset: Preset) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, preset })
  }

  const closeContextMenu = () => setContextMenu(null)

  const handleDuplicate = async (id: string) => {
    closeContextMenu()
    await window.persona.presets.duplicate(id)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    closeContextMenu()
    setConfirmDelete(id)
  }

  const confirmDeletePreset = async () => {
    if (!confirmDelete) return
    await window.persona.presets.delete(confirmDelete)
    setConfirmDelete(null)
    onRefresh()
  }

  const handleDragStart = (index: number) => {
    dragIndex.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverIndex.current = index
  }

  const handleDrop = async () => {
    if (dragIndex.current === null || dragOverIndex.current === null) return
    if (dragIndex.current === dragOverIndex.current) return

    const reordered = [...presets]
    const [moved] = reordered.splice(dragIndex.current, 1)
    reordered.splice(dragOverIndex.current, 0, moved)

    await window.persona.presets.reorder(reordered.map((p) => p.id))
    onRefresh()

    dragIndex.current = null
    dragOverIndex.current = null
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3" onClick={closeContextMenu}>
        {presets.map((preset, index) => {
          const isActive = preset.id === activePresetId

          return (
            <button
              key={preset.id}
              onClick={() => onActivate(preset.id)}
              onContextMenu={(e) => handleContextMenu(e, preset)}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className={`
                relative rounded-lg px-4 py-6 text-center font-bold text-sm
                transition-all duration-150 cursor-pointer select-none
                border-2
                ${isActive
                  ? 'text-white shadow-lg scale-[1.02]'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                }
              `}
              style={isActive ? {
                backgroundColor: preset.color,
                borderColor: preset.color,
                boxShadow: `0 0 20px ${preset.color}40`
              } : undefined}
            >
              {preset.name}
              {preset.plugins.length > 0 && (
                <span className="block text-xs font-normal mt-1 opacity-60">
                  {preset.plugins.length} plugin{preset.plugins.length !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          )
        })}

        {/* New preset button */}
        <button
          onClick={onNew}
          className="rounded-lg px-4 py-6 text-center text-sm border-2 border-dashed border-zinc-700 text-zinc-600 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
        >
          + New Preset
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px] text-xs">
            <button
              onClick={() => { closeContextMenu(); onEdit(contextMenu.preset) }}
              className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700"
            >
              Edit
            </button>
            <button
              onClick={() => handleDuplicate(contextMenu.preset.id)}
              className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-700"
            >
              Duplicate
            </button>
            {!contextMenu.preset.isFactory && (
              <>
                <div className="border-t border-zinc-700 my-1" />
                <button
                  onClick={() => handleDelete(contextMenu.preset.id)}
                  className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-zinc-700"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 max-w-xs mx-4">
            <p className="text-sm text-zinc-200 mb-3">Delete this preset?</p>
            <p className="text-xs text-zinc-500 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePreset}
                className="px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
