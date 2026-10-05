import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from '../pages/Home';
import { useLessonStore } from '../store';
import { getLessons } from '../mock/content';

/**
 * Every lesson card used to link to a bare /workspace, and Workspace always
 * loaded lessons[0]. Lessons 2 and 3 were therefore unreachable: "all three
 * lessons can be completed in order" could not even be started.
 */

const mockGetLessons = vi.fn();
const mockGetChallenges = vi.fn();
const mockGetProgress = vi.fn();

vi.mock('../api/client', () => ({
  api: {
    getLessons: () => mockGetLessons(),
    getChallenges: () => mockGetChallenges(),
    getProgress: () => mockGetProgress(),
  },
}));

const lessons = getLessons();

/** Records the destination instead of mounting the canvas. */
let destination = '';
function Destination() {
  destination = useLocation().pathname + useLocation().search;
  return <div data-testid="destination">{destination}</div>;
}

function renderLearn() {
  destination = '';
  return render(
    <MemoryRouter initialEntries={['/learn']}>
      <Routes>
        <Route path="/learn" element={<Home />} />
        <Route path="/workspace" element={<Destination />} />
      </Routes>
    </MemoryRouter>
  );
}

/** Lesson 1 complete, lesson 2 next, lesson 3 locked. */
const oneLessonDone = {
  user_id: 's1', lessons_completed: 1, total_lessons: 3,
  challenges_solved: 0, total_challenges: 3,
  last_active: 'Just now', status: 'on_track' as const,
  completedLessons: ['L1'], completedChallenges: [],
  lessonSteps: { L1: 4, L2: 1, L3: 0 }, challengeAttempts: {},
};

beforeEach(() => {
  mockGetLessons.mockResolvedValue(lessons);
  mockGetChallenges.mockResolvedValue([]);
  mockGetProgress.mockResolvedValue(oneLessonDone);
  useLessonStore.setState({ currentLesson: null, currentStepIndex: 0, completedSteps: [] });
  destination = '';
});

describe('B07 each lesson card opens that lesson', () => {
  it('points lesson 1 at lesson 1', async () => {
    renderLearn();
    await waitFor(() => expect(screen.getByText('Superposition')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Superposition'));
    expect(destination).toBe('/workspace?lesson=L1');
  });

  it('points lesson 2 at lesson 2', async () => {
    renderLearn();
    await waitFor(() => expect(screen.getByText('Entanglement')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Entanglement'));
    expect(destination).toBe('/workspace?lesson=L2');
  });

  it('makes lesson 3 openable once lesson 2 is done', async () => {
    mockGetProgress.mockResolvedValue({
      ...oneLessonDone,
      completedLessons: ['L1', 'L2'],
      lessonSteps: { L1: 4, L2: 4, L3: 1 },
    });
    renderLearn();
    await waitFor(() => expect(screen.getByText('Interference')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Interference'));
    expect(destination).toBe('/workspace?lesson=L3');
  });

  it('keeps a locked lesson unclickable', async () => {
    renderLearn();
    await waitFor(() => expect(screen.getByText('Interference')).toBeInTheDocument());
    // Lesson 3 is locked with only lesson 1 complete: not a link at all.
    expect(screen.getByText('Finish lesson 2 first')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Interference/ })).toBeNull();
  });

  it('sends Continue to the first unfinished lesson', async () => {
    renderLearn();
    await waitFor(() => expect(screen.getByText(/Continue:/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Continue:/));
    expect(destination).toBe('/workspace?lesson=L2');
  });

  it('never links to a bare /workspace', async () => {
    renderLearn();
    await waitFor(() => expect(screen.getByText('Superposition')).toBeInTheDocument());
    const hrefs = [...document.querySelectorAll('a[href^="/workspace"]')].map((a) => a.getAttribute('href'));
    expect(hrefs.length).toBeGreaterThan(0);
    // Every entry point says which lesson it opens, or that it is the sandbox.
    expect(hrefs.filter((href) => href === '/workspace')).toEqual([]);
    expect(hrefs.every((href) => href?.includes('lesson=') || href?.includes('sandbox=1'))).toBe(true);
  });

  it('sends the Open Sandbox card to the sandbox, not to lesson 1', async () => {
    renderLearn();
    await waitFor(() => expect(screen.getByText('Open Sandbox')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Open Sandbox'));
    expect(destination).toBe('/workspace?sandbox=1');
  });
});
