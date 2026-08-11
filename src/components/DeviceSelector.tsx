import { useState, useEffect } from 'react'
import type { AudioDevice, DeviceSelection, RouteMode } from '../types'

interface DeviceSelectorProps {
  onDeviceChange?: () => void
}

export function DeviceSelector({ onDeviceChange }: DeviceSelectorProps) {
  const [inputs, setInputs] = useState<AudioDevice[]>([])
  const [outputs, setOutputs] = useState<AudioDevice[]>([])
  const [selected, setSelected] = useState<DeviceSelection>({ input: 'auto', output: 'auto' })
  const [routeMode, setRouteMode] = useState<RouteMode>('speakers')

  useEffect(() => {
    Promise.all([
      window.persona.devices.getInputs(),
      window.persona.devices.getOutputs(),
      window.persona.devices.getSelected()
    ]).then(([ins, outs, sel]) => {
      setInputs(ins)
      setOutputs(outs)
      setSelected(sel)
    })
    window.persona.routing.getMode().then(setRouteMode)

    const unsubscribe = window.persona.devices.onChange(({ inputs: ins, outputs: outs }) => {
      setInputs(ins)
      setOutputs(outs)
    })
    return unsubscribe
  }, [])

  const handleRouteMode = async (mode: RouteMode) => {
    if (mode === routeMode) return
    setRouteMode(mode)
    await window.persona.routing.setMode(mode)
    onDeviceChange?.()
  }

  const handleInputChange = (value: string) => {
    const next = { ...selected, input: value }
    setSelected(next)
    window.persona.devices.setSelected(next.input, next.output)
    onDeviceChange?.()
  }

  const handleOutputChange = (value: string) => {
    const next = { ...selected, output: value }
    setSelected(next)
    window.persona.devices.setSelected(next.input, next.output)
    onDeviceChange?.()
  }

  return (
    <div className="flex gap-3 items-end">
      <div className="shrink-0">
        <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
          Route to
        </label>
        <div className="flex rounded border border-zinc-700 overflow-hidden text-xs">
          <button
            onClick={() => handleRouteMode('speakers')}
            title="Play the voice on your output device (in-person sessions)"
            className={`px-2.5 py-1.5 transition-colors ${
              routeMode === 'speakers'
                ? 'bg-zinc-600 text-zinc-100'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Speakers
          </button>
          <button
            onClick={() => handleRouteMode('discord')}
            title="Send the voice to the Persona Virtual Mic — call apps pick it up automatically"
            className={`px-2.5 py-1.5 transition-colors ${
              routeMode === 'discord'
                ? 'bg-indigo-700 text-zinc-100'
                : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Discord
          </button>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
          Input
        </label>
        <select
          value={selected.input}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 truncate"
        >
          <option value="auto">Auto (system default)</option>
          {inputs.map((d) => (
            <option key={d.name} value={d.name}>
              {d.description}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-0">
        <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
          {routeMode === 'discord' ? 'Monitor Output' : 'Output'}
        </label>
        <select
          value={selected.output}
          onChange={(e) => handleOutputChange(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 truncate"
        >
          <option value="auto">Auto (system default)</option>
          {outputs.map((d) => (
            <option key={d.name} value={d.name}>
              {d.description}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
