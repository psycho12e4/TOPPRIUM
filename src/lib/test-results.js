export function calculateTestResults(questions, userAnswers) {
  let score = 0
  const answeredQuestions = questions.map((question) => {
    const selected = userAnswers[question.id]
    const isCorrect = selected && selected === question.correct_answer
    if (isCorrect) score += 1

    return {
      question,
      selected,
      isCorrect,
      isSkipped: !selected,
    }
  })

  const total = questions.length
  const correctCount = score
  const missedCount = total - correctCount
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0

  return {
    score,
    total,
    correctCount,
    missedCount,
    percentage,
    answeredQuestions,
  }
}

export function getResultFeedback(percentage) {
  if (percentage === 100) {
    return {
      feedback: "Perfect Score! Outstanding job, you've mastered this chapter!",
      badgeClass: 'bg-emerald-100 text-emerald-800',
    }
  }

  if (percentage >= 80) {
    return {
      feedback: 'Excellent! Great understanding of the topic.',
      badgeClass: 'bg-teal-100 text-teal-800',
    }
  }

  if (percentage >= 50) {
    return {
      feedback: "Good Job! You passed, but there's room for improvement.",
      badgeClass: 'bg-blue-100 text-blue-800',
    }
  }

  return {
    feedback: 'Keep Practicing! Review the correct answers below and try again.',
    badgeClass: 'bg-rose-100 text-rose-800',
  }
}
