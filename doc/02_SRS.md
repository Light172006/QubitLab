# Software Requirements Specification (SRS)

**System:** Quantum Circuit Sandbox with a Live AI Tutor (QCS)
**Reference:** SIH26140 | Team LUNATICSS (154009)
**Version:** 1.0 | Structure follows IEEE 830 / ISO 29148 conventions

Requirement keywords: **SHALL** = mandatory, **SHOULD** = recommended, **MAY** = optional. Priority: M (MVP), S (stretch), F (future).

---

## 1. Introduction

### 1.1 Purpose
Defines the functional and non-functional requirements of QCS so that the 4-person team can build, test and demonstrate a working prototype.

### 1.2 Scope
A web application that lets users design quantum circuits (graphically or in code), simulate them on classical simulators, visualise states and results, receive grounded AI explanations, complete lessons/challenges, and lets instructors monitor progress. Out of scope: real quantum hardware, >5 qubits, noise models.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Circuit JSON | Canonical internal representation (IR) of a circuit; single source of truth |
| Facts packet | Deterministic, computed description of the circuit state given to the LLM |
| Bloch vector | (x, y, z) expectation values of a single qubit's reduced state |
| Fidelity | \|⟨target\|ψ⟩\|², used to check challenges |
| QASM | OpenQASM, text interchange format for circuits |
| Backend | Simulator adapter (Aer, Cirq, PennyLane) |

### 1.4 References
IBM Quantum docs (Qiskit Aer, visualization); OpenQASM spec; Cirq and PennyLane docs; Hu, Li & Singh (2024); Reinikainen et al. (2024); UNESCO (2023).

## 2. Overall Description

### 2.1 Product perspective
Standalone web app: React SPA ⇄ FastAPI service ⇄ {simulators, LLM API, SQLite}.

### 2.2 User classes
Student, Learner/Professional, Educator (see PRD §4). Roles in prototype: `student`, `instructor`.

### 2.3 Operating environment
Client: current Chrome/Edge/Firefox, ≥1280×720. Server: Python 3.11+, Linux/macOS/Windows, 2 vCPU / 2 GB RAM is sufficient.

### 2.4 Constraints
- C1. ≤5 qubits, ≤30 columns (time steps) per circuit.
- C2. Gate set: `H, X, Z, S, T, CNOT, CZ, Measure`.
- C3. No quantum hardware dependency.
- C4. LLM must never be the source of numerical truth.
- C5. User code executes only in a restricted sandbox.

### 2.5 Assumptions
Stable internet for the LLM API (fallback otherwise); users know basic linear algebra (not required, but tutor adapts).

## 3. System Features and Functional Requirements

### 3.1 Circuit Builder (Canvas)
| ID | Requirement | Pri |
|---|---|---|
| FR-CB-01 | The system SHALL display 5 qubit wires (q0 at top) initialised to \|0⟩. | M |
| FR-CB-02 | The user SHALL be able to drag a gate from the palette onto a wire/column cell. | M |
| FR-CB-03 | Two-qubit gates (CNOT, CZ) SHALL require choosing control and target; invalid placement (same qubit) SHALL be rejected with a message. | M |
| FR-CB-04 | The user SHALL be able to move, delete, undo, redo and reset (clear) gates. | M |
| FR-CB-05 | Undo/redo SHALL support at least 50 steps. | M |
| FR-CB-06 | `Measure` SHALL be terminal: no gate may be placed after Measure on the same qubit. | M |
| FR-CB-07 | The user SHOULD be able to set the number of active qubits (1–5). | S |
| FR-CB-08 | Every edit SHALL update the Circuit JSON and trigger simulation (debounced ≤400 ms). | M |

### 3.2 Code Mode
| ID | Requirement | Pri |
|---|---|---|
| FR-CM-01 | The system SHALL provide a code editor (Qiskit syntax highlighting). | M |
| FR-CM-02 | For the supported subset (`qc.h/x/z/s/t/cx/cz/measure`), code SHALL convert to Circuit JSON and update the canvas (code → canvas). | M |
| FR-CM-03 | Canvas edits SHALL regenerate canonical code (canvas → code). | M |
| FR-CM-04 | Code outside the supported subset SHALL NOT break the UI; the system SHALL show "code-only mode" with simulation run via the sandbox and canvas read-only. | S |
| FR-CM-05 | Syntax/semantic errors SHALL be reported with line number and plain-language message. | M |
| FR-CM-06 | Code execution SHALL be sandboxed (see NFR-SEC-01..04). | M |
| FR-CM-07 | The system SHOULD export the circuit as OpenQASM 2.0/3.0 text. | S |

