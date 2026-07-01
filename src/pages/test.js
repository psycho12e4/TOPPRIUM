import { getTest, getQuestions, saveTestScore, getCurrentUser } from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification } from '../lib/utils.js'
import { Router } from '../lib/router.js'

export async function renderTest(testId) {
  const { data: test } = await getTest(testId)

  if (!test) {
    return `
      ${renderNav()}
      <div class="max-w-7xl mx-auto px-4 py-12 text-center">
        <p class="text-gray-600">Test not found</p>
        <a href="/" class="text-blue-600 hover:underline">Back to Home</a>
      </div>
    `
  }

  const { data: questions } = await getQuestions(testId)

  return `
    ${renderNav()}
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
    </div>
  `
}

export function initTestEvents() {
  initNavEvents()

  const form = document.getElementById('test-form')
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const testId = Router.getPath().split('/').pop()
      const { data: questions } = await getQuestions(testId)

      if (!questions || questions.length === 0) {
        showNotification('No questions found for this test', 'error')
        return
      }

      let score = 0
      questions.forEach(q => {
        const selected = document.querySelector(`input[name="q${q.id}"]:checked`)?.value
        if (selected && q.correct_answer === selected) {
          score++
        }
      })

      const total = questions.length
      const user = await getCurrentUser()
      if (user) {
        await saveTestScore(user.id, testId, score, total)
      }

      const percentage = Math.round((score / total) * 100)
      showNotification(`You scored ${score}/${total} (${percentage}%)`)
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    })
  }
}
