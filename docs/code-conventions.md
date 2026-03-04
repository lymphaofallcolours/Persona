# Code Conventions

<!-- Claude: Update when a new pattern is adopted or an anti-pattern is discovered. -->

## Current Conventions (Python)

### Naming

- Files: `kebab-case` (e.g., `persona.py`, `install-hooks.sh`)
- Functions/variables: `snake_case` (e.g., `activate_preset`, `_active_links`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MIC`, `SINK`, `PRESETS`, `COLORS`)
- Private helpers: prefix with `_` (e.g., `_run_pw_link`, `_batch_pw_commands`)

### Patterns

- Module-level constants at top of file, grouped logically
- Threading for I/O parallelism (subprocess calls to `pw-link`)
- GUI updates via `.after(0, callback)` to stay on Tk main thread
- `subprocess.run` with `capture_output=True, timeout=2` for all external commands
- Global mutable state (`_active_links`) for tracking current connections

### Imports

Standard library only, grouped at top:
```python
import subprocess
import threading
import tkinter as tk
```

---

## TypeScript Conventions (Post-Migration)

<!-- Applies after TS migration -->

### Guiding Principles

- Pure functions by default. Isolate side effects at boundaries.
- Composition over inheritance — always.
- Make invalid states unrepresentable via TypeScript's type system.
- Prefer explicitness over cleverness.

### Naming

- Files/directories: `kebab-case` (e.g., `switch-preset.ts`, `pipewire-adapter.ts`)
- Types/Interfaces: `PascalCase` — no `I` prefix (e.g., `AudioRouter`, not `IAudioRouter`)
- Functions/variables: `camelCase`
- Constants/env: `UPPER_SNAKE_CASE`
- Boolean variables: prefix with `is`, `has`, `should`, `can`

### Result Pattern (Expected Errors)

```typescript
import { ok, err, Result } from 'neverthrow';

function connectLink(source: string, sink: string): Result<void, LinkError> {
  // ...
}

// Caller handles both paths explicitly
result.match({
  ok: () => updateUI(),
  err: (error) => log.warn(error.message),
});
```

Use for: validation failures, business rule violations, expected "not found" cases.
Reserve `try/catch` for: network failures, subprocess errors, truly unexpected bugs.

### Zod Validation at Boundaries

```typescript
import { z } from 'zod';

const PresetSchema = z.object({
  name: z.string().min(1),
  plugins: z.array(z.string()).nullable(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});

type PresetConfig = z.infer<typeof PresetSchema>;
```

### Command-Query Separation

```typescript
// QUERY — returns data, no side effects
function getActiveLinks(): AudioLink[] { ... }

// COMMAND — mutates state, returns void or Result
async function switchPreset(name: string): Promise<Result<void, PresetError>> { ... }
```

### Anti-Patterns to Avoid

| Anti-Pattern | Do Instead |
|-------------|------------|
| Default exports | Named exports only |
| Class inheritance | Composition, interfaces |
| `any` type | `unknown` + type guards, Zod parsing |
| Barrel files (`index.ts` re-exports) | Direct imports via path aliases |
| Mutable shared state | Immutable by default, `Readonly<T>` |

### Import Order

```typescript
// 1. Node builtins
import { execFile } from 'node:child_process';

// 2. External packages
import { z } from 'zod';
import { ok, err } from 'neverthrow';

// 3. Internal — path aliases, never cross-layer relative imports
import { PresetConfig } from '@/domain/preset-config';
import { SwitchPreset } from '@/application/switch-preset';
```
