# Testing Patterns

<!-- Claude: Update when new testing patterns, fixtures, or conventions are established. -->

## Philosophy

Red-Green-Refactor. Tests are specifications, not afterthoughts.
Target cycle: ≤5 minutes per Red-Green-Refactor loop.

## Current State

No automated tests. The project is a single 163-line Python file.
Testing is manual: click preset buttons, listen to audio output through headphones.

## Planned Approach (Python Era)

Framework: **pytest**

Focus areas:
- Unit test `activate_preset` logic — verify correct `pw-link` command sequences for each preset type
- Unit test link building — empty chain, single plugin, multiple plugins, None (Off)
- Mock `subprocess.run` at boundary — verify exact args passed to `pw-link`
- Test `disconnect_current` clears `_active_links` and issues correct `-d` commands

## Planned Approach (Post-TS Migration)

Framework: **vitest**

### Pyramid Ratio

| Layer | Target | Scope | Speed |
|-------|--------|-------|-------|
| Unit | ~70% | Single function/class, no I/O | < 50ms each |
| Integration | ~20% | Module interactions, subprocess calls | < 2s each |
| E2E | ~10% | Critical user journeys (preset switching) | < 30s each |

### File Naming & Location

- Unit tests: colocated as `{module}.test.ts` next to source file
- Integration tests: `tests/integration/{feature}.integration.test.ts`
- E2E tests: `tests/e2e/{journey}.e2e.test.ts`
- Test fixtures: `tests/fixtures/` — shared factories and seed data

### Test Structure (AAA)

```typescript
describe('SwitchPreset', () => {
  it('builds correct link chain for multi-plugin preset', () => {
    // Arrange
    const preset = createPreset({ plugins: ['Calf Compressor', 'Calf Reverb'] });
    const router = new FakeAudioRouter();

    // Act
    const result = switchPreset(preset, router);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(router.createdLinks).toEqual([
      { source: 'mic:capture_FL', sink: 'Calf Compressor:In L' },
      { source: 'mic:capture_FR', sink: 'Calf Compressor:In R' },
      { source: 'Calf Compressor:Out L', sink: 'Calf Reverb:In L' },
      { source: 'Calf Compressor:Out R', sink: 'Calf Reverb:In R' },
      { source: 'Calf Reverb:Out L', sink: 'sink:playback_FL' },
      { source: 'Calf Reverb:Out R', sink: 'sink:playback_FR' },
    ]);
  });
});
```

### Mocking Rules

- Mock ONLY at architectural boundaries (ports/adapters).
- NEVER mock the unit under test.
- NEVER mock domain entities or value objects — use real instances.
- Prefer test doubles (fakes with in-memory state) over mocks for `AudioRouter`.
- If a test needs more than 3 mocks, the code under test has too many dependencies.

### Coverage & Mutation Testing

- Line coverage baseline: ≥70%. Not a target to game — a floor to maintain.
- Mutation testing (StrykerJS) on critical domain logic — aim for ≥80% mutation score.

## Test Utilities

<!-- Document project-specific test helpers as they're created -->

| Utility | Location | Purpose |
|---------|----------|---------|
| _None yet_ | | |
