// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { StatusBar } from './StatusBar'
import type { Preset, AppStatus } from '../types'

const mockPresets: Preset[] = [
  { id: '1', name: 'Normal', color: '#4488ff', plugins: [], isFactory: true },
  { id: '2', name: 'Techpriest', color: '#cc3333', plugins: ['Calf Compressor'], isFactory: true }
]

const mockPersona = {
  micMonitor: {
    toggle: vi.fn().mockResolvedValue(true)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).persona = mockPersona
})

afterEach(() => {
  cleanup()
})

const baseStatus: AppStatus = {
  activePresetId: null,
  carlaRunning: false,
  carlaPlugins: [],
  linksActive: 0,
  micMonitoring: false
}

describe('StatusBar', () => {
  it('shows "No preset active" when no preset is active', () => {
    render(<StatusBar status={baseStatus} presets={mockPresets} />)
    expect(screen.getByText('No preset active')).toBeTruthy()
  })

  it('shows active preset name', () => {
    const status = { ...baseStatus, activePresetId: '2' }
    render(<StatusBar status={status} presets={mockPresets} />)
    expect(screen.getByText('Techpriest')).toBeTruthy()
  })

  it('shows link count', () => {
    const status = { ...baseStatus, linksActive: 4 }
    render(<StatusBar status={status} presets={mockPresets} />)
    expect(screen.getByText('Links: 4')).toBeTruthy()
  })

  it('shows Carla label', () => {
    render(<StatusBar status={baseStatus} presets={mockPresets} />)
    expect(screen.getByText('Carla')).toBeTruthy()
  })

  it('shows Monitor button', () => {
    render(<StatusBar status={baseStatus} presets={mockPresets} />)
    expect(screen.getByText('Monitor')).toBeTruthy()
  })

  it('calls micMonitor.toggle when Monitor clicked', () => {
    render(<StatusBar status={baseStatus} presets={mockPresets} />)
    fireEvent.click(screen.getByText('Monitor'))
    expect(mockPersona.micMonitor.toggle).toHaveBeenCalled()
  })

  it('shows enable tooltip when monitoring is off', () => {
    render(<StatusBar status={baseStatus} presets={mockPresets} />)
    const btn = screen.getByTitle('Enable mic monitoring')
    expect(btn).toBeTruthy()
  })

  it('shows disable tooltip when monitoring is on', () => {
    const status = { ...baseStatus, micMonitoring: true }
    render(<StatusBar status={status} presets={mockPresets} />)
    const btn = screen.getByTitle('Disable mic monitoring')
    expect(btn).toBeTruthy()
  })
})
