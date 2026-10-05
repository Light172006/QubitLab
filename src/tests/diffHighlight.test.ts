import { describe, it, expect } from 'vitest';
import { computeStateDiff } from '../pages/Workspace';

describe('BUG-02: changed-state diff matches the real change', () => {
  it('marks states that appeared from an empty previous state', () => {
    const changed = computeStateDiff({}, { '00': 0.5, '01': 0.5 });
    expect(changed).toEqual(['00', '01']);
  });

  it('marks states whose probability moved beyond the 0.01 threshold', () => {
    const changed = computeStateDiff(
      { '00': 1 },
      { '00': 0.5, '01': 0.5 }
    );
    expect(changed).toEqual(['00', '01']);
  });

  it('ignores moves within the threshold', () => {
    const changed = computeStateDiff(
      { '00': 0.5, '01': 0.5 },
      { '00': 0.505, '01': 0.495 }
    );
    expect(changed).toEqual([]);
  });

  it('marks states that disappeared', () => {
    const changed = computeStateDiff(
      { '00': 0.5, '01': 0.5 },
      { '00': 1 }
    );
    expect(changed).toEqual(['00', '01']);
  });

  it('returns no changes for identical distributions', () => {
    const changed = computeStateDiff(
      { '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 },
      { '00': 0.25, '01': 0.25, '10': 0.25, '11': 0.25 }
    );
    expect(changed).toEqual([]);
  });

  it('preserves the current state ordering', () => {
    const changed = computeStateDiff(
      { '00': 1 },
      { '11': 0.5, '00': 0.5 }
    );
    expect(changed).toEqual(['11', '00']);
  });
});
