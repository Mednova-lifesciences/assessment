import { QUESTIONS, type QuestionId } from './questions';

export type Answer = 'Yes' | 'No' | 'In Progress';
export type Answers = Record<QuestionId, Answer>;
export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface ScoreResult {
  score: number;
  riskLevel: RiskLevel;
  criticalGaps: string[];
  generalGaps: string[];
}

export function scoreAssessment(answers: Answers): ScoreResult {
  let score = 0;
  const criticalGaps: string[] = [];
  const generalGaps: string[] = [];

  for (const question of QUESTIONS) {
    const answer = answers[question.id];

    if (answer === 'Yes') {
      score += 10;
    } else if (answer === 'In Progress') {
      score += 5;
      if (question.critical) {
        criticalGaps.push(`(In Progress) ${question.advice}`);
      }
    } else if (answer === 'No') {
      if (question.critical) {
        criticalGaps.push(question.advice);
      } else {
        generalGaps.push(question.advice);
      }
    }
  }

  const riskLevel: RiskLevel = score >= 80 ? 'Low' : score >= 50 ? 'Moderate' : 'High';

  return { score, riskLevel, criticalGaps, generalGaps };
}

export function isValidAnswers(value: unknown): value is Answers {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return QUESTIONS.every((question) => {
    const answer = record[question.id];
    return answer === 'Yes' || answer === 'No' || answer === 'In Progress';
  });
}
