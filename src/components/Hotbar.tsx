import type { Preset } from '../types'

const HOTBAR_SLOTS = 7

interface HotbarProps {
  presets: Preset[]
  activePresetId: string | null
  onActivate: (id: string) => void
  onRefresh: () => void
}

export function Hotbar({ presets, activePresetId, onActivate, onRefresh }: HotbarProps) {
  const hotbarPresets = presets
    .filter(p => p.hotbarSlot !== undefined)
    .sort((a, b) => (a.hotbarSlot ?? 0) - (b.hotbarSlot ?? 0))

  if (hotbarPresets.length === 0) return null

  const slots: (Preset | null)[] = Array.from({ length: HOTBAR_SLOTS }, (_, i) => {
    return hotbarPresets.find(p => p.hotbarSlot === i + 1) ?? null
  })

  const handleUnpin = async (preset: Preset) => {
    await window.persona.presets.update(preset.id, { hotbarSlot: undefined })
    onRefresh()
  }

  return (
    <div className="flex gap-1.5 mb-3">
      {slots.map((preset, i) => {
        if (!preset) {
          return (
            <div
              key={`empty-${i}`}
              className="flex-1 min-w-0 rounded px-1 py-2 text-center text-[10px] text-zinc-700 border border-zinc-800/50"
            >
              {i + 1}
            </div>
          )
        }

        const isActive = preset.id === activePresetId

        return (
          <button
            key={preset.id}
            onClick={() => onActivate(preset.id)}
            onContextMenu={(e) => {
              e.preventDefault()
              handleUnpin(preset)
            }}
            title={`${preset.name} (Ctrl+${i + 1})`}
            className={`
              flex-1 min-w-0 rounded px-1 py-2 text-center text-[10px] font-bold
              transition-all duration-100 cursor-pointer select-none truncate
              border
              ${isActive
                ? 'text-white shadow-md'
                : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
              }
            `}
            style={isActive ? {
              backgroundColor: preset.color,
              borderColor: preset.color,
              boxShadow: `0 0 12px ${preset.color}30`
            } : undefined}
          >
            <span className="block text-[8px] opacity-50 mb-0.5">{i + 1}</span>
            <span className="block truncate">{preset.name}</span>
          </button>
        )
      })}
    </div>
  )
}
