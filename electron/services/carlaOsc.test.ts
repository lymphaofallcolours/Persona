import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock node-osc before importing
const mockSend = vi.fn().mockResolvedValue(undefined)
const mockClose = vi.fn().mockResolvedValue(undefined)

vi.mock('node-osc', () => ({
  Client: vi.fn().mockImplementation(function (this: any) {
    this.send = mockSend
    this.close = mockClose
  })
}))

import { Client } from 'node-osc'
import {
  connect,
  disconnect,
  isConnected,
  getPort,
  setParameterValue,
  setPluginActive,
  setDryWet,
  setVolume,
  CARLA_OSC_PORT
} from './carlaOsc'

const MockClient = vi.mocked(Client)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  await disconnect()
})

describe('connection', () => {
  it('connects to default port', () => {
    connect()
    expect(MockClient).toHaveBeenCalledWith('127.0.0.1', CARLA_OSC_PORT)
    expect(isConnected()).toBe(true)
  })

  it('connects to custom port', () => {
    connect(9999)
    expect(MockClient).toHaveBeenCalledWith('127.0.0.1', 9999)
    expect(getPort()).toBe(9999)
  })

  it('disconnects and cleans up', async () => {
    connect()
    await disconnect()
    expect(mockClose).toHaveBeenCalled()
    expect(isConnected()).toBe(false)
  })

  it('disconnect is safe when not connected', async () => {
    await disconnect() // Should not throw
    expect(isConnected()).toBe(false)
  })
})

describe('setParameterValue', () => {
  it('sends OSC message with correct address', async () => {
    connect()
    await setParameterValue(0, 3, 0.75)
    expect(mockSend).toHaveBeenCalledWith('/Carla/0/set_parameter_value', 3, 0.75)
  })

  it('throws when not connected', async () => {
    await expect(setParameterValue(0, 0, 0.5)).rejects.toThrow('OSC client not connected')
  })
})

describe('setPluginActive', () => {
  it('sends 1 for active', async () => {
    connect()
    await setPluginActive(2, true)
    expect(mockSend).toHaveBeenCalledWith('/Carla/2/set_active', 1)
  })

  it('sends 0 for inactive', async () => {
    connect()
    await setPluginActive(1, false)
    expect(mockSend).toHaveBeenCalledWith('/Carla/1/set_active', 0)
  })
})

describe('setDryWet', () => {
  it('sends dry/wet value', async () => {
    connect()
    await setDryWet(0, 0.5)
    expect(mockSend).toHaveBeenCalledWith('/Carla/0/set_drywet', 0.5)
  })
})

describe('setVolume', () => {
  it('sends volume value', async () => {
    connect()
    await setVolume(1, 0.8)
    expect(mockSend).toHaveBeenCalledWith('/Carla/1/set_volume', 0.8)
  })
})
