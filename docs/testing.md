# Testing

<!-- Claude: Update when new testing patterns, fixtures, or conventions are established. -->

## Philosophy

**Test-Driven Development (TDD).** Red-Green-Refactor. Write the test first, watch it fail,
make it pass, then clean up. Tests are specifications, not afterthoughts.
Target cycle: ≤5 minutes per Red-Green-Refactor loop.

## Frameworks

- **Unit + Integration:** [vitest](https://vitest.dev/) — fast, native ESM, TypeScript support
- **Component:** [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro) — test React components as users see them
- **E2E:** [Playwright](https://playwright.dev/) with [@playwright/test](https://playwright.dev/docs/intro) — full Electron app testing

## Test Pyramid

| Layer | Target | Scope | Speed | Framework |
|-------|--------|-------|-------|-----------|
| Unit | ~70% | Single function, no I/O | < 50ms each | vitest |
| Component | ~15% | React components, mocked IPC | < 200ms each | vitest + @testing-library/react |
| E2E | ~15% | Full Electron app, real IPC | < 30s each | Playwright |

## File Naming & Location

```
electron/services/pipewire.test.ts          # Unit test (colocated)
electron/services/presets.test.ts            # Unit test (colocated)
electron/services/devices.test.ts            # Unit test (colocated)
electron/services/carla.test.ts              # Unit test (colocated)
src/components/PresetPanel.test.tsx          # Component test (colocated)
src/components/PresetEditor.test.tsx         # Component test (colocated)
src/components/DeviceSelector.test.tsx       # Component test (colocated)
tests/e2e/preset-switching.e2e.test.ts       # E2E test
tests/e2e/device-selection.e2e.test.ts       # E2E test
tests/e2e/carla-lifecycle.e2e.test.ts        # E2E test
tests/fixtures/                              # Shared factories and seed data
```

## TDD Workflow

1. **Red:** Write a failing test that describes the behavior you want.
2. **Green:** Write the minimum code to make the test pass.
3. **Refactor:** Clean up the code while keeping tests green.

For new features, write tests at the unit level first, then add component or E2E tests
for critical user flows.

## Unit Tests — What to Test

### PipeWireService (`pipewire.test.ts`)
- `buildPresetLinks()` — correct link chain for 0, 1, N plugins, and Off
- `listOutputPorts()` / `listInputPorts()` — parse pw-link output correctly
- `listLinks()` — parse pw-link -l output correctly
- Mock `child_process.execFile` to avoid real system calls

### PresetStore (`presets.test.ts`)
- `loadConfig()` — creates default config on first run
- `createPreset()` — generates UUID, appends to list
- `deletePreset()` — removes by ID, blocks factory presets
- `duplicatePreset()` — deep copy with new ID and "(Copy)" suffix
- `reorderPresets()` — reorders by ID list
- Use temp directory for config file in tests

### DeviceService (`devices.test.ts`)
- `parsePorts()` — groups port lines into AudioDevice objects
- Hardware filtering — only alsa_ devices, not Carla plugins

### CarlaService (`carla.test.ts`)
- `isRunning()` — returns true/false based on pgrep output
- `launch()` — tries Flatpak first, falls back to native
- Mock `child_process` for all tests

## Component Tests — What to Test

### PresetPanel
- Renders all presets as buttons
- Active preset is visually highlighted
- Click calls onActivate with correct ID
- Context menu shows edit/duplicate/delete
- Factory presets don't show delete option

### PresetEditor
- New preset: starts with empty fields
- Edit preset: populates existing values
- Drag-and-drop reorders plugin chain
- Save disabled when name is empty
- Cancel closes without saving

### DeviceSelector
- Renders "Auto" plus all detected devices
- Changing selection calls setSelected

## E2E Tests — Critical User Journeys

### Preset Switching (`preset-switching.e2e.test.ts`)
1. App launches and shows factory presets
2. Click "Techpriest" → status bar updates to "Techpriest"
3. Click "Off" → status bar updates to "Off"
4. Create new preset → appears in grid
5. Edit preset → changes reflected
6. Delete preset → removed from grid

### Device Selection (`device-selection.e2e.test.ts`)
1. Device dropdowns populate on launch
2. Changing input device persists across restart

### Carla Lifecycle (`carla-lifecycle.e2e.test.ts`)
1. Click "Launch" → Carla status turns green
2. Click "Stop" → Carla status turns grey
3. Activating effects preset auto-launches Carla

## Test Structure (AAA Pattern)

```typescript
describe('buildPresetLinks', () => {
  it('creates direct passthrough for empty plugin list', () => {
    // Arrange
    const input = 'alsa_input.mic'
    const output = 'alsa_output.headphones'

    // Act
    const links = buildPresetLinks(input, output, [], false)

    // Assert
    expect(links).toEqual([
      { source: 'alsa_input.mic:capture_FL', destination: 'alsa_output.headphones:playback_FL' },
      { source: 'alsa_input.mic:capture_FR', destination: 'alsa_output.headphones:playback_FR' }
    ])
  })
})
```

## Mocking Rules

- Mock ONLY at architectural boundaries (subprocess calls, file system, IPC).
- NEVER mock the unit under test.
- For React components, mock `window.persona` IPC bridge.
- Prefer test doubles (fakes with in-memory state) over mock objects.
- If a test needs more than 3 mocks, the code under test has too many dependencies.

## Running Tests

```bash
npm test                    # Run all unit + component tests
npm run test:e2e            # Run E2E tests (requires built app)
npm run test:coverage       # Unit + component tests with coverage report
```

## Coverage

- Line coverage floor: ≥70%. Not a target to game — a floor to maintain.
- Focus coverage on services (pipewire, presets, devices, carla) and critical components.
