// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { SetupDoctor } from './SetupDoctor'
import type { SetupReport } from '../types'

const okReport: SetupReport = {
  allOk: true,
  checks: [
    { id: 'pipewire', label: 'PipeWire audio system', status: 'ok', detail: 'PipeWire is running.', fixable: false },
    { id: 'carla', label: 'Carla plugin host', status: 'ok', detail: 'Carla is installed (Flatpak).', fixable: false }
  ]
}

const brokenReport: SetupReport = {
  allOk: false,
  checks: [
    { id: 'pipewire', label: 'PipeWire audio system', status: 'ok', detail: 'PipeWire is running.', fixable: false },
    {
      id: 'carla', label: 'Carla plugin host', status: 'error',
      detail: 'Carla is not installed.', fixable: true, fixLabel: 'Install (~1 GB download)'
    }
  ]
}

const mockPersona = {
  setup: {
    runChecks: vi.fn(),
    applyFix: vi.fn().mockResolvedValue({ ok: true, message: 'done' })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as any).persona = mockPersona
})

afterEach(() => {
  cleanup()
})

describe('SetupDoctor', () => {
  it('runs checks on open and renders each row', async () => {
    mockPersona.setup.runChecks.mockResolvedValue(okReport)
    render(<SetupDoctor firstRun={false} onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('PipeWire audio system')).toBeTruthy()
      expect(screen.getByText('Carla plugin host')).toBeTruthy()
    })
    expect(mockPersona.setup.runChecks).toHaveBeenCalledOnce()
  })

  it('shows the all-ready banner when everything passes', async () => {
    mockPersona.setup.runChecks.mockResolvedValue(okReport)
    render(<SetupDoctor firstRun={false} onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/Everything is ready/)).toBeTruthy()
    })
  })

  it('shows a fix button for fixable failing checks and applies the fix', async () => {
    mockPersona.setup.runChecks.mockResolvedValue(brokenReport)
    render(<SetupDoctor firstRun={false} onClose={() => {}} />)

    const fixButton = await screen.findByText('Install (~1 GB download)')
    fireEvent.click(fixButton)

    await waitFor(() => {
      expect(mockPersona.setup.applyFix).toHaveBeenCalledWith('carla')
      // Re-checks after fixing
      expect(mockPersona.setup.runChecks).toHaveBeenCalledTimes(2)
    })
  })

  it('does not offer fixes for passing or unfixable checks', async () => {
    mockPersona.setup.runChecks.mockResolvedValue(okReport)
    render(<SetupDoctor firstRun={false} onClose={() => {}} />)

    await waitFor(() => screen.getByText(/Everything is ready/))
    expect(screen.queryByText('Fix')).toBeNull()
  })

  it('shows first-run welcome copy', async () => {
    mockPersona.setup.runChecks.mockResolvedValue(okReport)
    render(<SetupDoctor firstRun={true} onClose={() => {}} />)
    expect(screen.getByText(/One-Time Setup/)).toBeTruthy()
  })

  it('closes via the footer button', async () => {
    mockPersona.setup.runChecks.mockResolvedValue(okReport)
    const onClose = vi.fn()
    render(<SetupDoctor firstRun={false} onClose={onClose} />)

    const done = await screen.findByText('Done')
    fireEvent.click(done)
    expect(onClose).toHaveBeenCalled()
  })
})
