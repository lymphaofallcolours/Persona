// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PresetPanel } from './PresetPanel'
import type { Preset } from '../types'

const mockPresets: Preset[] = [
  { id: '1', name: 'Off', color: '#666666', isFactory: true },
  { id: '2', name: 'Techpriest', color: '#cc3333', carxpPath: '/home/user/dark-voice.carxp', isFactory: false },
  { id: '3', name: 'Custom', color: '#33cc33', isFactory: false }
]

// Mock the IPC bridge
const mockPersona = {
  presets: {
    duplicate: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(true),
    reorder: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    export: vi.fn().mockResolvedValue(true),
    import: vi.fn().mockResolvedValue({ presetCount: 1, groupCount: 0 })
  },
  groups: {
    create: vi.fn().mockResolvedValue({ id: 'g1', name: 'Test', order: 0 }),
    delete: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(undefined),
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
    groups: [],
    activePresetId: '1',
    selectedGroupId: null as string | null,
    onSelectGroup: vi.fn(),
    onActivate: vi.fn(),
    onEdit: vi.fn(),
    onNew: vi.fn(),
    onRefresh: vi.fn()
  }

  it('renders all presets as buttons', () => {
    render(<PresetPanel {...defaultProps} />)
    expect(screen.getByText('Off')).toBeTruthy()
    expect(screen.getByText('Techpriest')).toBeTruthy()
    expect(screen.getByText('Custom')).toBeTruthy()
  })

  it('renders the new preset button', () => {
    render(<PresetPanel {...defaultProps} />)
    expect(screen.getByText('+ New Preset')).toBeTruthy()
  })

  it('shows .carxp filename for presets with carxpPath', () => {
    render(<PresetPanel {...defaultProps} />)
    expect(screen.getByText('dark-voice')).toBeTruthy()
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
    fireEvent.contextMenu(screen.getByText('Off'))
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

  it('renders import and export buttons', () => {
    render(<PresetPanel {...defaultProps} />)
    expect(screen.getByText('Import')).toBeTruthy()
    expect(screen.getByText('Export All')).toBeTruthy()
  })

  it('shows export option in context menu', () => {
    render(<PresetPanel {...defaultProps} />)
    fireEvent.contextMenu(screen.getByText('Custom'))
    expect(screen.getByText('Export')).toBeTruthy()
  })

  it('calls import on import button click', async () => {
    render(<PresetPanel {...defaultProps} />)
    fireEvent.click(screen.getByText('Import'))
    expect(mockPersona.presets.import).toHaveBeenCalled()
  })
})
