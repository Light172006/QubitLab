import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getMockProgress } from '../mock/dashboardData';
import { getLessons, getChallenges } from '../mock/content';
import { useAuthStore } from '../store';
import Progress from '../pages/Progress';

vi.mock('../api/client', () => ({
  api: {
    getLessons: async () => [
      { id: 'L1', order: 1, title: 'Qubits', steps: [{}, {}, {}, {}] },
      { id: 'L2', order: 2, title: 'Gates', steps: [{}, {}, {}, {}] },
      { id: 'L3', order: 3, title: 'Measurement', steps: [{}, {}, {}] },
    ],
    getChallenges: async () => [
      { id: 'CH1', title: 'Bell State', target_spec: { state: '00' }, max_hints: 3 },
    ],
    getProgress: async () => getMockProgress('1'),
    logout: async () => {},
  },
}));

describe('mock student progress counts', () => {
  it('derives completed lesson ids from the aggregate count', () => {
    const progress = getMockProgress('1'); // student 1 finished 2 lessons
    expect(progress.lessons_completed).toBe(2);
    expect(progress.completedLessons).toEqual(['L1', 'L2']);
  });

  it('marks finished lessons complete and the current lesson partial', () => {
    const progress = getMockProgress('1');
    expect(progress.lessonSteps?.L1).toBe(4);
    expect(progress.lessonSteps?.L2).toBe(4);
    expect(progress.lessonSteps?.L3).toBeGreaterThan(0);
    expect(progress.lessonSteps?.L3).toBeLessThan(3);
  });

  it('derives solved challenge ids and attempt counts', () => {
    const progress = getMockProgress('1'); // student 1 solved 1 challenge
    expect(progress.completedChallenges).toEqual(['CH1']);
    expect(progress.challengeAttempts?.CH1).toBe(1);
  });

  it('covers every lesson and challenge with a step/attempt count', () => {
    const progress = getMockProgress('2');
    getLessons().forEach((lesson) => {
      expect(progress.lessonSteps).toHaveProperty(lesson.id);
      expect(typeof progress.lessonSteps?.[lesson.id]).toBe('number');
    });
    getChallenges().forEach((challenge) => {
      expect(progress.challengeAttempts).toHaveProperty(challenge.id);
      expect(typeof progress.challengeAttempts?.[challenge.id]).toBe('number');
    });
  });

  it('falls back to a sensible default for unknown students', () => {
    const progress = getMockProgress('unknown-student');
    expect(progress.completedLessons).toEqual(['L1']);
    expect(progress.completedChallenges).toEqual(['CH1']);
    expect(progress.lessonSteps?.L1).toBe(4);
  });
});

describe('Progress page renders real counts', () => {
  it('shows completed lessons, solved challenges, and overall percentage', async () => {
    useAuthStore.getState().setUser({
      id: 'mock-1', name: 'Student', role: 'student', token: 'mock-token',
    });
    render(
      <MemoryRouter initialEntries={['/progress']}>
        <Progress />
      </MemoryRouter>
    );
    await waitFor(() => {
      // "2 / 3" also appears as the L3 step counter, so match all.
      expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('1 / 1')).toBeTruthy();
    expect(screen.getByText('67%')).toBeTruthy();
    // "4 / 4" appears for both finished lessons' step counters.
    expect(screen.getAllByText('4 / 4').length).toBe(2);
    useAuthStore.getState().setUser(null);
  });
});
