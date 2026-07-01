import {
  getChapters,
  getTests,
  createTest,
  deleteTest,
  getQuestions,
  createQuestion,
  deleteQuestion,
  getSubjects,
} from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification } from '../lib/utils.js'

export async function renderAdminTests() {
  const { data: subjects } = await getSubjects()

  return `
    ${renderNav(true)}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-8">Create Tests</h1>

      <div class="card mb-8">
        <form id="test-form">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-2">Subject</label>
              <select id="subject-select" class="input">
                <option value="">Select a subject</option>
                ${subjects?.map(s => `<option value="${s.id}">${s.name}</option>`).join('') || ''}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Chapter</label>
              <select id="chapter-select" class="input" disabled>
                <option value="">Select a chapter</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Test Title</label>
            <input type="text" id="test-title" class="input" placeholder="e.g., Chapter 1 Quiz">
          </div>

          <button type="submit" class="btn btn-primary mt-4">Create Test</button>
        </form>
      </div>

      <div id="tests-container" class="space-y-6"></div>
    </div>
  `
}

export function initAdminTestsEvents() {
  initNavEvents()

  const subjectSelect = document.getElementById('subject-select')
  const chapterSelect = document.getElementById('chapter-select')
  const testsContainer = document.getElementById('tests-container')

  if (subjectSelect) {
    subjectSelect.addEventListener('change', async (e) => {
      const subjectId = e.target.value
      if (subjectId) {
        const { data: chapters } = await getChapters(subjectId)
        chapterSelect.innerHTML = '<option value="">Select a chapter</option>'
        chapters?.forEach(ch => {
          const option = document.createElement('option')
          option.value = ch.id
          option.textContent = ch.title
          chapterSelect.appendChild(option)
        })
        chapterSelect.disabled = false
      } else {
        chapterSelect.innerHTML = '<option value="">Select a chapter</option>'
        chapterSelect.disabled = true
        testsContainer.innerHTML = ''
      }
    })
  }

  if (chapterSelect) {
    chapterSelect.addEventListener('change', async (e) => {
      const chapterId = e.target.value
      if (chapterId) {
        const { data: tests } = await getTests(chapterId, { includeAll: true })
        testsContainer.innerHTML = tests?.length ? `
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Tests</h2>
          <div class="space-y-4">
            ${tests.map(test => `
              <div class="card">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-lg font-semibold text-gray-900">${test.title}</h3>
                  <button class="delete-test-btn btn btn-danger text-sm" data-id="${test.id}">
                    Delete Test
                  </button>
                </div>
                <div id="questions-${test.id}" class="space-y-3 mb-4">
                </div>
                <button class="load-questions-btn btn btn-outline text-sm" data-test-id="${test.id}">
                  Load Questions
                </button>
                <button class="add-question-btn btn btn-secondary text-sm ml-2" data-test-id="${test.id}">
                  + Add Question
                </button>
              </div>
            `).join('')}
          </div>
        ` : '<p class="text-gray-600">No tests in this chapter</p>'

        testsContainer.querySelectorAll('.load-questions-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            const testId = event.currentTarget.dataset.testId
            const { data: questions } = await getQuestions(testId)
            const container = document.getElementById(`questions-${testId}`)
            if (!container) return

            container.innerHTML = questions?.map((q, i) => `
              <div class="p-4 bg-gray-50 rounded border border-gray-200">
                <p class="font-medium text-gray-900 mb-2">${i + 1}. ${q.question}</p>
                <div class="text-sm text-gray-600 space-y-1 mb-3">
                  <p>A) ${q.option_a}</p>
                  <p>B) ${q.option_b}</p>
                  <p>C) ${q.option_c}</p>
                  <p>D) ${q.option_d}</p>
                  <p class="font-semibold mt-2">Correct: ${(q.correct_answer || '').toUpperCase()}</p>
                </div>
                <button class="delete-question-btn btn btn-danger text-xs" data-id="${q.id}">
                  Delete Question
                </button>
              </div>
            `).join('') || '<p class="text-gray-600">No questions yet</p>'

            container.querySelectorAll('.delete-question-btn').forEach(dbtn => {
              dbtn.addEventListener('click', async (evt) => {
                if (confirm('Delete this question?')) {
                  const { error } = await deleteQuestion(evt.currentTarget.dataset.id)
                  if (!error) {
                    showNotification('Question deleted')
                    location.reload()
                  } else {
                    showNotification('Failed to delete question', 'error')
                  }
                }
              })
            })
          })
        })

        testsContainer.querySelectorAll('.delete-test-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            if (confirm('Delete this test and all questions?')) {
              const { error } = await deleteTest(event.currentTarget.dataset.id)
              if (!error) {
                showNotification('Test deleted')
                location.reload()
              } else {
                showNotification('Failed to delete test', 'error')
              }
            }
          })
        })

        testsContainer.querySelectorAll('.add-question-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            const testId = event.currentTarget.dataset.testId
            const question = prompt('Enter question:')
            if (!question) return
            const optionA = prompt('Option A:')
            const optionB = prompt('Option B:')
            const optionC = prompt('Option C:')
            const optionD = prompt('Option D:')
            let correct = prompt('Correct answer (a/b/c/d):')?.toLowerCase()?.trim()

            if (!optionA || !optionB || !optionC || !optionD || !correct) {
              showNotification('All fields are required', 'error')
              return
            }
            if (!['a', 'b', 'c', 'd'].includes(correct)) {
              showNotification('Correct answer must be a, b, c, or d', 'error')
              return
            }

            const { error } = await createQuestion(testId, question, optionA, optionB, optionC, optionD, correct)
            if (!error) {
              showNotification('Question added')
              location.reload()
            } else {
              showNotification('Failed to add question: ' + (error.message || ''), 'error')
            }
          })
        })
      } else {
        testsContainer.innerHTML = ''
      }
    })
  }

  const testForm = document.getElementById('test-form')
  if (testForm) {
    testForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const chapterId = document.getElementById('chapter-select').value
      const title = document.getElementById('test-title').value

      if (!chapterId || !title) {
        showNotification('Please select a chapter and enter a title', 'error')
        return
      }

      const { error } = await createTest(chapterId, title)
      if (!error) {
        showNotification('Test created')
        location.reload()
      } else {
        showNotification('Failed to create test: ' + (error.message || ''), 'error')
      }
    })
  }
}
