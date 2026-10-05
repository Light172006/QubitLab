export type GateType = 'H' | 'X' | 'Z' | 'S' | 'T' | 'CNOT' | 'CZ' | 'MEASURE';

export interface Gate {
  id: string;
  type: GateType;
  targets: number[];
  controls: number[];
  column: number;
}

export interface Circuit {
  version: number;
  num_qubits: number;
  gates: Gate[];
}

export interface BlochVector {
  q: number;
  x: number;
  y: number;
  z: number;
  purity: number;
}

export interface Amplitude {
  re: number;
  im: number;
}

export interface SimulateResponse {
  probabilities: Record<string, number>;
  amplitudes: Record<string, Amplitude>;
  bloch: BlochVector[];
  entangled_qubits: number[];
  counts: Record<string, number> | null;
  diff: {
    changed: string[];
  };
  backend_agreement: {
    with: string;
    tvd: number;
    agree: boolean;
  };
  facts: FactsPacket;
}

/** The committed edit a facts packet describes. SRS 4.4 `action`. */
export interface CircuitAction {
  type: 'add_gate' | 'remove_gate' | 'move_gate' | 'reset' | 'code_edit';
  gate?: GateType;
  controls?: number[];
  targets?: number[];
}

export interface FactsPacket {
  action: CircuitAction;
  lesson_step?: string;
  num_qubits: number;
  probabilities: Record<string, number>;
  prev_probabilities: Record<string, number>;
  amplitudes: Record<string, Amplitude>;
  bloch: BlochVector[];
  entangled_qubits: number[];
  /** Shot counts, or null until the circuit contains a Measure gate. */
  counts?: Record<string, number> | null;
  changed_states: string[];
  level: 'beginner' | 'intermediate';
}

export interface TutorEvent {
  type: 'token' | 'done' | 'fallback' | 'error';
  content?: string;
  is_fallback?: boolean;
  error?: string;
}

/** One entry in the tutor drawer's scrollback (an explanation or a student question). */
export interface TutorMessage {
  id: string;
  role: 'explanation' | 'question';
  text: string;
  /** Facts the explanation was derived from, shown in the "What the tutor saw" expander. */
  facts: FactsPacket | null;
  isFallback: boolean;
  timestamp: number;
}

export interface LessonStep {
  id: string;
  lesson_id: string;
  order: number;
  instruction: string;
  check_spec: CheckSpec;
  tutor_context: string;
}

export interface CheckSpec {
  type: 'probability' | 'entangled' | 'fidelity';
  qubit_state?: string;
  target?: Record<string, number>;
  qubits?: number[];
  fidelity_target?: string;
  min?: number;
  tol?: number;
}

export interface Lesson {
  id: string;
  title: string;
  order: number;
  description: string;
  steps: LessonStep[];
}

export interface Challenge {
  id: string;
  title: string;
  target_spec: {
    type: 'statevector';
    state: string;
  };
  max_hints: number;
  hints: string[];
}

export interface User {
  id: string;
  name: string;
  role: 'student' | 'instructor';
  token: string;
}

export interface StudentProgress {
  user_id: string;
  lessons_completed: number;
  total_lessons: number;
  challenges_solved: number;
  total_challenges: number;
  last_active: string;
  status: 'on_track' | 'stuck';
  stuck_at?: string;
  /** Student view: completed lesson ids, in order. */
  completedLessons?: string[];
  /** Student view: completed challenge ids, in order. */
  completedChallenges?: string[];
  /** Student view: completed step count per lesson id. */
  lessonSteps?: Record<string, number>;
  /** Student view: attempts per challenge id. */
  challengeAttempts?: Record<string, number>;
}

export interface InstructorOverview {
  completion_by_lesson: Array<{
    lesson_id: string;
    title: string;
    percentage: number;
  }>;
  top_mistakes: Array<{
    mistake: string;
    count: number;
  }>;
  students: StudentProgress[];
}