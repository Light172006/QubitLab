# Product Requirements Document (PRD)

**Product:** Quantum Circuit Sandbox with a Live AI Tutor (QCS)
**Problem Statement:** SIH26140 — AI-Based Interactive Quantum Algorithm Learning Platform
**Theme / Category:** Education & Skilling / Software
**Team:** LUNATICSS (Team ID 154009)
**Version:** 1.0 (prototype scope) | **Status:** Draft for build

---

## 1. Summary

QCS is a browser-based quantum learning platform where every edit to a quantum circuit instantly produces (a) a visible change in the quantum state and (b) a short, grounded AI explanation of *why* it changed. Learners can build circuits by drag-and-drop or by writing Qiskit code, with both views kept in sync. Progress is tracked and surfaced to instructors.

**One-line pitch:** *Build it. See it. Ask why.*

## 2. Problem

| Pain | Evidence from the problem statement |
|---|---|
| Quantum concepts (qubits, superposition, entanglement) are abstract | "abstract nature of core concepts" |
| Existing resources are static and theory-heavy | "static, heavily theoretical, lack hands-on interaction" |
| Real hardware is hard to access | "limited access to real quantum hardware" |
| No single tool combines theory, circuit design, simulation and guidance | "need for an integrated, interactive, intelligent platform" |

**Core insight:** Learners get confused at the moment of an action ("why did that gate do that?"), not at the end of a lesson. Teaching must happen at that moment.

## 3. Goals and Non-Goals

### Goals
- G1. Let a beginner build and understand a Bell state within 10 minutes, unaided.
- G2. Make every gate action produce instant visual feedback (<300 ms) and a contextual explanation (first token <2 s).
- G3. Support both graphical and code-based circuit design, kept in sync for the supported gate set.
- G4. Support multiple simulation backends (Qiskit Aer core; Cirq cross-check; PennyLane stretch).
- G5. Provide assessment (challenges), progress tracking and a basic instructor view.

### Non-Goals (prototype)
- Running on real quantum hardware.
- More than 5 qubits, noise models, or parameterised/variational circuits.
- Full algorithm library (Grover, Shor, QFT) — architecture allows it, content does not ship in the prototype.
- Multi-tenant institutional administration, SSO, payments.
- Real-time multi-user collaborative editing (listed as future work).

## 4. Personas

| Persona | Description | Needs | Success looks like |
|---|---|---|---|
| **Aarav — UG student** | 2nd-year engineering student, knows linear algebra basics, no quantum background | Intuition, instant feedback, not being overwhelmed | Completes 3 lessons, solves challenges |
| **Dr. Meera — Educator** | Teaches an intro quantum module to ~60 students | Live demos, see who is stuck, reusable lessons | Demonstrates entanglement live; sees class progress |
| **Kabir — QC learner / professional** | Knows Python, wants to practise Qiskit and compare frameworks | Code mode, backend comparison, optimisation hints | Writes code, sees canvas update, cross-checks results |

## 5. User Stories (prioritised: M = Must, S = Should, C = Could)

| ID | As a… | I want to… | So that… | Pri |
|---|---|---|---|---|
| US-01 | Student | drag gates onto qubit wires | I can build circuits without code | M |
| US-02 | Student | see probabilities update after each edit | I connect gates to outcomes | M |
| US-03 | Student | see Bloch spheres per qubit | I build geometric intuition | M |
| US-04 | Student | get an AI explanation for each action | I understand *why* the state changed | M |
| US-05 | Student | ask the tutor a free-text question about my current circuit | I resolve confusion immediately | M |
| US-06 | Student | follow guided lessons | I learn in a sensible order | M |
| US-07 | Student | solve target-state challenges with hints | I test my understanding | M |
| US-08 | Student | undo/redo/reset | I can experiment safely | M |
| US-09 | Learner | write Qiskit code and see the canvas update | I connect code and diagrams | M |
| US-10 | Learner | get error explanations for broken code | I debug faster | S |
| US-11 | Learner | see optimisation suggestions (e.g., cancel H·H) | I learn efficient circuits | S |
| US-12 | Learner | describe a circuit in English and get code | I explore faster | C |
| US-13 | Learner | run the same circuit on Aer and Cirq and compare | I trust results and see framework differences | S |
| US-14 | Student | see my progress and next recommended lesson | I stay on a path | S |
| US-15 | Educator | see class completion and common mistakes | I adapt teaching | S |
| US-16 | Educator | project a clean "demo mode" view | I teach live in class | C |

## 6. Functional Scope

### 6.1 MVP (prototype, 2 days)
1. **Circuit canvas** — 5 qubit wires, 8 ops: `H, X, Z, S, T, CNOT, CZ, Measure`.
2. **Live state panel** — probability bars, amplitudes (with phase), per-qubit Bloch spheres, entanglement indicator.
3. **Code mode** — Monaco editor with Qiskit subset, two-way sync for the supported subset, error capture.
4. **Live AI tutor** — auto-explanation per action, free-text Q&A, grounded in a computed *facts packet*, with offline template fallback.
5. **Guided lessons (3)** — Superposition, Entanglement (Bell), Interference.
6. **Challenges (3)** — Prepare |1⟩, Prepare |+⟩, Prepare Bell state |Φ+⟩; auto-checked by fidelity.
7. **Backends** — Qiskit Aer (primary) + Cirq cross-check via OpenQASM.
8. **Progress + instructor view** — SQLite-backed; per-user progress; class overview table.

