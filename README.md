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
└── tests/              # 8 test files
doc/                    # PRD, SRS, architecture, UI/UX specs (note: doc/, not docs/)
```

## How Simulation Works

`simulateCircuit` in `src/mock/simulator.ts` is a **real statevector simulator**, not a stub. It builds gate matrices from basis-index bit layout so CNOT/CZ are correct at any register width, computes probabilities, Bloch vectors with purity, entanglement detection, and emits a `FactsPacket`. The PRD limits scope to 5 qubits.

## How the Tutor Works — and That No LLM Is Wired Up

Be explicit:

- `api.explain` / `api.ask` lazy-import `src/mock/tutor.ts` and stream from deterministic templates.
- "Streaming" is simulated: 1500 ms initial delay, then 40–50 ms per three-word chunk.
- The 20% fallback is `Math.random() < 0.2`; both branches emit identical text.
- Q&A is substring keyword matching (including bare letters like `h`, `x`, `z`, `s`, `t`), not comprehension. Beginner mode is a regex rewrite swapping terms like "fidelity" → "overlap".
- The design intent in `doc/03_System_Architecture.md` is a server-side LLM adapter with a 6 s timeout and deterministic fallback (SRS FR-AI-06, NFR-SEC-03).

## Test Suite

8 files, 95 tests, all passing (as of `45bf1e2`):

| File | Coverage |
|------|----------|
| `simulator.test.ts` | Single-qubit gates, statevector basics |
| `multiQubit.test.ts` | GHZ, non-adjacent controls, 4-qubit CNOT, 3-qubit CZ, degenerate gates, B12 facts |
| `codeParser.test.ts` | Cirq-style parsing and error reporting |
| `canvasEditing.test.tsx` | Gate delete, move, measure lock |
| `workspaceSimulation.test.tsx` | B5 resimulate on undo/redo/reset, B6 code-edit resimulate, B7 error rendering |
| `tutorStreamSupersede.test.tsx` | B11 stale-stream cancellation |
| `tutorDrawer.test.tsx` | Drawer accessibility |
| `contrast.test.ts` | Design-token contrast ratios |

## Known Limitations and Open Issues

### Architectural Gaps

- **No backend.** `doc/03_System_Architecture.md` specifies FastAPI + simulators + SQLite; the browser does everything.
- **No LLM.** Tutor is templates only.
- **Auth is a mock login** with no real session or token validation.
- **All progress data is hardcoded** in `src/mock/dashboardData.ts`.

### Open Bugs (triaged, not yet fixed)

| Bug | Description | Code Anchor |
|-----|-------------|-------------|
| **B8** | Lesson step validation defects | `src/mock/content.ts` |
| **B9** | Lesson checklist failures: `probability` check only iterates target states, so unexpected non-zero states never fail the step | `src/mock/content.ts:173-190` |
| **B10** | Any user not in `MOCK_STUDENTS` gets hardcoded 1/3 progress regardless of real activity | `src/mock/dashboardData.ts:14-28` |
| **B12 (partial)** | Simulator side is fixed, but nothing supplies the true `CircuitAction`; "added H at t=0 while X sits at t=5" still reports X. Needs action channel threaded `CircuitCanvas` → `Workspace`/`ChallengePage` → `api.simulate` → `simulateCircuit`. Also `src/mock/tutor.ts:6-7` has a bad p0/p1 key lookup that reports 0% on 1-qubit-cleared states. | `src/mock/tutor.ts:6-7` |
| **B13** | `setShots` and `setBackend` only write to the UI store, but the simulate effect keys on `[circuit]` alone, so neither triggers a resimulate | `src/components/canvas/CanvasToolbar.tsx:38-79` |
| **B14/B15** | Fidelity scoring is a loose proxy (e.g. CH2: `1 - \|p0-0.5\| - \|p1-0.5\|`, CH3: `min(p00,p11)*2`), not a real fidelity against the target statevector | `src/mock/content.ts:216-232` |

### Verification Gaps

Placed-gate drag/drop and tutor drawer UI behavior were only verified at code level — no browser was available for runtime smoke testing.

---

*Baseline commit: `45bf1e2` — `npx tsc --noEmit` clean, `npm test` 95/95, `npm run build` succeeds (pre-existing 500 kB chunk warning).*