import {
  getChapters,
  getTests,
  createTest,
  deleteTest,
  getTestAllowedUsers,
  updateTestAccess,
  getQuestions,
  createQuestion,
  deleteQuestion,
  getSubjects,
  getProfiles,
} from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification } from '../lib/utils.js'

export async function renderAdminTests() {
  const { data: subjects } = await getSubjects()
  const { data: profiles } = await getProfiles()
  const students = profiles?.filter(profile => profile.role !== 'admin') || []

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

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label class="block text-sm font-medium mb-2">Who can access this?</label>
              <select id="test-access-level" class="input">
                <option value="everyone">Everyone</option>
                <option value="selected">Selected users only</option>
              </select>
            </div>
            <div id="test-user-picker" class="hidden">
              <label class="block text-sm font-medium mb-2">Selected users</label>
              <select id="test-user-ids" class="input min-h-32" multiple>
                ${students.map(user => `
                  <option value="${user.id}">${user.email || user.id}</option>
                `).join('')}
              </select>
              <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select more than one user.</p>
            </div>
          </div>

          <button type="submit" class="btn btn-primary mt-4">Create Test</button>
        </form>
      </div>

      <div id="tests-container" class="space-y-6"></div>
    </div>
  `
}

function renderUserOptions(students, selectedUserIds = []) {
  const selected = new Set(selectedUserIds)
  return students.map(user => `
    <option value="${user.id}" ${selected.has(user.id) ? 'selected' : ''}>${user.email || user.id}</option>
  `).join('')
}

export function initAdminTestsEvents() {
  initNavEvents()

  const subjectSelect = document.getElementById('subject-select')
  const chapterSelect = document.getElementById('chapter-select')
  const testsContainer = document.getElementById('tests-container')
  const accessLevelSelect = document.getElementById('test-access-level')
  const userPicker = document.getElementById('test-user-picker')

  if (accessLevelSelect && userPicker) {
    accessLevelSelect.addEventListener('change', (e) => {
      userPicker.classList.toggle('hidden', e.target.value !== 'selected')
    })
  }

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
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">${test.title}</h3>
                    <p class="text-xs text-gray-500">${test.access_level === 'selected' ? 'Selected users only' : 'Everyone'}</p>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="manage-test-access-btn btn btn-outline text-sm"
                      data-id="${test.id}"
                      data-access-level="${test.access_level || 'everyone'}"
                    >
                      Manage Access
                    </button>
                    <button class="delete-test-btn btn btn-danger text-sm" data-id="${test.id}">
                      Delete Test
                    </button>
                  </div>
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

        testsContainer.querySelectorAll('.manage-test-access-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            const testId = event.currentTarget.dataset.id
            const currentAccessLevel = event.currentTarget.dataset.accessLevel
            const { data: allowedUsers, error } = await getTestAllowedUsers(testId)

            if (error) {
              showNotification('Failed to load access list: ' + (error.message || ''), 'error')
              return
            }

            const selectedUserIds = allowedUsers?.map(row => row.user_id) || []
            const card = event.currentTarget.closest('.card')
            let editor = card.querySelector('.test-access-editor')

            if (editor) {
              editor.remove()
              return
            }

            editor = document.createElement('div')
            editor.className = 'test-access-editor mt-4 pt-4 border-t border-gray-200'
            editor.innerHTML = `
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-2">Who can access this?</label>
                  <select class="test-edit-access-level input">
                    <option value="everyone" ${currentAccessLevel !== 'selected' ? 'selected' : ''}>Everyone</option>
                    <option value="selected" ${currentAccessLevel === 'selected' ? 'selected' : ''}>Selected users only</option>
                  </select>
                </div>
                <div class="test-edit-user-picker ${currentAccessLevel === 'selected' ? '' : 'hidden'}">
                  <label class="block text-sm font-medium mb-2">Selected users</label>
                  <select class="test-edit-user-ids input min-h-32" multiple>
                    ${renderUserOptions(students, selectedUserIds)}
                  </select>
                  <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select more than one user.</p>
                </div>
              </div>
              <div class="flex gap-2 mt-4">
                <button class="save-test-access-btn btn btn-primary text-sm">Save Access</button>
                <button class="cancel-test-access-btn btn btn-outline text-sm">Cancel</button>
              </div>
            `
            card.insertBefore(editor, card.querySelector(`[id="questions-${testId}"]`))

            const editAccessLevel = editor.querySelector('.test-edit-access-level')
            const editUserPicker = editor.querySelector('.test-edit-user-picker')
            editAccessLevel.addEventListener('change', (changeEvent) => {
              editUserPicker.classList.toggle('hidden', changeEvent.target.value !== 'selected')
            })

            editor.querySelector('.cancel-test-access-btn').addEventListener('click', () => editor.remove())
            editor.querySelector('.save-test-access-btn').addEventListener('click', async () => {
              const accessLevel = editAccessLevel.value
              const userIds = [...editor.querySelector('.test-edit-user-ids').selectedOptions].map(option => option.value)

              if (accessLevel === 'selected' && userIds.length === 0) {
                showNotification('Please select at least one user', 'error')
                return
              }

              const { error: saveError } = await updateTestAccess(testId, { accessLevel, userIds })
              if (saveError) {
                showNotification('Failed to update access: ' + (saveError.message || ''), 'error')
              } else {
                showNotification('Access updated')
                chapterSelect.dispatchEvent(new Event('change'))
              }
            })
          })
        })

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
      const accessLevel = document.getElementById('test-access-level').value
      const userIds = [...document.getElementById('test-user-ids').selectedOptions].map(option => option.value)

      if (!chapterId || !title) {
        showNotification('Please select a chapter and enter a title', 'error')
        return
      }

      if (accessLevel === 'selected' && userIds.length === 0) {
        showNotification('Please select at least one user', 'error')
        return
      }

      const { error } = await createTest(chapterId, title, { accessLevel, userIds })
      if (!error) {
        showNotification('Test created')
        location.reload()
      } else {
        showNotification('Failed to create test: ' + (error.message || ''), 'error')
      }
    })
  }
}