### 3.3 Simulation
| ID | Requirement | Pri |
|---|---|---|
| FR-SIM-01 | The system SHALL compute the exact statevector of the circuit (pre-measurement) using Qiskit. | M |
| FR-SIM-02 | The system SHALL return probabilities for all 2ⁿ basis states. | M |
| FR-SIM-03 | The system SHALL run shot-based sampling (default 1024 shots, selectable 128–8192) via Qiskit Aer when Measure is present. | M |
| FR-SIM-04 | The system SHALL compute per-qubit Bloch vectors from reduced density matrices. | M |
| FR-SIM-05 | The system SHALL compute per-qubit purity and flag entanglement when purity < 1 − 1e‑6. | M |
| FR-SIM-06 | The system SHALL support a second backend (Cirq) via OpenQASM import and report agreement (max total variation distance < 0.02 for sampled results, exact-match within 1e‑6 for probabilities). | S |
| FR-SIM-07 | Backends SHALL implement a common adapter interface (`run(circuit, shots) -> Result`). | M |
| FR-SIM-08 | The system MAY support PennyLane as a third adapter. | S |
| FR-SIM-09 | Simulation failure SHALL return a structured error and never crash the session. | M |

### 3.4 Visualisation
| ID | Requirement | Pri |
|---|---|---|
| FR-VIS-01 | Probability bar chart for all basis states, labelled in Qiskit bit order (q4…q0) with toggle to canvas order. | M |
| FR-VIS-02 | Amplitude table showing complex amplitude and phase (degrees) for non-zero states. | M |
| FR-VIS-03 | One Bloch sphere per qubit, animated between states (≤400 ms). | M |
| FR-VIS-04 | Entangled qubits SHALL show a shortened Bloch vector and an "entangled" badge. | M |
| FR-VIS-05 | Measurement histogram with shot counts. | M |
| FR-VIS-06 | State change diff: highlight basis states whose probability changed since the previous step. | M |
| FR-VIS-07 | Circuit diagram SHALL render the canonical circuit (canvas is the diagram). | M |
| FR-VIS-08 | Export PNG of circuit and charts. | F |

### 3.5 AI Tutor
| ID | Requirement | Pri |
|---|---|---|
| FR-AI-01 | After each committed edit, the system SHALL generate a 2–4 sentence explanation of the gate and resulting state. | M |
| FR-AI-02 | The explanation SHALL be generated only from the **facts packet** (§6.3); the prompt SHALL forbid stating numbers not in the packet. | M |
| FR-AI-03 | A **numeric validator** SHALL check every number in the tutor output against the facts packet (tolerance 0.01); on failure, the system SHALL fall back to the template explanation. | M |
| FR-AI-04 | The user SHALL be able to ask free-text questions; the answer is grounded in the current facts packet + last 5 actions + current lesson step. | M |
| FR-AI-05 | Explanations SHALL be cached by key = hash(previous circuit, action, level, lesson step). | M |
| FR-AI-06 | If the LLM call fails or exceeds 6 s, the system SHALL show a deterministic template explanation within 100 ms. | M |
| FR-AI-07 | Tutor responses SHALL stream to the UI. | M |
| FR-AI-08 | The tutor SHALL support levels: Beginner, Intermediate (changes vocabulary, adds math). | S |
| FR-AI-09 | The tutor SHALL decline off-topic/unsafe requests and redirect to the current circuit. | M |
| FR-AI-10 | The UI SHALL show a "What the tutor saw" expander listing the facts used (transparency). | S |
| FR-AI-11 | **Debug:** for code errors, the tutor SHALL explain the error and suggest a fix. | S |
| FR-AI-12 | **Optimise:** the system SHALL detect redundancy (adjacent self-inverse pairs, e.g., H·H, X·X, CNOT·CNOT) and suggest removal; tutor narrates. | S |
| FR-AI-13 | **Code generation:** NL description → Qiskit code, validated by the parser before loading. | S |
| FR-AI-14 | **Personalised path:** next-lesson recommendation from mastery scores (rule-based). | S |
| FR-AI-15 | Hints for challenges SHALL be tiered (3 levels) and never reveal the full solution before level 3. | M |

