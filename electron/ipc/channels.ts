export const IPC = {
  // Presets
  PRESETS_GET_ALL: 'presets:get-all',
  PRESET_ACTIVATE: 'preset:activate',
  PRESET_CREATE: 'preset:create',
  PRESET_UPDATE: 'preset:update',
  PRESET_DELETE: 'preset:delete',
  PRESET_DUPLICATE: 'preset:duplicate',
  PRESET_REORDER: 'preset:reorder',

  // Devices
  DEVICES_GET_INPUTS: 'devices:get-inputs',
  DEVICES_GET_OUTPUTS: 'devices:get-outputs',
  DEVICES_GET_SELECTED: 'devices:get-selected',
  DEVICES_SET_SELECTED: 'devices:set-selected',
  DEVICES_CHANGED: 'devices:changed',

  // Plugins (available in PipeWire)
  PLUGINS_GET_AVAILABLE: 'plugins:get-available',

  // Status
  STATUS_GET: 'status:get',
  STATUS_CHANGED: 'status:changed',

  // Toasts (main → renderer)
  TOAST: 'toast:show'
} as const
