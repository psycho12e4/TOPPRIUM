import { getTest, getQuestions, saveTestScore, getCurrentUser } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification } from '../lib/utils.js'
import { Router } from '../lib/router.js'
import { calculateTestResults, getResultFeedback } from '../lib/test-results.js'

function renderTestContent(test, questions) {
  return `
    <a href="/" class="text-blue-600 hover:underline mb-4">← Back</a>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">${test.title}</h1>
    <p class="text-gray-600 mb-8">${questions?.length || 0} questions</p>

    <form id="test-form">
      <div class="space-y-8">
        ${questions?.map((question, i) => `
          <div class="card">
            <h3 class="font-semibold text-gray-900 mb-4">${i + 1}. ${question.question}</h3>
            <div class="space-y-2">
              ${['a', 'b', 'c', 'd'].map(option => `
                <label class="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer">
                  <input type="radio" name="q${question.id}" value="${option}" class="w-4 h-4 text-blue-600">
                  <span class="ml-3 text-gray-700">${question['option_' + option]}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <button type="submit" class="w-full mt-8 btn btn-primary">Submit Test</button>
    </form>
  `
}

export async function renderTest(testId) {
  const { data: test, error: testError } = await getTest(testId)

  if (!test) {
    return `
      ${renderNav()}
      <div class="max-w-7xl mx-auto px-4 py-12 text-center">
        <p class="text-gray-600">${testError ? 'Could not load this test. Please try again.' : 'Test not found'}</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
      </div>
    `
  }

  const { data: questions } = await getQuestions(testId)

  return `
    ${renderNav()}
    <div id="test-content-container" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      ${renderTestContent(test, questions)}
    </div>
  `
}

function bindTestForm(container = document) {
  const form = container.querySelector('#test-form')
  if (form) {
    form.addEventListener('submit', handleSubmit)
  }
}

export function initTestEvents() {
  initNavEvents()
  bindTestForm(document)
}

async function handleSubmit(e) {
  e.preventDefault()
  const form = e.currentTarget
  const testId = Router.getPath().split('/').pop()
  const [{ data: test }, { data: questions }] = await Promise.all([
    getTest(testId),
    getQuestions(testId)
  ])

  if (!questions || questions.length === 0) {
    showNotification('No questions found for this test', 'error')
    return
  }

  const userAnswers = {}
  questions.forEach((q) => {
    userAnswers[q.id] = form.querySelector(`input[name="q${q.id}"]:checked`)?.value
  })

  const { score, total, percentage, answeredQuestions } = calculateTestResults(questions, userAnswers)
  const user = await getCurrentUser()
  let saveError = null
  if (user) {
    const { error } = await saveTestScore(user.id, testId, score, total)
    saveError = error
  }

  if (saveError) {
    showNotification(`Scored ${score}/${total} (${percentage}%), but saving your result failed. Please retake if it doesn't appear in your history.`, 'error')
  } else {
    showNotification(`You scored ${score}/${total} (${percentage}%)`)
  }

  renderResults(test, answeredQuestions, score, total)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function renderResults(test, answeredQuestions, score, total) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0
  const { feedback, badgeClass } = getResultFeedback(percentage)
  const container = document.getElementById('test-content-container')
  if (!container) return

  const missedCount = total - score

  container.innerHTML = `
    <div class="mb-8">
      <a href="/" class="text-blue-600 hover:underline mb-4 inline-block">← Back to Home</a>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">${test.title} — Results</h1>
      <p class="text-gray-600">Review your performance below</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div class="card md:col-span-1 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Score Breakdown</h3>
        <div class="relative w-36 h-36 flex items-center justify-center mb-4">
          <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" stroke-width="4"></circle>
            <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#ef4444" stroke-width="4" stroke-dasharray="100 100" stroke-dashoffset="0"></circle>
            <circle id="chart-correct-segment" cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" stroke-width="4" stroke-dasharray="0 100" stroke-dashoffset="0" class="transition-all duration-1000 ease-out"></circle>
          </svg>
          <div class="absolute flex flex-col items-center justify-center">
            <span class="text-3xl font-extrabold text-gray-900">${percentage}%</span>
            <span class="text-xs text-gray-500 font-medium">Correct</span>
          </div>
        </div>
        <div class="flex gap-4 justify-center text-xs">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span class="text-gray-600">${score} Correct</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            <span class="text-gray-600">${missedCount} Missed</span>
          </div>
        </div>
      </div>

      <div class="card md:col-span-2 flex flex-col justify-between p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div>
          <span class="px-3 py-1 rounded-full text-sm font-semibold inline-block ${badgeClass} mb-4">
            ${percentage}% Correct
          </span>
          <h2 class="text-xl font-bold text-gray-900 mb-2">${feedback}</h2>
          <p class="text-gray-600 mb-4">You answered ${score} questions correctly out of ${total} total questions.</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 mt-4">
          <button type="button" data-action="retake" class="btn btn-primary text-center flex-1">Retake Test</button>
          <a href="/chapter/${test.chapter_id}" class="btn btn-outline text-center flex-1">Back to Chapter</a>
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Question Review</h2>
      ${answeredQuestions.map((entry, i) => {
        const { question, selected, isCorrect, isSkipped } = entry
        let statusBadge = ''
        let cardBorder = ''
        if (isCorrect) {
          statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">✓ Correct</span>'
          cardBorder = 'border-emerald-100 bg-emerald-50/10'
        } else if (isSkipped) {
          statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">⚠ Skipped</span>'
          cardBorder = 'border-amber-100 bg-amber-50/10'
        } else {
          statusBadge = '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 flex items-center gap-1">✗ Incorrect</span>'
          cardBorder = 'border-rose-100 bg-rose-50/10'
        }

        return `
          <div class="card border ${cardBorder} p-6">
            <div class="flex justify-between items-start gap-4 mb-4">
              <h3 class="font-semibold text-gray-900 text-lg">${i + 1}. ${question.question}</h3>
              <div class="shrink-0">${statusBadge}</div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${['a', 'b', 'c', 'd'].map(option => {
                const optionText = question['option_' + option]
                const isUserSelected = selected === option
                const isCorrectOption = question.correct_answer === option

                let borderClass = 'border-gray-200 bg-white hover:bg-gray-50'
                let badge = ''

                if (isUserSelected) {
                  if (isCorrect) {
                    borderClass = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-medium'
                    badge = '<span class="ml-auto text-emerald-600 font-semibold text-xs flex items-center gap-1 bg-emerald-100/50 px-2 py-0.5 rounded">Your Answer</span>'
                  } else {
                    borderClass = 'border-rose-500 bg-rose-50 text-rose-950 font-medium'
                    badge = '<span class="ml-auto text-rose-600 font-semibold text-xs flex items-center gap-1 bg-rose-100/50 px-2 py-0.5 rounded">Your Answer</span>'
                  }
                } else if (isCorrectOption) {
                  borderClass = 'border-emerald-300 border-dashed bg-emerald-50/30 text-emerald-900 font-medium'
                  badge = '<span class="ml-auto text-emerald-600 font-semibold text-xs bg-emerald-100 px-2 py-0.5 rounded">Correct Answer</span>'
                }

                return `
                  <div class="flex items-center p-3 border rounded-lg transition-all ${borderClass}">
                    <span class="font-bold mr-3 text-gray-400 uppercase text-sm">${option}.</span>
                    <span class="text-gray-700 text-sm">${optionText}</span>
                    ${badge}
                  </div>
                `
              }).join('')}
            </div>
          </div>
        `
      }).join('')}
    </div>
  `

  const retakeButton = container.querySelector('[data-action="retake"]')
  if (retakeButton) {
    retakeButton.addEventListener('click', async () => {
      const testId = Router.getPath().split('/').pop()
      const { data: testData, error: testError } = await getTest(testId)
      if (!testData) {
        showNotification(testError ? 'Could not reload this test.' : 'Test not found', 'error')
        return
      }

      const { data: questions } = await getQuestions(testId)
      container.innerHTML = `${renderTestContent(testData, questions)}`
      bindTestForm(container)
    })
  }

  setTimeout(() => {
    const segment = document.getElementById('chart-correct-segment')
    if (segment) {
      segment.setAttribute('stroke-dasharray', `${percentage} 100`)
    }
  }, 100)
}
