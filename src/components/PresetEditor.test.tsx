// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PresetEditor } from './PresetEditor'
import type { Preset } from '../types'

const mockPersona = {
  plugins: {
    getAvailable: vi.fn().mockResolvedValue(['Calf Compressor', 'Calf EQ', 'Calf Reverb'])
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).persona = mockPersona
})

afterEach(() => {
  cleanup()
})

describe('PresetEditor', () => {
  const defaultProps = {
    onSave: vi.fn(),
    onCancel: vi.fn()
  }

  it('shows "New Preset" title when no preset provided', () => {
    render(<PresetEditor {...defaultProps} />)
    expect(screen.getByText('New Preset')).toBeTruthy()
  })

  it('shows "Edit Preset" title when editing existing preset', () => {
    const preset: Preset = {
      id: '1', name: 'Test', color: '#cc3333', plugins: ['Calf EQ'], isFactory: false
    }
    render(<PresetEditor {...defaultProps} preset={preset} />)
    expect(screen.getByText('Edit Preset')).toBeTruthy()
  })

  it('populates name from existing preset', () => {
    const preset: Preset = {
      id: '1', name: 'Techpriest', color: '#cc3333', plugins: [], isFactory: false
    }
    render(<PresetEditor {...defaultProps} preset={preset} />)
    const input = screen.getByDisplayValue('Techpriest')
    expect(input).toBeTruthy()
  })

  it('starts with empty name for new preset', () => {
    render(<PresetEditor {...defaultProps} />)
    const input = screen.getByPlaceholderText('Preset name...')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('disables save when name is empty', () => {
    render(<PresetEditor {...defaultProps} />)
    const saveBtn = screen.getByText('Create')
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables save when name is provided', () => {
    render(<PresetEditor {...defaultProps} />)
    const input = screen.getByPlaceholderText('Preset name...')
    fireEvent.change(input, { target: { value: 'My Preset' } })
    const saveBtn = screen.getByText('Create')
    expect((saveBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls onSave with form data', () => {
    render(<PresetEditor {...defaultProps} />)
    const input = screen.getByPlaceholderText('Preset name...')
    fireEvent.change(input, { target: { value: 'New Voice' } })
    fireEvent.click(screen.getByText('Create'))
    expect(defaultProps.onSave).toHaveBeenCalledWith({
      name: 'New Voice',
      color: '#4a9eff', // default first color
      plugins: []
    })
  })

  it('calls onCancel when cancel button clicked', () => {
    render(<PresetEditor {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('shows passthrough message when no plugins', () => {
    render(<PresetEditor {...defaultProps} />)
    expect(screen.getByText(/direct passthrough/)).toBeTruthy()
  })

  it('shows existing plugins for edit mode', () => {
    const preset: Preset = {
      id: '1', name: 'Test', color: '#cc3333',
      plugins: ['Calf Compressor', 'Calf Reverb'], isFactory: false
    }
    render(<PresetEditor {...defaultProps} preset={preset} />)
    expect(screen.getByText('Calf Compressor')).toBeTruthy()
    expect(screen.getByText('Calf Reverb')).toBeTruthy()
  })

  it('shows "Save" button when editing existing preset', () => {
    const preset: Preset = {
      id: '1', name: 'Test', color: '#cc3333', plugins: [], isFactory: false
    }
    render(<PresetEditor {...defaultProps} preset={preset} />)
    expect(screen.getByText('Save')).toBeTruthy()
  })
})
