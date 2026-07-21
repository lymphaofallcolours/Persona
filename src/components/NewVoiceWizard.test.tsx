// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { NewVoiceWizard } from './NewVoiceWizard'
import type { VoiceArchetype } from '../types'

const archetypes: VoiceArchetype[] = [
  {
    id: 'techpriest', name: 'Techpriest', color: '#b45309',
    description: 'Cold, metallic machine-priest.',
    pluginNames: ['Calf Compressor', 'Calf Reverb']
  },
  {
    id: 'demon', name: 'Demon', color: '#991b1b',
    description: 'Deep pitched-down growl.',
    pluginNames: ['AM pitchshifter', 'Calf Reverb']
  }
]

const mockPersona = {
  voices: {
    getArchetypes: vi.fn().mockResolvedValue(archetypes),
    generate: vi.fn().mockResolvedValue({ id: 'p1', name: 'Techpriest', color: '#b45309', isFactory: false }),
    getDir: vi.fn().mockResolvedValue('/home/user/.config/persona/voices'),
    setDir: vi.fn().mockResolvedValue(undefined),
    pickDir: vi.fn().mockResolvedValue(null)
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).persona = mockPersona
})

afterEach(() => {
  cleanup()
})

describe('NewVoiceWizard', () => {
  it('lists the available archetypes', async () => {
    render(<NewVoiceWizard onCreated={() => {}} onCancel={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Techpriest')).toBeTruthy()
      expect(screen.getByText('Demon')).toBeTruthy()
    })
  })

  it('prefills the name from the selected archetype', async () => {
    render(<NewVoiceWizard onCreated={() => {}} onCancel={() => {}} />)
    fireEvent.click(await screen.findByText('Demon'))

    const input = screen.getByPlaceholderText(/archetype/) as HTMLInputElement
    expect(input.value).toBe('Demon')
  })

  it('keeps a user-typed name when switching archetypes', async () => {
    render(<NewVoiceWizard onCreated={() => {}} onCancel={() => {}} />)
    fireEvent.click(await screen.findByText('Demon'))

    const input = screen.getByPlaceholderText(/archetype/) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Grukk the Devourer' } })
    fireEvent.click(screen.getByText('Techpriest'))
    expect(input.value).toBe('Grukk the Devourer')
  })

  it('generates the voice and reports creation', async () => {
    const onCreated = vi.fn()
    render(<NewVoiceWizard onCreated={onCreated} onCancel={() => {}} />)
    fireEvent.click(await screen.findByText('Demon'))
    fireEvent.click(screen.getByText('Create Voice'))

    await waitFor(() => {
      expect(mockPersona.voices.generate).toHaveBeenCalledWith('demon', 'Demon')
      expect(onCreated).toHaveBeenCalled()
    })
  })

  it('disables creation until an archetype is selected', async () => {
    render(<NewVoiceWizard onCreated={() => {}} onCancel={() => {}} />)
    await screen.findByText('Demon')

    const create = screen.getByText('Create Voice') as HTMLButtonElement
    expect(create.disabled).toBe(true)
  })

  it('shows the voices folder and changes it via the picker', async () => {
    mockPersona.voices.pickDir.mockResolvedValueOnce('/home/user/MyVoices')
    render(<NewVoiceWizard onCreated={() => {}} onCancel={() => {}} />)

    await screen.findByText(/Saving to:/)
    fireEvent.click(screen.getByText('Change...'))

    await waitFor(() => {
      expect(mockPersona.voices.setDir).toHaveBeenCalledWith('/home/user/MyVoices')
    })
  })

  it('keeps the folder when the picker is cancelled', async () => {
    render(<NewVoiceWizard onCreated={() => {}} onCancel={() => {}} />)
    await screen.findByText(/Saving to:/)
    fireEvent.click(screen.getByText('Change...'))

    await waitFor(() => expect(mockPersona.voices.pickDir).toHaveBeenCalled())
    expect(mockPersona.voices.setDir).not.toHaveBeenCalled()
  })

  it('cancels without generating', async () => {
    const onCancel = vi.fn()
    render(<NewVoiceWizard onCreated={() => {}} onCancel={onCancel} />)
    fireEvent.click(await screen.findByText('Cancel'))

    expect(onCancel).toHaveBeenCalled()
    expect(mockPersona.voices.generate).not.toHaveBeenCalled()
  })
})
