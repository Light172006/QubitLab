/// <reference types="vite/client" />
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Circuit, Gate, User, Lesson, Challenge, FactsPacket, TutorMessage } from '../types';

interface CircuitState {
  circuit: Circuit;
  history: Circuit[];
  historyIndex: number;
  setCircuit: (circuit: Circuit, pushHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  addGate: (gate: Omit<Gate, 'id' | 'column'>, column: number) => void;
  removeGate: (gateId: string) => void;
  moveGate: (gateId: string, newColumn: number) => void;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

interface UIState {
  level: 'beginner' | 'intermediate';
  backend: 'aer' | 'cirq' | 'compare';
  shots: number;
  bitOrder: 'qiskit' | 'canvas';
  setLevel: (level: 'beginner' | 'intermediate') => void;
  setBackend: (backend: 'aer' | 'cirq' | 'compare') => void;
  setShots: (shots: number) => void;
  setBitOrder: (order: 'qiskit' | 'canvas') => void;
  leftRailOpen: boolean;
  rightRailOpen: boolean;
  /** Whether the tutor drawer is open. Persisted across reloads. */
  tutorDrawerOpen: boolean;
  setLeftRailOpen: (open: boolean) => void;
  setRightRailOpen: (open: boolean) => void;
  setTutorDrawerOpen: (open: boolean) => void;
  toggleTutorDrawer: () => void;
}

interface LessonState {
  currentLesson: Lesson | null;
  currentStepIndex: number;
  /**
   * Ids of the steps the student has actually completed.
   *
   * A plain array, not a Set: zustand's persist serialises with JSON, and
   * `JSON.stringify(new Set(['a']))` is `{}`. Rehydrating that left
   * `completedSteps.has is not a function` and crashed the workspace on the
   * second visit. (See src/tests/persistedState.test.ts.)
   */
  completedSteps: string[];
  setCurrentLesson: (lesson: Lesson | null) => void;
  setCurrentStep: (index: number) => void;
  markStepComplete: (stepId: string) => void;
  resetLesson: () => void;
}

interface ChallengeState {
  currentChallenge: Challenge | null;
  attempts: number;
  hintsUsed: number[];
  setCurrentChallenge: (challenge: Challenge | null) => void;
  incrementAttempts: () => void;
  useHint: (level: number) => void;
  resetChallenge: () => void;
}

interface TutorState {
  isStreaming: boolean;
  currentExplanation: string;
  isFallback: boolean;
  factsPacket: FactsPacket | null;
  /** Newest-last scrollback shown in the tutor drawer. */
  messages: TutorMessage[];
  /** A finished explanation arrived while the drawer was closed. */
  hasUnread: boolean;
  setStreaming: (streaming: boolean) => void;
  appendExplanation: (text: string) => void;
  setFallback: (fallback: boolean) => void;
  setFactsPacket: (packet: FactsPacket | null) => void;
  clearExplanation: () => void;
  /** Files the streamed explanation into the scrollback. */
  commitExplanation: () => void;
  /** Records a student question, so the answer can be shown underneath it. */
  pushQuestion: (text: string) => void;
  markTutorRead: () => void;
  clearMessages: () => void;
}

interface CodeState {
  code: string;
  syncStatus: 'synced' | 'code-only' | 'error';
  errors: Array<{ line: number; code: string; message: string }>;
  setCode: (code: string) => void;
  setSyncStatus: (status: 'synced' | 'code-only' | 'error') => void;
  setErrors: (errors: Array<{ line: number; code: string; message: string }>) => void;
}

const initialCircuit: Circuit = { version: 1, num_qubits: 2, gates: [] };

/**
 * A persisted circuit is untrusted input: localStorage can hold a truncated
 * write or a hand-edited value, and `circuit.gates` is dereferenced on the
 * first render. Only accept a shape the simulator can actually consume.
 */
function isCircuit(value: unknown): value is Circuit {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Circuit>;
  return typeof candidate.num_qubits === 'number' && Array.isArray(candidate.gates);
}

export const useCircuitStore = create<CircuitState>()(
  persist(
    (set, get) => ({
      circuit: initialCircuit,
      history: [initialCircuit],
      historyIndex: 0,
      setCircuit: (circuit, pushHistory = true) => {
        const { history, historyIndex } = get();
        if (pushHistory) {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(circuit);
          if (newHistory.length > 50) newHistory.shift();
          set({ circuit, history: newHistory, historyIndex: newHistory.length - 1 });
        } else {
          set({ circuit });
        }
      },
      undo: () => {
        const { historyIndex, history } = get();
        if (historyIndex > 0) {
          set({ circuit: history[historyIndex - 1], historyIndex: historyIndex - 1 });
        }
      },
      redo: () => {
        const { historyIndex, history } = get();
        if (historyIndex < history.length - 1) {
          set({ circuit: history[historyIndex + 1], historyIndex: historyIndex + 1 });
        }
      },
      reset: () => set({ circuit: initialCircuit, history: [initialCircuit], historyIndex: 0 }),
      addGate: (gate, column) => {
        const { circuit } = get();
        const newGate: Gate = { ...gate, id: `g${Date.now()}`, column };
        const newCircuit = { ...circuit, gates: [...circuit.gates, newGate].sort((a, b) => a.column - b.column) };
        get().setCircuit(newCircuit);
      },
      removeGate: (gateId) => {
        const { circuit } = get();
        const newCircuit = { ...circuit, gates: circuit.gates.filter(g => g.id !== gateId) };
        get().setCircuit(newCircuit);
      },
      moveGate: (gateId, newColumn) => {
        const { circuit } = get();
        const newCircuit = {
          ...circuit,
          gates: circuit.gates.map(g => g.id === gateId ? { ...g, column: newColumn } : g).sort((a, b) => a.column - b.column)
        };
        get().setCircuit(newCircuit);
      },
    }),
    {
      name: 'qubitlab-circuit',
      /** Drop anything that is not a usable circuit instead of crashing on it. */
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<CircuitState>;
        const circuit = isCircuit(stored.circuit) ? stored.circuit : current.circuit;
        const history = Array.isArray(stored.history) && stored.history.every(isCircuit) && stored.history.length > 0
          ? stored.history
          : [circuit];
        const storedIndex = stored.historyIndex;
        const historyIndex =
          typeof storedIndex === 'number' && Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < history.length
            ? storedIndex
            : history.length - 1;
        return { ...current, ...stored, circuit, history, historyIndex };
      },
    }
  )
);

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'qubitlab-auth' }
  )
);

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      level: 'beginner',
      backend: 'aer',
      shots: 1024,
      bitOrder: 'qiskit',
      leftRailOpen: true,
      rightRailOpen: true,
      // The tutor dock is a permanent part of the workspace: it starts open.
      tutorDrawerOpen: true,
      setLevel: (level) => set({ level }),
      setBackend: (backend) => set({ backend }),
      setShots: (shots) => set({ shots }),
      setBitOrder: (bitOrder) => set({ bitOrder }),
      setLeftRailOpen: (leftRailOpen) => set({ leftRailOpen }),
      setRightRailOpen: (rightRailOpen) => set({ rightRailOpen }),
      setTutorDrawerOpen: (tutorDrawerOpen) => set({ tutorDrawerOpen }),
      toggleTutorDrawer: () => set({ tutorDrawerOpen: !get().tutorDrawerOpen }),
    }),
    {
      name: 'qubitlab-ui',
      version: 2,
      // v1 stored the tutor strip state as `tutorExpanded`; carry it over.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        const legacyOpen = state.tutorExpanded === true;
        delete state.tutorExpanded;
        return { ...state, tutorDrawerOpen: legacyOpen } as UIState;
      },
    }
  )
);

