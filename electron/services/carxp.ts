import { readFileSync } from 'fs'

/**
 * Parse a Carla .carxp project file and extract ordered plugin names.
 * Returns an array of plugin names in chain order.
 *
 * .carxp files are XML with structure:
 *   <CARLA-PROJECT>
 *     <Plugin><Info><Name>Calf Compressor</Name>...</Info>...</Plugin>
 *     <Plugin><Info><Name>Calf Reverb</Name>...</Info>...</Plugin>
 *   </CARLA-PROJECT>
 */
export function parseCarxpPlugins(filePath: string): string[] {
  const xml = readFileSync(filePath, 'utf-8')
  const plugins: string[] = []

  // Match each <Plugin>...<Info>...<Name>...</Name>...</Info>...</Plugin> block
  const pluginBlocks = xml.match(/<Plugin>[\s\S]*?<\/Plugin>/g)
  if (!pluginBlocks) return plugins

  for (const block of pluginBlocks) {
    const nameMatch = block.match(/<Info>[\s\S]*?<Name>(.*?)<\/Name>[\s\S]*?<\/Info>/)
    if (nameMatch && nameMatch[1]) {
      plugins.push(nameMatch[1].trim())
    }
  }

  return plugins
}

/**
 * Get the first and last plugin names from a .carxp file.
 * Returns null if the file has no plugins.
 */
export function getCarxpEndpoints(filePath: string): { first: string; last: string } | null {
  const plugins = parseCarxpPlugins(filePath)
  if (plugins.length === 0) return null
  return { first: plugins[0], last: plugins[plugins.length - 1] }
}

export interface CarxpValidation {
  hasPlugins: boolean
  hasInternalPatchbay: boolean
  pluginNames: string[]
}

/**
 * Validate a .carxp file for routing readiness.
 * Checks for plugins and internal patchbay wiring.
 * Missing <Patchbay> means plugins won't be wired internally by Carla.
 */
export function validateCarxp(filePath: string): CarxpValidation {
  const xml = readFileSync(filePath, 'utf-8')
  const pluginNames = parseCarxpPlugins(filePath)
  const hasInternalPatchbay = /<Patchbay>/.test(xml)

  return {
    hasPlugins: pluginNames.length > 0,
    hasInternalPatchbay,
    pluginNames
  }
}
