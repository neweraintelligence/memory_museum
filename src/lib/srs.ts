import type { Memory, ReviewStatus } from '../types';
import { now } from './id';

export type Grade = 'easy' | 'hard' | 'forgotten' | 'mastered' | 'needs-review';

const DAY = 24 * 60 * 60 * 1000;

export const GRADES: { id: Grade; label: string; color: string }[] = [
  { id: 'forgotten', label: 'Forgot', color: '#ef4444' },
  { id: 'hard', label: 'Hard', color: '#f59e0b' },
  { id: 'needs-review', label: 'Review', color: '#8b5cf6' },
  { id: 'easy', label: 'Easy', color: '#22c55e' },
  { id: 'mastered', label: 'Mastered', color: '#06b6d4' },
];

/**
 * Lightweight SM-2-ish scheduler. Returns the patch to apply to a memory after
 * the user grades a recall attempt.
 */
export function applyGrade(memory: Memory, grade: Grade): Partial<Memory> {
  const ts = now();
  let ease = memory.ease || 2.5;
  let difficulty = memory.difficulty || 0; // running interval in days

  switch (grade) {
    case 'forgotten':
      ease = Math.max(1.3, ease - 0.3);
      difficulty = 0;
      break;
    case 'hard':
      ease = Math.max(1.3, ease - 0.15);
      difficulty = Math.max(1, difficulty * 1.2);
      break;
    case 'needs-review':
      difficulty = Math.max(1, difficulty);
      break;
    case 'easy':
      ease = ease + 0.1;
      difficulty = difficulty <= 0 ? 1 : difficulty * ease;
      break;
    case 'mastered':
      ease = ease + 0.15;
      difficulty = (difficulty <= 0 ? 4 : difficulty * ease) * 1.5;
      break;
  }

  const status: ReviewStatus = grade;
  const interval = grade === 'forgotten' ? 0 : Math.round(difficulty);

  return {
    reviewStatus: status,
    ease,
    difficulty,
    lastReviewed: ts,
    nextReview: ts + interval * DAY,
  };
}

export function isDue(memory: Memory, atTime = Date.now()): boolean {
  if (memory.reviewStatus === 'new') return true;
  if (memory.nextReview == null) return true;
  return memory.nextReview <= atTime;
}
