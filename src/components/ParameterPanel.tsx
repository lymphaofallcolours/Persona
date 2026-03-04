import { useState, useCallback } from 'react'
import type { AppStatus, Preset, ParameterSnapshot, ParameterValue } from '../types'

interface ParameterPanelProps {
  status: AppStatus
  activePreset: Preset | undefined
  onSaveSnapshot: (presetId: string, snapshots: ParameterSnapshot[]) => void
}

interface PluginEntry {
  pluginId: number
  pluginName: string
  parameters: ParameterValue[]
  expanded: boolean
}

export function ParameterPanel({ status, activePreset, onSaveSnapshot }: ParameterPanelProps) {
  const [plugins, setPlugins] = useState<PluginEntry[]>([])
  const [loading, setLoading] = useState(false)

  const loadFromSnapshot = useCallback(() => {
    if (!activePreset?.parameterSnapshots?.length) return
    setPlugins(
      activePreset.parameterSnapshots.map((snap, i) => ({
        pluginId: snap.pluginId,
        pluginName: snap.pluginName,
        parameters: [...snap.parameters],
        expanded: i === 0
      }))
    )
  }, [activePreset])

  const handleConnect = async () => {
    setLoading(true)
    try {
      await window.persona.osc.connect()
      // Load from preset snapshots if available
      if (activePreset?.parameterSnapshots?.length) {
        loadFromSnapshot()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    await window.persona.osc.disconnect()
    setPlugins([])
  }

  const handleParameterChange = async (pluginId: number, paramIndex: number, value: number) => {
    // Update local state immediately for responsive UI
    setPlugins(prev => prev.map(p => {
      if (p.pluginId !== pluginId) return p
      return {
        ...p,
        parameters: p.parameters.map(param =>
          param.index === paramIndex ? { ...param, value } : param
        )
      }
    }))

    // Send to Carla via OSC
    try {
      await window.persona.osc.setParameter(pluginId, paramIndex, value)
    } catch {
      // OSC send failed — UI already shows the intended value
    }
  }

  const handleTogglePlugin = async (pluginId: number, active: boolean) => {
    try {
      await window.persona.osc.setPluginActive(pluginId, active)
    } catch {
      // Failed to toggle
    }
  }

  const handleToggleExpand = (pluginId: number) => {
    setPlugins(prev => prev.map(p =>
      p.pluginId === pluginId ? { ...p, expanded: !p.expanded } : p
    ))
  }

  const handleSaveToPreset = () => {
    if (!activePreset) return
    const snapshots: ParameterSnapshot[] = plugins.map(p => ({
      pluginId: p.pluginId,
      pluginName: p.pluginName,
      parameters: p.parameters
    }))
    onSaveSnapshot(activePreset.id, snapshots)
  }

  if (!status.carlaRunning) return null

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50">
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Parameters
        </span>
        <div className="flex items-center gap-2">
          {status.oscConnected ? (
            <>
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                OSC
              </span>
              <button
                onClick={handleDisconnect}
                className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect OSC'}
            </button>
          )}
        </div>
      </div>

      {status.oscConnected && plugins.length > 0 && (
        <div className="px-4 pb-3 space-y-1">
          {plugins.map(plugin => (
            <div key={plugin.pluginId} className="bg-zinc-800/50 rounded">
              <button
                onClick={() => handleToggleExpand(plugin.pluginId)}
                className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-zinc-300 hover:bg-zinc-800 rounded"
              >
                <span className="font-medium">{plugin.pluginName}</span>
                <span className="text-zinc-500">{plugin.expanded ? '−' : '+'}</span>
              </button>

              {plugin.expanded && (
                <div className="px-3 pb-2 space-y-2">
                  {plugin.parameters.map(param => (
                    <div key={param.index} className="flex items-center gap-2">
                      <label className="text-[10px] text-zinc-500 w-24 truncate" title={param.name}>
                        {param.name}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={param.value}
                        onChange={(e) => handleParameterChange(plugin.pluginId, param.index, parseFloat(e.target.value))}
                        className="flex-1 h-1 accent-blue-500"
                      />
                      <span className="text-[10px] text-zinc-500 w-8 text-right">
                        {param.value.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleTogglePlugin(plugin.pluginId, false)}
                        title="Bypass plugin"
                        className="text-[10px] text-zinc-600 hover:text-zinc-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {activePreset && (
            <button
              onClick={handleSaveToPreset}
              className="w-full mt-2 px-3 py-1.5 rounded text-xs bg-blue-600/20 border border-blue-600/40 text-blue-400 hover:bg-blue-600/30 hover:border-blue-600/60"
            >
              Save Parameters to Preset
            </button>
          )}
        </div>
      )}

      {status.oscConnected && plugins.length === 0 && activePreset?.parameterSnapshots?.length && (
        <div className="px-4 pb-3">
          <button
            onClick={loadFromSnapshot}
            className="w-full px-3 py-1.5 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
          >
            Load {activePreset.parameterSnapshots.length} saved plugin snapshot{activePreset.parameterSnapshots.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