### 6.2 Stretch (if time permits, in order)
1. Optimisation suggestions (transpile diff) narrated by the tutor.
2. PennyLane adapter.
3. NL → code generation with validation.
4. Shareable circuit links / export (QASM, PNG).
5. Demo (projector) mode.

### 6.3 Future (post-hackathon)
Grover/QFT/Deutsch–Jozsa lessons, noise simulation, more qubits (statevector limit), real hardware via qBraid/IBM, collaborative editing, LMS integration, multilingual tutor (Hindi, Bengali, etc.), adaptive learning-path model.

## 7. Key User Flows

**Flow A — First circuit (student)**
1. Land on Lesson 1 → tutor greets with the goal ("Put qubit 0 into superposition").
2. Drag **H** onto q0 → probabilities change 100/0 → 50/50; Bloch vector moves to the equator.
3. Tutor explains in 2–3 sentences referencing the actual numbers.
4. Student clicks **Measure** → histogram shows ~50/50 over 1024 shots.
5. Lesson step checks off → next step unlocks.

**Flow B — Code ⇄ canvas (learner)**
1. Switch to Code tab, type `qc.h(0); qc.cx(0,1)`.
2. Canvas updates; state panel shows Bell state; tutor explains entanglement; Bloch vectors shrink (mixed reduced state).

**Flow C — Educator**
1. Open dashboard → see lesson completion %, per-student status, top mistakes (e.g., "CNOT control/target swapped: 14 students").

## 8. Success Metrics

**Prototype (demo day)**
| Metric | Target |
|---|---|
| Gate action → updated probabilities | < 300 ms p95 |
| Gate action → first tutor token | < 2 s (cached/fallback < 100 ms) |
| Tutor answers containing numbers not in facts packet | 0 in scripted test set |
| Lesson 1–3 completable end-to-end without crash | 100 % of 5 dry runs |
| Time for a new user to build a Bell state | < 10 min |

**Product (post-launch, illustrative)** lesson completion rate, challenge first-attempt success, hint usage per challenge, weekly active learners, educator retention.

## 9. Mapping to Problem Statement Objectives

| PS Objective | PRD coverage | Status |
|---|---|---|
| Interactive web platform for quantum learning | Whole product | MVP |
| Drag-and-drop **and** code-based design | Canvas + Code tab, synced | MVP |
| Multiple backends (Aer, PennyLane, Cirq, qBraid) | Aer + Cirq; PennyLane stretch; qBraid future | MVP/Stretch |
| AI tutoring: explain, codegen, debug, personalise | Explain + Q&A (MVP); debug, optimise (S); codegen (C); rule-based next lesson (S) | Partial → Full |
| Visualise states, Bloch spheres, probabilities, results | State panel + histogram | MVP |
| Assessments, challenges, progress, instructor dashboards | 3 challenges, progress, class table | MVP |

## 10. Assumptions and Dependencies
- A1. LLM provider API is reachable during the demo; otherwise the template fallback is used.
- A2. ≤5 qubits keeps statevector simulation trivially fast on a laptop.
- A3. Users have a modern desktop browser (Chrome/Edge/Firefox); mobile is read-only for the prototype.
- A4. Qiskit, qiskit-aer, cirq pinned to tested versions in `requirements.txt`.

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tutor hallucination | Wrong teaching | Facts-packet grounding, numeric validator, refusal rules |
| Canvas ⇄ code sync complexity | Schedule | Sync only the 8-op subset; else code-only with warning |
| LLM latency/cost/outage | Demo failure | Cache, debounce, streaming, deterministic template fallback |
| Qiskit bit-ordering confusion | Incorrect labels | Explicit convention in UI + tests (see SRS §4.3) |
| Scope creep | Unfinished prototype | Frozen MVP list; stretch only after Day-2 midday |
| Code execution security | Unsafe | AST allow-list + subprocess + timeout; no network/fs |

## 12. Release Plan (2-day prototype)

| Block | Outcome |
|---|---|
| Day 1 AM | Repo, schema, canvas skeleton, `/simulate` returning probabilities |
| Day 1 PM | Bloch + amplitudes, facts engine, tutor explain (with fallback) — **live loop works end to end** |
| Day 2 AM | Code mode + sync, lessons, challenges, progress DB |
| Day 2 PM | Instructor table, Cirq adapter, polish, demo script, deck |
| Freeze | ~4 h before demo: bug-fix only |

## 13. Open Questions
1. Which LLM provider and budget for the demo? (Affects caching aggressiveness.)
2. Show bitstrings in Qiskit order (q4…q0) by default, or canvas order? (Proposed: Qiskit order with a toggle.)
3. Will judges run it locally or on a hosted URL? (Affects deployment choice.)
