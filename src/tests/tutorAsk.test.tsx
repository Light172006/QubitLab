import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { isOffTopic, generateExplanation, answerQuestion } from '../mock/tutor';
import { TutorDrawer } from '../components/tutor/TutorDrawer';
import { useUIStore } from '../store';
import { simulateCircuit } from '../mock/simulator';
import type { Circuit, Gate } from '../types';

const gate = (type: Gate['type'], targets: number[], controls: number[] = [], column = 0): Gate => ({
  id: `${type}${targets.join('')}${column}`, type, targets, controls, column,
});
const circ = (gates: Gate[], numQubits = 2): Circuit => ({ version: 1, num_qubits: numQubits, gates });

/** H on q0: probabilities 50/50, one qubit on the equator. */
const hOnQ0 = () => simulateCircuit(circ([gate('H', [0], [], 0)])).facts;

/** Collect a stream into its text and event types. */
async function drain(stream: AsyncGenerator<{ type: string; content?: string }>) {
  let text = '';
  const types: string[] = [];
  for await (const event of stream) {
    types.push(event.type);
    if (event.content) text += event.content;
  }
  return { text, types };
}

describe('B15 the fallback path is deterministic, not a coin flip', () => {
  it('reports the template path every time, with no randomness', async () => {
    const facts = hOnQ0();
    for (let attempt = 0; attempt < 2; attempt++) {
      const { types } = await drain(generateExplanation(facts, 'beginner') as never);
      expect(types.filter((t) => t === 'fallback')).toHaveLength(1);
      expect(types[types.length - 1]).toBe('done');
    }
  }, 20000);

  it('streams the same text every time', async () => {
    const facts = hOnQ0();
    const first = await drain(generateExplanation(facts, 'beginner') as never);
    const second = await drain(generateExplanation(facts, 'beginner') as never);
    expect(second.text).toBe(first.text);
    expect(first.text.trim().length).toBeGreaterThan(0);
  }, 20000);

  it('still reports the numbers that are on the State cards', async () => {
    const facts = hOnQ0();
    const { text } = await drain(generateExplanation(facts, 'beginner') as never);
    for (const prob of Object.values(facts.probabilities)) {
      expect(text).toContain(`${Math.round(prob * 100)}%`);
    }
  }, 20000);
});

describe('B16 off-topic questions get the redirect', () => {
  it.each([
    'what is the weather like today',
    'who won the football match',
    'give me a recipe for bread',
    'what is the weather',
    'thanks!',
    'book me a flight',
  ])('treats %j as off topic', (question) => {
    expect(isOffTopic(question)).toBe(true);
  });

  it.each([
    'why does H give 50%',
    'what did that gate do',
    'is q0 entangled',
    'explain the probabilities',
    'what is the bloch vector length',
    'how many shots should I run',
    'what does cnot do',
  ])('treats %j as on topic', (question) => {
    expect(isOffTopic(question)).toBe(false);
  });

  it('points the student back at the circuit instead of just refusing', async () => {
    const facts = hOnQ0();
    const { text } = await drain(answerQuestion('what is the weather like', facts, 'beginner') as never);
    expect(text).toMatch(/circuit tutor/i);
    expect(text).toMatch(/qubit/);
    expect(text).toMatch(/for example/i);
  }, 20000);

  it('answers an on-topic question from the facts instead of redirecting', async () => {
    const facts = hOnQ0();
    const { text } = await drain(answerQuestion('what are the probabilities', facts, 'beginner') as never);
    expect(text).toMatch(/50%/);
    expect(text).not.toMatch(/circuit tutor/i);
  }, 20000);
});

describe('F2/F3 the ask box behaves like a real input', () => {
  beforeEach(() => {
    useUIStore.setState({ tutorDrawerOpen: true, level: 'beginner' });
  });

  function renderDrawer() {
    const onAsk = vi.fn();
    render(<TutorDrawer onAsk={onAsk} />);
    return onAsk;
  }

  const box = () => screen.getByLabelText('Ask the tutor a question');

  it('sends on Enter', () => {
    const onAsk = renderDrawer();
    fireEvent.change(box(), { target: { value: 'why 50%?' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(onAsk).toHaveBeenCalledWith('why 50%?');
  });

  it('does not send on Shift+Enter, so a newline can be typed', () => {
    const onAsk = renderDrawer();
    fireEvent.change(box(), { target: { value: 'line one' } });
    fireEvent.keyDown(box(), { key: 'Enter', shiftKey: true });
    expect(onAsk).not.toHaveBeenCalled();
  });

  it('ignores empty and whitespace-only input', () => {
    const onAsk = renderDrawer();
    fireEvent.change(box(), { target: { value: '   ' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(onAsk).not.toHaveBeenCalled();

    fireEvent.change(box(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(onAsk).not.toHaveBeenCalled();
  });

  it('keeps a long question intact', async () => {
    const onAsk = renderDrawer();
    const long = 'why is '.repeat(200).trim();
    fireEvent.change(box(), { target: { value: long } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    await waitFor(() => expect(onAsk).toHaveBeenCalledWith(long));
  });

  it('clears the box after sending', () => {
    renderDrawer();
    fireEvent.change(box(), { target: { value: 'why 50%?' } });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(box()).toHaveValue('');
  });

  it('does not toggle the drawer when T is typed inside the box', () => {
    renderDrawer();
    const before = useUIStore.getState().tutorDrawerOpen;
    fireEvent.change(box(), { target: { value: 'what is this' } });
    expect(useUIStore.getState().tutorDrawerOpen).toBe(before);
  });
});
