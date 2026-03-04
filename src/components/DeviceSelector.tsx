import { useState, useEffect } from 'react'
import type { AudioDevice, DeviceSelection } from '../types'

interface DeviceSelectorProps {
  onDeviceChange?: () => void
}

export function DeviceSelector({ onDeviceChange }: DeviceSelectorProps) {
  const [inputs, setInputs] = useState<AudioDevice[]>([])
  const [outputs, setOutputs] = useState<AudioDevice[]>([])
  const [selected, setSelected] = useState<DeviceSelection>({ input: 'auto', output: 'auto' })

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

    const unsubscribe = window.persona.devices.onChange(({ inputs: ins, outputs: outs }) => {
      setInputs(ins)
      setOutputs(outs)
    })
    return unsubscribe
  }, [])

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
    <div className="flex gap-3">
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
          Output
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
