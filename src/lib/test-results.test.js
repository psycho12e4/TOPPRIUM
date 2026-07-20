import { describe, expect, it } from 'vitest'
import { calculateTestResults, getResultFeedback } from './test-results.js'

describe('calculateTestResults', () => {
  it('counts correct answers and treats skipped answers as missed', () => {
    const questions = [
      { id: 1, correct_answer: 'a' },
      { id: 2, correct_answer: 'b' },
      { id: 3, correct_answer: 'c' },
    ]
    const userAnswers = {
      1: 'a',
      2: 'd',
      3: undefined,
    }

    const result = calculateTestResults(questions, userAnswers)

    expect(result.score).toBe(1)
    expect(result.total).toBe(3)
    expect(result.correctCount).toBe(1)
    expect(result.missedCount).toBe(2)
    expect(result.percentage).toBe(33)
  })
})

describe('getResultFeedback', () => {
  it('returns the expected feedback for a strong score', () => {
    const feedback = getResultFeedback(85)

    expect(feedback.feedback).toContain('Excellent')
    expect(feedback.badgeClass).toContain('teal')
  })
})
