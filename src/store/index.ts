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
  completedSteps: Set<string>;
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
    { name: 'qubitlab-circuit' }
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
      completedSteps: new Set<string>(),
      setCurrentLesson: (lesson) => set({ currentLesson: lesson, currentStepIndex: 0, completedSteps: new Set() }),
      setCurrentStep: (index) => set({ currentStepIndex: index }),
      markStepComplete: (stepId) => set((state) => {
        const newCompletedSteps = new Set([...state.completedSteps, stepId]);
        // Auto-advance to next step if available
        const nextStepIndex = state.currentLesson?.steps.length 
          ? Math.min(state.currentStepIndex + 1, state.currentLesson.steps.length - 1)
          : state.currentStepIndex;
        return { completedSteps: newCompletedSteps, currentStepIndex: nextStepIndex };
      }),
      resetLesson: () => set({ currentLesson: null, currentStepIndex: 0, completedSteps: new Set() }),
    }),
    { name: 'qubitlab-lesson' }
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