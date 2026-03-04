/// <reference types="vite/client" />

import type { PersonaAPI } from '../electron/preload'

declare global {
  interface Window {
    persona: PersonaAPI
  }
}

export {}
