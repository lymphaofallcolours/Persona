import type { Preset } from '../types'

interface PresetPanelProps {
  presets: Preset[]
  activePresetId: string | null
  onActivate: (id: string) => void
}

export function PresetPanel({ presets, activePresetId, onActivate }: PresetPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {presets.map((preset) => {
        const isActive = preset.id === activePresetId

        return (
          <button
            key={preset.id}
            onClick={() => onActivate(preset.id)}
            className={`
              relative rounded-lg px-4 py-6 text-center font-bold text-sm
              transition-all duration-150 cursor-pointer
              border-2
              ${isActive
                ? 'text-white shadow-lg scale-[1.02]'
                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-750'
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
    </div>
  )
}