### 3.6 Lessons
| ID | Requirement | Pri |
|---|---|---|
| FR-LS-01 | The system SHALL provide 3 guided lessons: L1 Superposition, L2 Entanglement (Bell state), L3 Interference. | M |
| FR-LS-02 | A lesson consists of ordered steps; each step has instruction text, an expected action/state check, and a tutor context. | M |
| FR-LS-03 | Step completion SHALL be auto-detected from circuit state (e.g., P(0)=P(1)=0.5 on q0). | M |
| FR-LS-04 | Lessons SHALL be data-driven (JSON/DB), not hard-coded, so educators/devs can add lessons without code changes. | M |
| FR-LS-05 | Locked/unlocked progression (complete L1 to unlock L2). | S |

### 3.7 Challenges and Assessment
| ID | Requirement | Pri |
|---|---|---|
| FR-CH-01 | The system SHALL provide 3 challenges: prepare \|1⟩; prepare \|+⟩; prepare Bell state \|Φ⁺⟩. | M |
| FR-CH-02 | A challenge SHALL be auto-checked by fidelity ≥ 0.99 with the target state (global phase ignored). | M |
| FR-CH-03 | The system SHALL record attempts, hints used, time taken, and result. | M |
| FR-CH-04 | The system SHOULD award a simple score (e.g., 100 − 10×hints − 5×extra gates, min 10). | S |

### 3.8 Users, Progress and Instructor Dashboard
| ID | Requirement | Pri |
|---|---|---|
| FR-US-01 | The system SHALL support lightweight sign-in (name + role + generated token) for the prototype. | M |
| FR-US-02 | The system SHALL persist per-user lesson step completion, challenge attempts and mastery. | M |
| FR-US-03 | The student SHALL see a progress view (lessons %, challenges solved, next recommended). | S |
| FR-IN-01 | An instructor SHALL see a class table: student, lessons completed, challenges solved, last active. | M |
| FR-IN-02 | The instructor view SHALL show top mistakes (e.g., most frequent failed-check reasons, hint-heavy challenges). | S |
| FR-IN-03 | The instructor SHOULD be able to export class progress as CSV. | S |
| FR-IN-04 | Demo (projector) mode: larger fonts, hides chrome. | F |

## 4. Detailed Behaviour and Conventions

### 4.1 Supported gates
| Gate | Qubits | Matrix / meaning |
|---|---|---|
| H | 1 | Hadamard; creates superposition |
| X | 1 | Bit flip |
| Z | 1 | Phase flip (−1 on \|1⟩) |
| S | 1 | Phase π/2 on \|1⟩ |
| T | 1 | Phase π/4 on \|1⟩ |
| CNOT | 2 | Flip target if control=1 |
| CZ | 2 | Phase −1 if both 1 |
| Measure | 1 | Terminal computational-basis measurement |

### 4.2 Circuit JSON (canonical IR)
```json
{
  "version": 1,
  "num_qubits": 2,
  "gates": [
    { "id": "g1", "type": "H",    "targets": [0], "controls": [],  "column": 0 },
    { "id": "g2", "type": "CNOT", "targets": [1], "controls": [0], "column": 1 },
    { "id": "g3", "type": "MEASURE", "targets": [0], "controls": [], "column": 2 },
    { "id": "g4", "type": "MEASURE", "targets": [1], "controls": [], "column": 2 }
  ]
}
```
Validation rules: `targets`/`controls` within `[0, num_qubits)`; no overlap within a column; `controls ∩ targets = ∅`; nothing after MEASURE on a qubit; `type ∈ {H,X,Z,S,T,CNOT,CZ,MEASURE}`. (CZ uses `controls:[a]`, `targets:[b]` by convention.)

### 4.3 Bit-ordering convention
Qiskit is little-endian: qubit 0 is the **rightmost** bit of a bitstring. The UI SHALL (a) draw q0 at the top of the canvas, (b) label basis states in Qiskit order (e.g., `q1q0 = 10`) by default, (c) show a legend explaining this, and (d) provide a toggle. Tests SHALL cover a non-symmetric case (e.g., X on q1 only → `10`).

