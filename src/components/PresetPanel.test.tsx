// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PresetPanel } from './PresetPanel'
import type { Preset } from '../types'

const mockPresets: Preset[] = [
  { id: '1', name: 'Normal', color: '#4488ff', plugins: [], isFactory: true },
  { id: '2', name: 'Techpriest', color: '#cc3333', plugins: ['Calf Compressor', 'Calf Reverb'], isFactory: true },
  { id: '3', name: 'Custom', color: '#33cc33', plugins: ['Calf EQ'], isFactory: false }
]

// Mock the IPC bridge
const mockPersona = {
  presets: {
    duplicate: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    reorder: vi.fn().mockResolvedValue(undefined)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).persona = mockPersona
})

afterEach(() => {
  cleanup()
})

describe('PresetPanel', () => {
  const defaultProps = {
    presets: mockPresets,
    activePresetId: '1',
    onActivate: vi.fn(),
    onEdit: vi.fn(),
    onNew: vi.fn(),
    onRefresh: vi.fn()
  }

  it('renders all presets as buttons', () => {
    render(<PresetPanel {...defaultProps} />)
    expect(screen.getByText('Normal')).toBeTruthy()
    expect(screen.getByText('Techpriest')).toBeTruthy()
    expect(screen.getByText('Custom')).toBeTruthy()
  })

  it('renders the new preset button', () => {
    render(<PresetPanel {...defaultProps} />)
    expect(screen.getByText('+ New Preset')).toBeTruthy()
  })

  it('shows plugin count for presets with plugins', () => {
    render(<PresetPanel {...defaultProps} />)
    expect(screen.getByText('2 plugins')).toBeTruthy()
    expect(screen.getByText('1 plugin')).toBeTruthy()
  })

  it('calls onActivate when clicking a preset', () => {
    render(<PresetPanel {...defaultProps} />)
    fireEvent.click(screen.getByText('Techpriest'))
    expect(defaultProps.onActivate).toHaveBeenCalledWith('2')
  })

  it('calls onNew when clicking new preset button', () => {
    render(<PresetPanel {...defaultProps} />)
    fireEvent.click(screen.getByText('+ New Preset'))
    expect(defaultProps.onNew).toHaveBeenCalled()
  })

  it('opens context menu on right-click', () => {
    render(<PresetPanel {...defaultProps} />)
    fireEvent.contextMenu(screen.getByText('Custom'))
    expect(screen.getByText('Edit')).toBeTruthy()
    expect(screen.getByText('Duplicate')).toBeTruthy()
    expect(screen.getByText('Delete')).toBeTruthy()
  })

  it('hides delete option for factory presets', () => {
    render(<PresetPanel {...defaultProps} />)
    fireEvent.contextMenu(screen.getByText('Normal'))
    expect(screen.getByText('Edit')).toBeTruthy()
    expect(screen.getByText('Duplicate')).toBeTruthy()
    expect(screen.queryByText('Delete')).toBeNull()
  })

  it('shows delete confirmation dialog', () => {
    render(<PresetPanel {...defaultProps} />)
    fireEvent.contextMenu(screen.getByText('Custom'))
    fireEvent.click(screen.getByText('Delete'))
    expect(screen.getByText('Delete this preset?')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
  })
})
