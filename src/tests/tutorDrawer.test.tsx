import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TutorDrawer } from '../components/tutor/TutorDrawer';
import { TutorButton, TUTOR_BUTTON_ID, TUTOR_DRAWER_ID } from '../components/tutor/TutorButton';
import { useTutorStore, useUIStore } from '../store';

function renderTutor() {
  const onAsk = vi.fn();
  render(
    <>
      <input aria-label="some field" />
      <TutorButton />
      <TutorDrawer onAsk={onAsk} />
    </>
  );
  return { onAsk };
}

const drawer = () => document.getElementById(TUTOR_DRAWER_ID) as HTMLElement;

beforeEach(() => {
  useUIStore.setState({ tutorDrawerOpen: false });
  useTutorStore.setState({
    messages: [],
    currentExplanation: '',
    isStreaming: false,
    isFallback: false,
    hasUnread: false,
  });
});

describe('TutorButton', () => {
  it('exposes expanded/controls state and toggles the drawer', () => {
    renderTutor();
    const button = document.getElementById(TUTOR_BUTTON_ID) as HTMLButtonElement;
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', TUTOR_DRAWER_ID);

    fireEvent.click(button);
    expect(useUIStore.getState().tutorDrawerOpen).toBe(true);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows the unread dot only while the drawer is closed', () => {
    renderTutor();
    expect(screen.queryByText('New explanation available')).not.toBeInTheDocument();

    act(() => useTutorStore.getState().markTutorRead());
    act(() => useTutorStore.setState({ hasUnread: true }));
    expect(screen.getByText('New explanation available')).toBeInTheDocument();

    act(() => useUIStore.getState().setTutorDrawerOpen(true));
    expect(screen.queryByText('New explanation available')).not.toBeInTheDocument();
  });

  it('shows the Offline badge while the fallback template is answering', () => {
    renderTutor();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    act(() => useTutorStore.setState({ isFallback: true }));
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});

describe('TutorDrawer', () => {
  it('is a non-modal complementary region that does not block the canvas', () => {
    renderTutor();
    act(() => useUIStore.getState().setTutorDrawerOpen(true));
    expect(drawer()).toHaveAttribute('role', 'complementary');
    expect(drawer()).toHaveAttribute('aria-label', 'Tutor');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('aria-modal')).not.toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
  });

  it('moves focus into the drawer on open and back to the button on close', () => {
    renderTutor();
    const button = document.getElementById(TUTOR_BUTTON_ID) as HTMLButtonElement;

    act(() => useUIStore.getState().setTutorDrawerOpen(true));
    expect(document.activeElement).toBe(drawer());

    act(() => useUIStore.getState().setTutorDrawerOpen(false));
    expect(document.activeElement).toBe(button);
  });

  it('closes on Escape', () => {
    renderTutor();
    act(() => useUIStore.getState().setTutorDrawerOpen(true));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useUIStore.getState().tutorDrawerOpen).toBe(false);
  });

  it('toggles on T but not while typing in a field', () => {
    renderTutor();
    fireEvent.keyDown(document, { key: 't' });
    expect(useUIStore.getState().tutorDrawerOpen).toBe(true);

    fireEvent.keyDown(document, { key: 't' });
    expect(useUIStore.getState().tutorDrawerOpen).toBe(false);

    const field = screen.getByLabelText('some field');
    fireEvent.keyDown(field, { key: 't' });
    expect(useUIStore.getState().tutorDrawerOpen).toBe(false);
  });

  it('asks a question from the sticky ask box', () => {
    const { onAsk } = renderTutor();
    act(() => useUIStore.getState().setTutorDrawerOpen(true));

    const input = screen.getByLabelText('Ask the tutor a question') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  why is q0 mixed?  ' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onAsk).toHaveBeenCalledWith('why is q0 mixed?');
    expect(input.value).toBe('');
  });

  it('renders the explanation history newest-last with a facts expander', () => {
    const facts = {
      action: { type: 'add_gate' as const, gate: 'H' as const, targets: [0], controls: [] },
      num_qubits: 2,
      probabilities: { '00': 0.5, '10': 0.5 },
      prev_probabilities: {},
      amplitudes: {},
      bloch: [],
      entangled_qubits: [],
      changed_states: ['10'],
      level: 'beginner' as const,
    };

    renderTutor();
    act(() => {
      useTutorStore.setState({ factsPacket: facts });
      useTutorStore.getState().pushQuestion('what changed?');
      useTutorStore.setState({ currentExplanation: 'q0 is now in superposition.' });
      useTutorStore.getState().commitExplanation();
    });

    const log = screen.getByRole('log');
    const bubbles = Array.from(log.querySelectorAll('article')).map((n) => n.textContent || '');
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0]).toContain('what changed?');
    expect(bubbles[1]).toContain('q0 is now in superposition.');
    expect(screen.getAllByText('What the tutor saw')).toHaveLength(2);
  });
});

describe('tutor store', () => {
  it('files a committed explanation into history and flags it unread', () => {
    act(() => {
      useTutorStore.setState({ currentExplanation: 'done text' });
      useTutorStore.getState().commitExplanation();
    });
    const { messages, currentExplanation, hasUnread } = useTutorStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].text).toBe('done text');
    expect(currentExplanation).toBe('');
    expect(hasUnread).toBe(true);
  });

  it('ignores an empty explanation', () => {
    act(() => useTutorStore.getState().commitExplanation());
    expect(useTutorStore.getState().messages).toHaveLength(0);
    expect(useTutorStore.getState().hasUnread).toBe(false);
  });
});