### 4.4 Facts packet (inputs to tutor)
```json
{
  "action": {"type": "add_gate", "gate": "CNOT", "controls": [0], "targets": [1]},
  "lesson_step": "L2.S3",
  "num_qubits": 2,
  "probabilities": {"00": 0.5, "11": 0.5},
  "prev_probabilities": {"00": 0.5, "10": 0.5},
  "amplitudes": {"00": {"re": 0.7071, "im": 0}, "11": {"re": 0.7071, "im": 0}},
  "bloch": [{"q": 0, "x": 0, "y": 0, "z": 0, "purity": 0.5}, {"q": 1, "x": 0, "y": 0, "z": 0, "purity": 0.5}],
  "entangled_qubits": [0, 1],
  "changed_states": ["10 → 11"],
  "level": "beginner"
}
```

### 4.5 Challenge check
`fidelity = |⟨target|ψ⟩|²`; pass if ≥ 0.99. Statevector compared up to global phase. Targets: `|1⟩`, `|+⟩ = (|0⟩+|1⟩)/√2`, `|Φ⁺⟩ = (|00⟩+|11⟩)/√2`.

### 4.6 Tutor safety rules
1. Use only numbers present in the facts packet.
2. Never claim the simulation ran on real quantum hardware.
3. If the question is unrelated to quantum computing or the current circuit, redirect politely.
4. If unsure, say so and point to the state panel.
5. Keep beginner explanations ≤ 4 sentences; avoid unexplained jargon.

## 5. External Interface Requirements

### 5.1 User interface
See `04_UIUX_Design.md` for layouts, components and accessibility.

### 5.2 REST / streaming API (summary)
| Method & Path | Purpose | Notes |
|---|---|---|
| `POST /api/simulate` | Run simulation on Circuit JSON | body: `{circuit, shots, backend}` → probabilities, amplitudes, bloch, counts |
| `POST /api/circuit/from-code` | Parse code → Circuit JSON | returns errors with line numbers |
| `POST /api/circuit/to-code` | Circuit JSON → Qiskit code / QASM | |
| `POST /api/tutor/explain` (SSE) | Stream explanation for an action | uses facts packet + cache |
| `POST /api/tutor/ask` (SSE) | Free-text Q&A | grounded |
| `POST /api/tutor/debug` (SSE) | Explain a code error | S |
| `POST /api/optimize` | Redundancy detection | S |
| `GET /api/lessons`, `GET /api/lessons/{id}` | Lesson catalogue/steps | |
| `POST /api/lessons/{id}/steps/{sid}/check` | Check step | |
| `GET /api/challenges`, `POST /api/challenges/{id}/check`, `POST /api/challenges/{id}/hint` | Challenge flow | |
| `POST /api/auth/login` | Name + role → token | prototype-grade |
| `GET /api/progress/me` | Student progress | |
| `GET /api/instructor/overview` | Class table + mistakes | role=instructor |

Error format: `{ "error": {"code": "INVALID_CIRCUIT", "message": "...", "details": {...}} }`.

### 5.3 Software interfaces
Qiskit + Qiskit Aer (primary), Cirq (QASM import), PennyLane (optional), LLM provider REST API (behind an adapter), SQLite.

## 6. Non-Functional Requirements

### 6.1 Performance
| ID | Requirement |
|---|---|
| NFR-PERF-01 | `/simulate` p95 < 300 ms for ≤5 qubits, ≤30 columns, 1024 shots (local). |
| NFR-PERF-02 | UI state panel refresh < 100 ms after response. |
| NFR-PERF-03 | First tutor token < 2 s p95 (LLM); template fallback < 100 ms. |
| NFR-PERF-04 | Bloch animation ≥ 30 fps on a mid-range laptop. |

### 6.2 Reliability and availability
| ID | Requirement |
|---|---|
| NFR-REL-01 | LLM outage SHALL NOT block simulation or visualisation (graceful degradation). |
| NFR-REL-02 | Invalid input SHALL produce structured errors, never a 500 with stack trace. |
| NFR-REL-03 | Progress writes SHALL be durable (SQLite WAL mode). |

### 6.3 Security
| ID | Requirement |
|---|---|
| NFR-SEC-01 | User code SHALL be parsed via AST with an allow-list (qiskit imports, `QuantumCircuit`, gate methods, basic literals/loops). |
| NFR-SEC-02 | Execution (if needed) SHALL occur in a separate process with CPU time ≤ 2 s, memory ≤ 256 MB, no network, no filesystem writes. |
| NFR-SEC-03 | LLM API keys SHALL be server-side only (env vars), never sent to the client. |
| NFR-SEC-04 | Prompt-injection hygiene: user text is delimited and treated as data; tutor output is rendered as escaped text/markdown (no raw HTML). |
| NFR-SEC-05 | Role checks on instructor endpoints. |
| NFR-SEC-06 | Rate limit tutor endpoints (e.g., 30 req/min/user). |