export const useLessonStore = create<LessonState>()(
  persist(
    (set, get) => ({
      currentLesson: null,
      currentStepIndex: 0,
      completedSteps: [],
      setCurrentLesson: (lesson) => set({ currentLesson: lesson, currentStepIndex: 0, completedSteps: [] }),
      setCurrentStep: (index) => set({ currentStepIndex: index }),
      markStepComplete: (stepId) => set((state) => {
        // Idempotent: a step that is already counted must not be counted twice.
        const completedSteps = state.completedSteps.includes(stepId)
          ? state.completedSteps
          : [...state.completedSteps, stepId];
        // Auto-advance to next step if available
        const nextStepIndex = state.currentLesson?.steps.length
          ? Math.min(state.currentStepIndex + 1, state.currentLesson.steps.length - 1)
          : state.currentStepIndex;
        return { completedSteps, currentStepIndex: nextStepIndex };
      }),
      resetLesson: () => set({ currentLesson: null, currentStepIndex: 0, completedSteps: [] }),
    }),
    {
      name: 'qubitlab-lesson',
      /**
       * Anything already in localStorage is untrusted: a v1 payload stores
       * `completedSteps` as `{}` (the mangled Set) and a hand-edited value can
       * be any shape at all. Coerce to a string array instead of trusting it,
       * so a corrupt value can never reach `.includes`.
       */
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<LessonState>;
        const ids = stored.completedSteps;
        return {
          ...current,
          ...stored,
          completedSteps: Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [],
        };
      },
    }
  )
);

