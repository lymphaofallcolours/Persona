// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ParameterPanel } from './ParameterPanel'
import type { AppStatus, Preset, ParameterSnapshot } from '../types'

afterEach(() => cleanup())

const baseStatus: AppStatus = {
  activePresetId: 'p1',
  carlaRunning: true,
  carlaPlugins: ['Calf Compressor'],
  linksActive: 2,
  micMonitoring: false,
  oscConnected: false
}

const mockPreset: Preset = {
  id: 'p1',
  name: 'Test',
  color: '#ff0000',
  plugins: ['Calf Compressor'],
  isFactory: false
}

const mockSnapshot: ParameterSnapshot[] = [{
  pluginId: 0,
  pluginName: 'Calf Compressor',
  parameters: [
    { index: 0, name: 'Threshold', value: 0.5 },
    { index: 1, name: 'Ratio', value: 0.75 }
  ]
}]

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).persona = {
    osc: {
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockResolvedValue(false),
      setParameter: vi.fn().mockResolvedValue(undefined),
      setPluginActive: vi.fn().mockResolvedValue(undefined),
      setDryWet: vi.fn().mockResolvedValue(undefined),
      setVolume: vi.fn().mockResolvedValue(undefined),
      restoreSnapshot: vi.fn().mockResolvedValue(undefined)
    }
  }
})

describe('ParameterPanel', () => {
  it('does not render when Carla is not running', () => {
    const { container } = render(
      <ParameterPanel
        status={{ ...baseStatus, carlaRunning: false }}
        activePreset={mockPreset}
        onSaveSnapshot={vi.fn()}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows Connect OSC button when not connected', () => {
    render(
      <ParameterPanel
        status={baseStatus}
        activePreset={mockPreset}
        onSaveSnapshot={vi.fn()}
      />
    )
    expect(screen.getByText('Connect OSC')).toBeTruthy()
  })

  it('shows Disconnect button and OSC indicator when connected', () => {
    render(
      <ParameterPanel
        status={{ ...baseStatus, oscConnected: true }}
        activePreset={mockPreset}
        onSaveSnapshot={vi.fn()}
      />
    )
    expect(screen.getByText('OSC')).toBeTruthy()
    expect(screen.getByText('Disconnect')).toBeTruthy()
  })

  it('calls osc.connect when Connect OSC is clicked', async () => {
    render(
      <ParameterPanel
        status={baseStatus}
        activePreset={mockPreset}
        onSaveSnapshot={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Connect OSC'))
    expect(window.persona.osc.connect).toHaveBeenCalled()
  })

  it('calls osc.disconnect when Disconnect is clicked', () => {
    render(
      <ParameterPanel
        status={{ ...baseStatus, oscConnected: true }}
        activePreset={mockPreset}
        onSaveSnapshot={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Disconnect'))
    expect(window.persona.osc.disconnect).toHaveBeenCalled()
  })

  it('shows Load snapshot button when connected with saved snapshots but no plugins loaded', () => {
    const preset = { ...mockPreset, parameterSnapshots: mockSnapshot }
    render(
      <ParameterPanel
        status={{ ...baseStatus, oscConnected: true }}
        activePreset={preset}
        onSaveSnapshot={vi.fn()}
      />
    )
    expect(screen.getByText(/Load 1 saved plugin snapshot/)).toBeTruthy()
  })

  it('renders Parameters header', () => {
    render(
      <ParameterPanel
        status={baseStatus}
        activePreset={mockPreset}
        onSaveSnapshot={vi.fn()}
      />
    )
    expect(screen.getByText('Parameters')).toBeTruthy()
  })
})
