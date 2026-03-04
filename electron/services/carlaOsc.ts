import { Client } from 'node-osc'

export const CARLA_OSC_PORT = 22752

let client: Client | null = null
let currentPort: number = CARLA_OSC_PORT

/**
 * Connect to Carla's OSC server.
 */
export function connect(port: number = CARLA_OSC_PORT): void {
  disconnect()
  currentPort = port
  client = new Client('127.0.0.1', port)
}

/**
 * Disconnect from Carla's OSC server.
 */
export async function disconnect(): Promise<void> {
  if (client) {
    try {
      await client.close()
    } catch {
      // Socket may already be closed
    }
    client = null
  }
}

/**
 * Check if OSC client is connected.
 */
export function isConnected(): boolean {
  return client !== null
}

/**
 * Get the current OSC port.
 */
export function getPort(): number {
  return currentPort
}

/**
 * Set a plugin parameter value.
 * @param pluginId 0-indexed plugin ID in Carla
 * @param paramIndex Parameter index within the plugin
 * @param value Normalized value (0.0 - 1.0)
 */
export async function setParameterValue(
  pluginId: number,
  paramIndex: number,
  value: number
): Promise<void> {
  if (!client) throw new Error('OSC client not connected')
  await client.send(`/Carla/${pluginId}/set_parameter_value`, paramIndex, value)
}

/**
 * Enable or disable a plugin.
 */
export async function setPluginActive(pluginId: number, active: boolean): Promise<void> {
  if (!client) throw new Error('OSC client not connected')
  await client.send(`/Carla/${pluginId}/set_active`, active ? 1 : 0)
}

/**
 * Set plugin dry/wet mix.
 * @param value 0.0 (fully dry) to 1.0 (fully wet)
 */
export async function setDryWet(pluginId: number, value: number): Promise<void> {
  if (!client) throw new Error('OSC client not connected')
  await client.send(`/Carla/${pluginId}/set_drywet`, value)
}

/**
 * Set plugin output volume.
 * @param value 0.0 (silent) to 1.27 (Carla max)
 */
export async function setVolume(pluginId: number, value: number): Promise<void> {
  if (!client) throw new Error('OSC client not connected')
  await client.send(`/Carla/${pluginId}/set_volume`, value)
}
