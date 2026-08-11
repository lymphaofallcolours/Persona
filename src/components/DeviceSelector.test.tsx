// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { DeviceSelector } from './DeviceSelector'

const mockInputs = [
  { name: 'alsa_input.usb-mic', description: 'usb mic', ports: ['capture_FL', 'capture_FR'], type: 'input' as const },
  { name: 'alsa_input.pci-builtin', description: 'pci builtin', ports: ['capture_FL'], type: 'input' as const }
]

const mockOutputs = [
  { name: 'alsa_output.headphones', description: 'headphones', ports: ['playback_FL', 'playback_FR'], type: 'output' as const }
]

const mockPersona = {
  devices: {
    getInputs: vi.fn().mockResolvedValue(mockInputs),
    getOutputs: vi.fn().mockResolvedValue(mockOutputs),
    getSelected: vi.fn().mockResolvedValue({ input: 'auto', output: 'auto' }),
    setSelected: vi.fn().mockResolvedValue(undefined),
    onChange: vi.fn().mockReturnValue(() => {})
  },
  routing: {
    getMode: vi.fn().mockResolvedValue('speakers'),
    setMode: vi.fn().mockResolvedValue('discord')
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).persona = mockPersona
})

afterEach(() => {
  cleanup()
})

describe('DeviceSelector', () => {
  it('renders input and output labels', async () => {
    render(<DeviceSelector />)
    await waitFor(() => {
      expect(screen.getByText('Input')).toBeTruthy()
      expect(screen.getByText('Output')).toBeTruthy()
    })
  })

  it('shows Auto option plus detected devices', async () => {
    render(<DeviceSelector />)
    await waitFor(() => {
      const options = screen.getAllByText('Auto (system default)')
      expect(options).toHaveLength(2)
    })

    expect(screen.getByText('usb mic')).toBeTruthy()
    expect(screen.getByText('pci builtin')).toBeTruthy()
    expect(screen.getByText('headphones')).toBeTruthy()
  })

  it('calls setSelected when input changes', async () => {
    render(<DeviceSelector />)
    await waitFor(() => screen.getByText('usb mic'))

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'alsa_input.usb-mic' } })

    expect(mockPersona.devices.setSelected).toHaveBeenCalledWith('alsa_input.usb-mic', 'auto')
  })

  it('calls onDeviceChange callback', async () => {
    const onDeviceChange = vi.fn()
    render(<DeviceSelector onDeviceChange={onDeviceChange} />)
    await waitFor(() => screen.getByText('usb mic'))

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'alsa_input.usb-mic' } })

    expect(onDeviceChange).toHaveBeenCalled()
  })

  it('subscribes to device changes on mount', () => {
    render(<DeviceSelector />)
    expect(mockPersona.devices.onChange).toHaveBeenCalled()
  })

  it('renders the routing toggle and switches to Discord mode', async () => {
    render(<DeviceSelector />)
    await waitFor(() => screen.getByText('Speakers'))

    fireEvent.click(screen.getByText('Discord'))
    await waitFor(() => {
      expect(mockPersona.routing.setMode).toHaveBeenCalledWith('discord')
    })
    // Output dropdown relabelled to clarify it is the listen path
    expect(screen.getByText('Monitor Output')).toBeTruthy()
  })

  it('does not re-set the mode when clicking the active one', async () => {
    render(<DeviceSelector />)
    await waitFor(() => screen.getByText('Speakers'))

    fireEvent.click(screen.getByText('Speakers'))
    expect(mockPersona.routing.setMode).not.toHaveBeenCalled()
  })
})
