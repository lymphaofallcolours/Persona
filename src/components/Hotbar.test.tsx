// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Hotbar } from './Hotbar'
import type { Preset } from '../types'

const mockPresets: Preset[] = [
  { id: '1', name: 'Normal', color: '#4488ff', plugins: [], isFactory: true, hotbarSlot: 1 },
  { id: '2', name: 'Techpriest', color: '#cc3333', plugins: ['Calf Compressor'], isFactory: true, hotbarSlot: 2 },
  { id: '3', name: 'Custom', color: '#33cc33', plugins: [], isFactory: false }
]

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).persona = {
    presets: {
      update: vi.fn().mockResolvedValue(undefined)
    }
  }
})

afterEach(() => cleanup())

describe('Hotbar', () => {
  const defaultProps = {
    presets: mockPresets,
    activePresetId: '1',
    onActivate: vi.fn(),
    onRefresh: vi.fn()
  }

  it('renders hotbar slots for pinned presets', () => {
    render(<Hotbar {...defaultProps} />)
    expect(screen.getByText('Normal')).toBeTruthy()
    expect(screen.getByText('Techpriest')).toBeTruthy()
  })

  it('does not render when no presets have hotbar slots', () => {
    const { container } = render(
      <Hotbar {...defaultProps} presets={[mockPresets[2]]} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('calls onActivate when clicking a hotbar preset', () => {
    render(<Hotbar {...defaultProps} />)
    fireEvent.click(screen.getByText('Techpriest'))
    expect(defaultProps.onActivate).toHaveBeenCalledWith('2')
  })

  it('shows slot numbers', () => {
    render(<Hotbar {...defaultProps} />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('shows empty slots between pinned presets', () => {
    // Slots 1,2 are taken; slots 3-7 should be empty placeholders
    render(<Hotbar {...defaultProps} />)
    const allSlotNumbers = screen.getAllByText(/^[1-7]$/)
    expect(allSlotNumbers.length).toBe(7)
  })
})
