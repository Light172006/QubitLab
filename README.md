# QubitLab

QubitLab is a browser-based quantum circuit learning tool: build circuits by drag-and-drop or by writing Cirq-style code, simulate them, and get grounded explanations. Frontend only, fully mocked.

## Status

This is a **frontend prototype with a mock data layer and no backend**. The requirements document `doc/02_SRS.md` specifies a FastAPI service plus LLM adapter; none of that exists yet. The tutor is **not backed by an LLM** — it uses fixed templates, artificial delays, and substring keyword matching (see [How the tutor works](#8-how-the-tutor-works--and-that-no-llm-is-wired-up)).

## Getting Started

```bash
npm install
npm run dev
```

No `.env` setup is needed. `src/api/client.ts` defaults to the mock layer (`VITE_USE_MOCK` is truthy by default) and there is no network path in the codebase.

## Scripts

| Script | Command |
|--------|---------|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `lint` | `eslint .` |
| `preview` | `vite preview` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |

## Tech Stack

Vite, React 18, TypeScript strict, Tailwind, Zustand, React Router, `@dnd-kit` for canvas drag/drop, Monaco for the code editor, Recharts, three.js for Bloch spheres, lucide-react, Vitest + React Testing Library.

## Project Layout

```
src/
├── pages/              # Login, Home, Workspace, ChallengePage, Progress, Dashboard
├── components/
│   ├── canvas/         # CircuitCanvas, GateTile, Wire, GatePalette, CanvasToolbar, CodeEditor
│   ├── state/          # StatePanel, BlochSphere, AmplitudeTable, HistogramPanel
│   ├── tutor/          # TutorDrawer, TutorButton
│   └── lessons/        # LessonPlayer, ChallengePanel
├── mock/               # simulator, codeParser, tutor, content, dashboardData
├── api/client.ts       # Mock-backed async API surface
├── store/index.ts      # Zustand stores
├── design/tokens.js    # Shared design tokens (single source of truth)
└── tests/              # 26 test files
doc/                    # PRD, SRS, architecture, UI/UX specs (note: doc/, not docs/)
```

## How Simulation Works

`simulateCircuit` in `src/mock/simulator.ts` is a **real statevector simulator**, not a stub. It builds gate matrices from basis-index bit layout so CNOT/CZ are correct at any register width, computes probabilities, Bloch vectors with purity, entanglement detection, and emits a `FactsPacket`. The PRD limits scope to 5 qubits.

## How the Tutor Works — and That No LLM Is Wired Up

Be explicit:

- `api.explain` / `api.ask` lazy-import `src/mock/tutor.ts` and stream from deterministic templates.
- "Streaming" is simulated: 1500 ms initial delay, then 40–50 ms per three-word chunk.
- The fallback is deterministic (mock mode has no backend), not random.
- Q&A is word-boundary quantum-term matching. Beginner mode is a regex rewrite swapping terms like "fidelity" → "overlap".
- The design intent in `doc/03_System_Architecture.md` is a server-side LLM adapter with a 6 s timeout and deterministic fallback (SRS FR-AI-06, NFR-SEC-03).

## Test Suite

26 test files, **275 tests passing** (as of `06bc299` on `bugfix-audit`):

| File | Coverage |
|------|----------|
| `simulator.test.ts` | Single-qubit gates, statevector basics |
| `multiQubit.test.ts` | GHZ, non-adjacent controls, 4-qubit CNOT, 3-qubit CZ, degenerate gates, B12 facts |
| `codeParser.test.ts` | Cirq-style parsing and error reporting |
| `canvasEditing.test.tsx` | Gate delete, move, measure lock |
| `workspaceSimulation.test.tsx` | Resimulate on undo/redo/reset, code-edit resimulate, error rendering |
| `tutorStreamSupersede.test.tsx` | Stale-stream cancellation |
| `tutorDrawer.test.tsx` | Drawer accessibility |
| `contrast.test.ts` | Design-token contrast ratios |
| `persistedState.test.ts` | Lesson/circuit rehydration safety |
| `routing.test.tsx` | Role redirects, nav wiring |
| `lessonRouting.test.tsx` | Lesson card links, sandbox flag |
| `challenges.test.tsx` | Fidelity, scoring, hint ladder |
| `paletteKeyboard.test.tsx` | Keyboard drag, button roles |
| `formatting.test.tsx` | Bit-order relabelling, negative-zero snap |
| `tutorAsk.test.tsx` | Off-topic redirect, Enter/Shift+Enter, empty/long input |
| `twoQubitColumn.test.ts` | Cross-column CNOT rejection |
| `lessonSteps.test.tsx` | Marginal probabilities, entanglement checks |
| `shotHistogram.test.tsx` | Histogram counts sum, zero/non-zero handling |
| `deepLinkLogin.test.tsx` | Auth deep links |

## Bugfix Audit (branch `bugfix-audit`)

All BLOCKER and MAJOR bugs from the full audit are fixed. Summary:

| Bug | Area | Fixed |
|-----|------|-------|
| **B01** | Lesson state crash on refresh (`completedSteps` Set → array + persist merge) | ✅ |
| **B02** | Build failure: `challenges.test.ts` was `.ts` with JSX | ✅ |
| **B03** | Instructor blank screen on `/learn` (self-redirect loop) | ✅ |
| **B04** | CNOT/CZ cross-column collision (target clicked in different column than control) | ✅ |
| **B05/B10/B11** | Bit-order toggle didn't relabel amplitude table/histogram/header | ✅ |
| **B06** | CH2 "Prepare \|+⟩" passed on Bell state (false positive) | ✅ |
| **B07** | Challenge scoring/hints/feedback messages missing | ✅ |
| **B08** | Lessons 2 & 3 unreachable (all cards linked to bare `/workspace`) | ✅ |
| **B09** | Reset hardcodes `num_qubits: 2` | ✅ |
| **B12** | Palette click/Enter no-op; keyboard drag broken | ✅ |
| **B13** | Drop rejection silent (no feedback) | ✅ |
| **B14** | Grid cells not focusable, no keyboard placement | ✅ (via dnd-kit KeyboardSensor) |
| **B15** | Tutor "Offline" badge random (`Math.random() < 0.2`), text identical | ✅ |
| **B16** | Off-topic detection never fired (bare-letter keywords) | ✅ |
| **B17** | Ask box `<input>` → Shift+Enter newline impossible | ✅ (`<textarea>`) |
| **B18** | Bloch reduced-motion ignored (stale closure) | ✅ |
| **B19** | Bloch hide irreversible (no show button) | ✅ |
| **B20** | "Completed Steps" list mismatched header count | ✅ |
| **B21** | Hint ladder revealed all text at once | ✅ |
| **B22** | Challenge sim debounced 400 ms (vs 100 ms budget) | ✅ |
| **B25** | No logout on Workspace/Challenge pages | ✅ |
| **B26** | `checkLessonStep` 1-bit targets vs 2-bit state keys | ✅ |
| **B27** | `-0.00` / `-0.0000` in readouts | ✅ |
| **B38** | Bloch WebGL leak (geometries/materials/context not released) | ✅ |
| **B39** | Palette `role="listitem"` ignored `aria-label` | ✅ |

### Remaining Minor/Deferred

| Bug | Description | Status |
|-----|-------------|--------|
| **B8/B9** | Lesson step validation logic defects in `content.ts` (edge-case probability checks) | Deferred — not blocking core flow |
| **B10** | Unknown users get hardcoded 1/3 progress in `dashboardData.ts` | Deferred — mock data |
| **B13** | `setShots`/`setBackend` don't trigger resimulate | Deferred — Shots/Backend mock-only |
| **B14/B15** | Challenge fidelity proxy (`1 - |p0-0.5| - |p1-0.5|`) not true statevector fidelity | Deferred — scoring approximation |
| **B34** | `store.addGate` ID collision (`Date.now()` only) | Deferred — unused in app |
| **B37** | `syncStatus === 'code-only'` never set | Deferred — dead code |

## Architectural Gaps

- **No backend.** `doc/03_System_Architecture.md` specifies FastAPI + simulators + SQLite; the browser does everything.
- **No LLM.** Tutor is templates only.
- **Auth is a mock login** with no real session or token validation.
- **All progress data is hardcoded** in `src/mock/dashboardData.ts`.

## Verification

- `npm run build` ✓ (main bundle 324 kB gzip)
- `npm test` ✓ (26 files, 275 tests pass)
- `npm run preview` ✓ (no console errors)
- Browser-verified: instructor redirect, lesson 2/3 open, sandbox hides lesson, keyboard drag, bit-order toggle, reduced-motion, Bloch hide/show