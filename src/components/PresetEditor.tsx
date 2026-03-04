import { useState } from 'react'
import type { Preset, PresetGroup } from '../types'

const PRESET_COLORS = [
  '#4a9eff', '#cc3333', '#cc8833', '#33cc33', '#9933cc',
  '#cc33aa', '#33cccc', '#ff6633', '#666666', '#cccc33'
]

interface PresetEditorProps {
  preset?: Preset | null
  groups: PresetGroup[]
  onSave: (data: {
    name: string; color: string;
    carxpPath?: string; groupId?: string; volume?: number; hotbarSlot?: number
  }) => void
  onCancel: () => void
}

export function PresetEditor({ preset, groups, onSave, onCancel }: PresetEditorProps) {
  const [name, setName] = useState(preset?.name ?? '')
  const [color, setColor] = useState(preset?.color ?? PRESET_COLORS[0])
  const [carxpPath, setCarxpPath] = useState<string | undefined>(preset?.carxpPath)
  const [groupId, setGroupId] = useState<string | undefined>(preset?.groupId)
  const [volume, setVolume] = useState<number>(preset?.volume ?? 1.0)
  const [hotbarSlot, setHotbarSlot] = useState<number | undefined>(preset?.hotbarSlot)

  const handleBrowseCarxp = async () => {
    const path = await window.persona.dialog.openFile([
      { name: 'Carla Projects', extensions: ['carxp'] }
    ])
    if (path) setCarxpPath(path)
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({
      name: trimmed, color, carxpPath, groupId,
      volume: volume !== 1.0 ? volume : undefined,
      hotbarSlot
    })
  }

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order)

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

          {/* Carla project file */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Carla Project File (.carxp)
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
              Create .carxp files in Carla (File &gt; Save As). Without a project file, the preset passes audio through directly.
            </p>
          </div>

          {/* Group + Hotbar row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                Group
              </label>
              <select
                value={groupId ?? ''}
                onChange={(e) => setGroupId(e.target.value || undefined)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
              >
                <option value="">Ungrouped</option>
                {sortedGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                Hotbar
              </label>
              <select
                value={hotbarSlot ?? ''}
                onChange={(e) => setHotbarSlot(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-500"
              >
                <option value="">None</option>
                {[1, 2, 3, 4, 5, 6, 7].map(s => (
                  <option key={s} value={s}>Slot {s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Volume */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              Volume ({Math.round(volume * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1.27"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
              <span>0%</span>
              <span>100%</span>
              <span>127%</span>
            </div>
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
