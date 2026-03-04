import { useState, useEffect } from 'react'
import type { Preset, AppStatus } from '../types'

/**
 * Compact preset-only view for the always-on-top mini panel window.
 * Rendered when ?mini=true is in the URL.
 */
export function MiniPanel() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [status, setStatus] = useState<AppStatus>({
    activePresetId: null,
    carlaRunning: false,
    carlaPlugins: [],
    linksActive: 0,
    micMonitoring: false,
    oscConnected: false
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

  const hotbarPresets = presets
    .filter(p => p.hotbarSlot !== undefined)
    .sort((a, b) => (a.hotbarSlot ?? 0) - (b.hotbarSlot ?? 0))

  const otherPresets = presets.filter(p => !p.hotbarSlot)

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white select-none">
      {/* Draggable title bar (frameless window) */}
      <div
        className="px-3 py-1.5 text-[10px] tracking-widest text-zinc-600 uppercase cursor-move"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        Persona
      </div>

      {/* Hotbar presets */}
      {hotbarPresets.length > 0 && (
        <div className="px-2 pb-1 flex gap-1">
          {hotbarPresets.map((preset) => {
            const isActive = preset.id === status.activePresetId
            return (
              <button
                key={preset.id}
                onClick={() => handleActivate(preset.id)}
                title={`${preset.name} (Ctrl+${preset.hotbarSlot})`}
                className={`
                  flex-1 min-w-0 rounded px-1 py-1.5 text-[9px] font-bold text-center
                  transition-all duration-100 cursor-pointer truncate border
                  ${isActive
                    ? 'text-white'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-200'
                  }
                `}
                style={isActive ? {
                  backgroundColor: preset.color,
                  borderColor: preset.color,
                } : undefined}
              >
                {preset.name}
              </button>
            )
          })}
        </div>
      )}

      {hotbarPresets.length > 0 && otherPresets.length > 0 && (
        <div className="px-2 pb-1">
          <div className="border-t border-zinc-800" />
        </div>
      )}

      {/* Other presets */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {otherPresets.map((preset) => {
          const isActive = preset.id === status.activePresetId

          return (
            <button
              key={preset.id}
              onClick={() => handleActivate(preset.id)}
              className={`
                w-full rounded px-3 py-2 text-xs font-bold text-left
                transition-all duration-100 cursor-pointer
                border
                ${isActive
                  ? 'text-white'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-200'
                }
              `}
              style={isActive ? {
                backgroundColor: preset.color,
                borderColor: preset.color,
              } : undefined}
            >
              {preset.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
