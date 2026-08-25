import { describe, it, expect } from 'vitest';
import { scoreAssessment } from './scoring';
import { QUESTIONS } from './questions';
import type { Answers } from './scoring';

function answersWith(value: 'Yes' | 'No' | 'In Progress'): Answers {
  const answers = {} as Answers;
  for (const q of QUESTIONS) {
    answers[q.id] = value;
  }
  return answers;
}

describe('scoreAssessment', () => {
  it('scores all Yes as 100 and Low risk with no gaps', () => {
    const result = scoreAssessment(answersWith('Yes'));
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe('Low');
    expect(result.criticalGaps).toHaveLength(0);
    expect(result.generalGaps).toHaveLength(0);
  });

  it('scores all No as 0 and High risk, splitting gaps by criticality', () => {
    const result = scoreAssessment(answersWith('No'));
    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe('High');
    expect(result.criticalGaps).toHaveLength(6);
    expect(result.generalGaps).toHaveLength(4);
  });

  it('scores all In Progress as 50 and flags critical questions as in-progress gaps', () => {
    const result = scoreAssessment(answersWith('In Progress'));
    expect(result.score).toBe(50);
    expect(result.riskLevel).toBe('Moderate');
    expect(result.criticalGaps).toHaveLength(6);
    expect(result.criticalGaps[0]).toMatch(/^\(In Progress\)/);
    expect(result.generalGaps).toHaveLength(0);
  });

  it('scores a mixed answer set correctly', () => {
    const answers = answersWith('Yes');
    answers.q1 = 'No';
    answers.q3 = 'No';
    const result = scoreAssessment(answers);
    expect(result.score).toBe(80);
    expect(result.riskLevel).toBe('Low');
    expect(result.criticalGaps).toHaveLength(1);
    expect(result.generalGaps).toHaveLength(1);
  });
});