export const useChallengeStore = create<ChallengeState>()(
  persist(
    (set) => ({
      currentChallenge: null,
      attempts: 0,
      hintsUsed: [],
      setCurrentChallenge: (challenge) => set({ currentChallenge: challenge, attempts: 0, hintsUsed: [] }),
      incrementAttempts: () => set((state) => ({ attempts: state.attempts + 1 })),
      useHint: (level) => set((state) => ({ hintsUsed: [...state.hintsUsed, level] })),
      resetChallenge: () => set({ currentChallenge: null, attempts: 0, hintsUsed: [] }),
    }),
    { name: 'qubitlab-challenge' }
  )
);

const MAX_TUTOR_MESSAGES = 50;

const appendMessage = (messages: TutorMessage[], message: TutorMessage): TutorMessage[] => {
  const next = [...messages, message];
  return next.length > MAX_TUTOR_MESSAGES ? next.slice(next.length - MAX_TUTOR_MESSAGES) : next;
};

export const useTutorStore = create<TutorState>((set, get) => ({
  isStreaming: false,
  currentExplanation: '',
  isFallback: false,
  factsPacket: null,
  messages: [],
  hasUnread: false,
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendExplanation: (text) => set((state) => ({ currentExplanation: state.currentExplanation + text })),
  setFallback: (isFallback) => set({ isFallback }),
  setFactsPacket: (factsPacket) => set({ factsPacket }),
  clearExplanation: () => set({ currentExplanation: '', isFallback: false }),
  commitExplanation: () => set((state) => {
    const text = state.currentExplanation.trim();
    if (!text) return state;
    return {
      messages: appendMessage(state.messages, {
        id: `m${Date.now()}${state.messages.length}`,
        role: 'explanation',
        text,
        facts: state.factsPacket,
        isFallback: state.isFallback,
        timestamp: Date.now(),
      }),
      currentExplanation: '',
      hasUnread: true,
    };
  }),
  pushQuestion: (text) => set((state) => ({
    messages: appendMessage(state.messages, {
      id: `q${Date.now()}${state.messages.length}`,
      role: 'question',
      text,
      facts: state.factsPacket,
      isFallback: false,
      timestamp: Date.now(),
    }),
  })),
  markTutorRead: () => (get().hasUnread ? set({ hasUnread: false }) : undefined),
  clearMessages: () => set({ messages: [], currentExplanation: '' }),
}));

export const useCodeStore = create<CodeState>((set) => ({
  code: '',
  syncStatus: 'synced',
  errors: [],
  setCode: (code) => set({ code }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setErrors: (errors) => set({ errors }),
}));