# Dependencies

<!-- Claude: Update this file whenever a dependency is added, replaced, or removed. -->

## Format

For each dependency, document:
- **What it does** (one line)
- **Why it was chosen** over alternatives
- **Removal risk** — how coupled is the codebase to this dependency?

---

## Runtime Dependencies

### uuid

**Purpose:** Generate UUIDs for preset IDs.
**Chosen over:** `crypto.randomUUID()` (Node 19+ only, Electron may not always have it), nanoid (less standard).
**Removal risk:** Low — used only in `presets.ts`. Easy to swap.

---

## Dev Dependencies

### electron

**Purpose:** Desktop app runtime — provides Node.js main process + Chromium renderer.
**Chosen over:** Tauri (Rust backend adds friction), web-only (no native window features).
**Removal risk:** Very high — entire app architecture depends on Electron IPC model.

### electron-vite

**Purpose:** Build tool that handles both main process (Node) and renderer (Chromium) bundling.
**Chosen over:** Manual Vite + tsc setup (more config), electron-forge (heavier, more opinionated).
**Removal risk:** Medium — config-only, could swap to plain Vite if needed.

### electron-builder

**Purpose:** Packages the app into .AppImage and .deb for Linux distribution.
**Chosen over:** electron-forge (electron-builder has broader Linux support), manual packaging.
**Removal risk:** Low — packaging only, not used at dev time.

### react / react-dom

**Purpose:** UI framework for the renderer process.
**Chosen over:** Svelte (smaller ecosystem for drag-and-drop, color pickers), Vue, vanilla TS (too much manual work for reactive UI).
**Removal risk:** Very high — all components are React.

### tailwindcss / @tailwindcss/vite

**Purpose:** Utility-first CSS framework for styling.
**Chosen over:** CSS Modules (more verbose), shadcn/ui (added later if needed), styled-components (runtime overhead).
**Removal risk:** High — all components use Tailwind classes. Migration would require rewriting all styles.

### @vitejs/plugin-react

**Purpose:** Vite plugin for React JSX transform and Fast Refresh in development.
**Removal risk:** Low — build tooling only.

### typescript

**Purpose:** Type safety across main and renderer processes.
**Removal risk:** High — entire codebase is TypeScript.

### vite

**Purpose:** Fast bundler for the renderer process (React/Tailwind).
**Removal risk:** Medium — used via electron-vite, could be swapped.

### autoprefixer

**Purpose:** PostCSS plugin for CSS vendor prefixes (used by Tailwind).
**Removal risk:** Low — build tooling only.

### vitest

**Purpose:** Unit and component test runner — fast, native ESM, TypeScript support.
**Chosen over:** Jest (slower, ESM support weaker), Mocha (less integrated).
**Removal risk:** Low — test tooling only, no production code depends on it.

### @testing-library/react

**Purpose:** Test React components by interacting with them as users would.
**Chosen over:** Enzyme (deprecated), direct DOM manipulation (fragile).
**Removal risk:** Low — test tooling only.

### @testing-library/jest-dom

**Purpose:** Custom matchers for DOM assertions (toBeVisible, toHaveTextContent, etc.).
**Removal risk:** Low — test tooling only.

### jsdom

**Purpose:** Simulates browser DOM environment for component tests running in Node.
**Removal risk:** Low — test tooling only.

### @playwright/test

**Purpose:** E2E testing framework with Electron support.
**Chosen over:** Spectron (deprecated), Cypress (limited Electron support).
**Removal risk:** Low — E2E test tooling only.

### @types/react / @types/react-dom / @types/uuid

**Purpose:** TypeScript type definitions for React and uuid packages.
**Removal risk:** Low — dev tooling only.

---

## System Dependencies

### PipeWire

**Purpose:** Audio server providing JACK compatibility and modern audio routing.
**Chosen over:** PulseAudio (no JACK compatibility for Carla), raw JACK (less desktop integration).
**Removal risk:** Very high — entire project depends on PipeWire for audio routing.

### Carla (Flatpak or native)

**Purpose:** LV2/LADSPA plugin host — keeps audio effects loaded and provides GUIs for tweaking.
**Chosen over:** Hosting plugins directly (complex), JACK Rack (unmaintained).
**Removal risk:** Medium — Normal/Off presets work without it, but all effects presets require it.

### Calf Studio Gear (calf-plugins)

**Purpose:** LV2 plugin suite providing Compressor, EQ, Ring Modulator, Flanger, Reverb.
**Chosen over:** SWH LADSPA plugins (less GUI support), LSP plugins (less character effects).
**Removal risk:** Factory presets reference Calf plugin names. User presets can use any plugins.
