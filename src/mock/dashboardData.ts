import { InstructorOverview, StudentProgress } from '../types';

const MOCK_STUDENTS: StudentProgress[] = [
  { user_id: '1', lessons_completed: 2, total_lessons: 3, challenges_solved: 1, total_challenges: 3, last_active: '2 min ago', status: 'on_track' },
  { user_id: '2', lessons_completed: 1, total_lessons: 3, challenges_solved: 0, total_challenges: 3, last_active: '3 days ago', status: 'stuck', stuck_at: 'L2·S3' },
  { user_id: '3', lessons_completed: 3, total_lessons: 3, challenges_solved: 3, total_challenges: 3, last_active: '1 hour ago', status: 'on_track' },
  { user_id: '4', lessons_completed: 1, total_lessons: 3, challenges_solved: 1, total_challenges: 3, last_active: '5 hours ago', status: 'stuck', stuck_at: 'L1·S4' },
  { user_id: '5', lessons_completed: 2, total_lessons: 3, challenges_solved: 2, total_challenges: 3, last_active: '30 min ago', status: 'on_track' },
  { user_id: '6', lessons_completed: 0, total_lessons: 3, challenges_solved: 0, total_challenges: 3, last_active: '1 week ago', status: 'stuck', stuck_at: 'L1·S1' },
  { user_id: '7', lessons_completed: 3, total_lessons: 3, challenges_solved: 2, total_challenges: 3, last_active: '2 hours ago', status: 'on_track' },
  { user_id: '8', lessons_completed: 1, total_lessons: 3, challenges_solved: 0, total_challenges: 3, last_active: '4 days ago', status: 'stuck', stuck_at: 'L2·S2' },
];

export function getMockProgress(userId: string): StudentProgress {
  const student = MOCK_STUDENTS.find(s => s.user_id === userId);
  if (student) return student;

  // Return default for current user
  return {
    user_id: userId,
    lessons_completed: 1,
    total_lessons: 3,
    challenges_solved: 1,
    total_challenges: 3,
    last_active: 'Just now',
    status: 'on_track',
  };
}

export function getInstructorOverview(): InstructorOverview {
  return {
    completion_by_lesson: [
      { lesson_id: 'L1', title: 'Superposition', percentage: 92 },
      { lesson_id: 'L2', title: 'Entanglement', percentage: 61 },
      { lesson_id: 'L3', title: 'Interference', percentage: 28 },
    ],
    top_mistakes: [
      { mistake: 'CNOT control/target swapped', count: 14 },
      { mistake: 'Forgot Hadamard before CNOT', count: 9 },
      { mistake: 'Challenge 3 hints ≥2', count: 11 },
      { mistake: 'Measurement before superposition', count: 7 },
      { mistake: 'Phase gate confusion (S vs T)', count: 5 },
    ],
    students: MOCK_STUDENTS,
  };
}

export function exportCsv(): string {
  const overview = getInstructorOverview();
  const headers = ['Student', 'Lessons Completed', 'Challenges Solved', 'Last Active', 'Status', 'Stuck At'];
  const rows = overview.students.map(s => [
    `Student ${s.user_id}`,
    `${s.lessons_completed}/${s.total_lessons}`,
    `${s.challenges_solved}/${s.total_challenges}`,
    s.last_active,
    s.status,
    s.stuck_at || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}