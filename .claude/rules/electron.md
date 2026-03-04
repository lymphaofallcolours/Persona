# Rules for Electron codebase

## Main Process (electron/)
- All system calls (pw-link, Carla spawn, file I/O) happen here. Never in renderer.
- Services are standalone — no cross-dependencies between pipewire.ts, carla.ts, devices.ts, presets.ts.
- IPC handlers compose services into use cases. New features wire through handlers.ts.
- Always use `execFile` (not `exec`) for subprocess calls — prevents shell injection.
- Timeouts on all subprocess calls (2000ms for pw-link, 1000ms for pactl).

## Renderer Process (src/)
- Access system APIs only through `window.persona` (typed IPC bridge).
- Never import from `electron/` directly in renderer code.
- Components are functional React with hooks. No class components.
- State flows down via props. IPC calls go up via callbacks.

## IPC Pattern
- Add new channels to `electron/ipc/channels.ts` first.
- Add handler in `electron/ipc/handlers.ts`.
- Expose in `electron/preload.ts` PersonaAPI interface.
- Type the API in `src/env.d.ts` for renderer access.

## Testing
- Unit tests for services (pipewire.ts, presets.ts, etc.) with vitest.
- Component tests for React components with @testing-library/react.
- E2E tests with Playwright for full app flows.
- Write tests before implementation (TDD) where feasible.
