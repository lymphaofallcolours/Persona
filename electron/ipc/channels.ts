export const IPC = {
  // Presets
  PRESETS_GET_ALL: 'presets:get-all',
  PRESET_ACTIVATE: 'preset:activate',
  PRESET_CREATE: 'preset:create',
  PRESET_UPDATE: 'preset:update',
  PRESET_DELETE: 'preset:delete',
  PRESET_DUPLICATE: 'preset:duplicate',
  PRESET_REORDER: 'preset:reorder',
  PRESET_EXPORT: 'preset:export',
  PRESET_IMPORT: 'preset:import',

  // Groups
  GROUP_GET_ALL: 'group:get-all',
  GROUP_CREATE: 'group:create',
  GROUP_UPDATE: 'group:update',
  GROUP_DELETE: 'group:delete',
  GROUP_REORDER: 'group:reorder',

  // Sessions
  SESSION_GET_ALL: 'session:get-all',
  SESSION_SAVE: 'session:save',
  SESSION_LOAD: 'session:load',
  SESSION_DELETE: 'session:delete',
  SESSION_UPDATE: 'session:update',

  // Devices
  DEVICES_GET_INPUTS: 'devices:get-inputs',
  DEVICES_GET_OUTPUTS: 'devices:get-outputs',
  DEVICES_GET_SELECTED: 'devices:get-selected',
  DEVICES_SET_SELECTED: 'devices:set-selected',
  DEVICES_CHANGED: 'devices:changed',

  // Carla
  CARLA_LAUNCH: 'carla:launch',
  CARLA_STOP: 'carla:stop',
  CARLA_IS_RUNNING: 'carla:is-running',
  CARLA_SET_WINDOW_MODE: 'carla:set-window-mode',
  CARLA_GET_WINDOW_MODE: 'carla:get-window-mode',

  // Mic monitoring
  MIC_MONITOR_TOGGLE: 'mic-monitor:toggle',
  MIC_MONITOR_GET: 'mic-monitor:get',

  // Dialog
  DIALOG_OPEN_FILE: 'dialog:open-file',
  DIALOG_SAVE_FILE: 'dialog:save-file',

  // OSC (Carla parameter control)
  OSC_CONNECT: 'osc:connect',
  OSC_DISCONNECT: 'osc:disconnect',
  OSC_IS_CONNECTED: 'osc:is-connected',
  OSC_SET_PARAMETER: 'osc:set-parameter',
  OSC_SET_PLUGIN_ACTIVE: 'osc:set-plugin-active',
  OSC_SET_DRYWET: 'osc:set-drywet',
  OSC_SET_VOLUME: 'osc:set-volume',

  // Status
  STATUS_GET: 'status:get',
  STATUS_CHANGED: 'status:changed',

  // Toasts (main → renderer)
  TOAST: 'toast:show'
} as const