### 6.4 Privacy
Store only name/role/progress; no sensitive personal data. Tutor logs store facts + output, not credentials. Follow responsible-AI guidance (UNESCO 2023): human-centred, transparent, educator can review.

### 6.5 Usability and accessibility
WCAG 2.1 AA colour contrast; full keyboard operation for placing gates; ARIA labels on gates and charts; state is never conveyed by colour alone; reduced-motion setting disables Bloch animation.

### 6.6 Maintainability and portability
Typed API (Pydantic models, TypeScript types generated from OpenAPI); lessons as data; backend adapters behind one interface; `docker compose up` runs the whole stack; ≥70 % unit-test coverage on the facts engine and IR validators.

### 6.7 Scalability (path, not prototype)
Stateless API behind a load balancer; swap SQLite → PostgreSQL; cache in Redis; queue for heavy jobs; simulation cost grows 2ⁿ, so cap qubits or move to tensor-network/GPU backends for larger n.

## 7. Data Requirements

| Entity | Key fields |
|---|---|
| User | id, name, role, created_at |
| Lesson | id, title, order, description |
| LessonStep | id, lesson_id, order, instruction, check_spec (JSON), tutor_context |
| Challenge | id, title, target_spec (JSON), max_hints, hints (JSON) |
| Attempt | id, user_id, challenge_id, circuit_json, fidelity, passed, hints_used, gates_used, duration_s, created_at |
| StepProgress | user_id, step_id, completed_at |
| Mastery | user_id, concept, score (0–1), updated_at |
| TutorCache | key (hash), explanation, level, created_at |
| Event | id, user_id, type, payload (JSON), created_at (for analytics/instructor mistakes) |

## 8. Acceptance Criteria (demo-level)

| ID | Scenario | Expected |
|---|---|---|
| AC-01 | Drop H on q0 | P(0)=P(1)=0.5; Bloch vector on +x; tutor explains superposition; < 300 ms visuals |
| AC-02 | H(q0) then CNOT(q0→q1) | Probabilities {00: 0.5, 11: 0.5}; both qubits marked entangled; Bloch vectors length ≈ 0 |
| AC-03 | X on q1 only | Basis `10` in Qiskit order has P=1 (bit-order test) |
| AC-04 | Type `qc.h(0); qc.cx(0,1)` | Canvas shows H then CNOT; same results as AC-02 |
| AC-05 | Type invalid code | Error with line number + tutor explanation; UI stays responsive |
| AC-06 | Disable network (LLM unreachable) | Template explanation appears <100 ms; simulation unaffected |
| AC-07 | Submit Bell-state challenge with H+CNOT | Passed, fidelity ≥ 0.99, attempt saved |
| AC-08 | Run same Bell circuit on Aer and Cirq | Probabilities agree within 1e‑6 (exact) and "backends agree" badge |
| AC-09 | Instructor opens dashboard after 2 students finish L1 | Table shows both with correct counts |
| AC-10 | Tutor asked "What is the capital of France?" | Polite redirect to circuit context |

## 9. Traceability Matrix (PS objective → requirements)

| PS objective | Requirements |
|---|---|
| Interactive web platform | FR-CB, FR-VIS, NFR-PERF |
| Drag-and-drop + code | FR-CB-01..08, FR-CM-01..07 |
| Multiple backends | FR-SIM-06..08 |
| AI tutoring (explain, codegen, debug, personalise) | FR-AI-01..15 |
| Visualise states, Bloch, results | FR-VIS-01..07 |
| Assessments, progress, instructor dashboard | FR-LS, FR-CH, FR-US, FR-IN |

## 10. Test Strategy (summary)
- **Unit:** IR validator, Circuit JSON ⇄ Qiskit converter, bit-order, facts engine (Bell, GHZ, |+⟩ golden values), numeric validator, redundancy detector.
- **Integration:** `/simulate` across Aer/Cirq; lesson step checks; challenge fidelity; sandbox escape attempts (`import os`, `open()`, infinite loop).
- **AI evaluation:** scripted set of 30 actions; assert zero ungrounded numbers; assert fallback on forced LLM failure.
- **E2E (Playwright):** Flow A (Bell state) and Flow B (code ⇄ canvas).
- **Manual:** accessibility pass (keyboard, contrast), 5 dry runs of demo script.
