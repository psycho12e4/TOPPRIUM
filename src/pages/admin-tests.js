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
import { renderAdminShell, initAdminShellEvents } from '../components/admin-shell.js'
import { showNotification, confirmDialog } from '../lib/utils.js'

export async function renderAdminTests() {
  const { data: subjects } = await getSubjects()
  const { data: profiles } = await getProfiles()
  const students = profiles?.filter(profile => profile.role !== 'admin') || []

  return renderAdminShell('/admin/tests', `
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
                ${renderUserOptions(students)}
              </select>
              <p class="text-xs text-gray-500 mt-1">
                ${students.length ? 'Hold Ctrl/Cmd to select more than one user.' : 'Create student accounts and run the access SQL migration if this stays empty.'}
              </p>
            </div>
          </div>

          <button type="submit" class="btn btn-primary mt-4">Create Test</button>
        </form>
      </div>

      <div id="tests-container" class="space-y-6"></div>
    </div>
  `)
}

function renderUserOptions(students, selectedUserIds = []) {
  if (!students.length) {
    return '<option value="" disabled>No student users found</option>'
  }

  const selected = new Set(selectedUserIds)
  return students.map(user => `
    <option value="${user.id}" ${selected.has(user.id) ? 'selected' : ''}>${user.email || user.id}</option>
  `).join('')
}

const QUESTION_FORMAT_EXAMPLE = `Q: What is photosynthesis?
A: Making food using sunlight
B: Breathing oxygen
C: Drinking water
D: Moving nutrients
Answer: A

Q: Which planet is known as the Red Planet?
A: Earth
B: Mars
C: Jupiter
D: Venus
Answer: B`

function createEmptyQuestion() {
  return {
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correct: '',
  }
}

function parseQuestionsFromText(text) {
  const lines = text.replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean)
  const questions = []
  let current = null
  let lastField = null

  function ensureQuestion() {
    if (!current) current = createEmptyQuestion()
    return current
  }

  function appendToField(field, value) {
    const question = ensureQuestion()
    question[field] = question[field] ? `${question[field]} ${value}` : value
    lastField = field
  }

  function pushCurrent() {
    if (!current) return
    const missing = []
    if (!current.question) missing.push('question')
    if (!current.optionA) missing.push('A')
    if (!current.optionB) missing.push('B')
    if (!current.optionC) missing.push('C')
    if (!current.optionD) missing.push('D')
    if (!current.correct) missing.push('Answer')

    if (missing.length) {
      throw new Error(`Question ${questions.length + 1} is missing: ${missing.join(', ')}`)
    }

    questions.push(current)
    current = null
    lastField = null
  }

  lines.forEach(line => {
    const questionMatch = line.match(/^(?:(?:q|question)\s*[:.)-]\s*|\d+\s*[.)-]\s+)(.+)$/i)
    if (questionMatch) {
      pushCurrent()
      current = createEmptyQuestion()
      appendToField('question', questionMatch[1])
      return
    }

    const answerMatch = line.match(/^(?:answer|correct|correct answer)\s*[:.)-]?\s*([a-d])\b/i)
    if (answerMatch) {
      ensureQuestion().correct = answerMatch[1].toLowerCase()
      lastField = 'correct'
      return
    }

    const optionMatch = line.match(/^([a-d])\s*[).:-]\s*(.+)$/i)
    if (optionMatch) {
      const field = `option${optionMatch[1].toUpperCase()}`
      appendToField(field, optionMatch[2])
      return
    }

    if (lastField && lastField !== 'correct') {
      appendToField(lastField, line)
    } else {
      appendToField('question', line)
    }
  })

  pushCurrent()
  return questions
}

function renderQuestionPasteForm(testId) {
  return `
    <div class="question-paste-editor mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
      <div class="flex justify-between items-start gap-4 mb-3">
        <div>
          <h4 class="font-semibold text-gray-900">Paste Formatted Questions</h4>
          <p class="text-sm text-gray-500">Paste one or more questions. Separate questions with a blank line.</p>
        </div>
        <button class="close-question-paste-btn btn btn-outline text-sm" type="button">Close</button>
      </div>
      <textarea
        class="question-paste-input input min-h-64 font-mono text-sm"
        data-test-id="${testId}"
        spellcheck="false"
        placeholder="${QUESTION_FORMAT_EXAMPLE}"
      ></textarea>
      <details class="mt-3 text-sm text-gray-600">
        <summary class="cursor-pointer font-medium text-gray-700">Paste format</summary>
        <pre class="mt-2 p-3 bg-white border border-gray-200 rounded overflow-auto text-xs">${QUESTION_FORMAT_EXAMPLE}</pre>
      </details>
      <div class="flex gap-2 mt-4">
        <button class="save-pasted-questions-btn btn btn-primary text-sm" type="button">Add Questions</button>
        <button class="fill-question-example-btn btn btn-outline text-sm" type="button">Use Example</button>
      </div>
    </div>
  `
}

export function initAdminTestsEvents() {
  initAdminShellEvents()

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
                  + Paste Questions
                </button>
              </div>
            `).join('')}
          </div>
        ` : '<p class="text-gray-600">No tests in this chapter</p>'

        testsContainer.querySelectorAll('.manage-test-access-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            const button = event.currentTarget
            const testId = button.dataset.id
            const currentAccessLevel = button.dataset.accessLevel
            const card = button.closest('.card')
            const { data: allowedUsers, error } = await getTestAllowedUsers(testId)

            if (error) {
              showNotification('Failed to load access list: ' + (error.message || ''), 'error')
              return
            }

            const { data: profiles } = await getProfiles()
            const students = profiles?.filter(profile => profile.role !== 'admin') || []

            const selectedUserIds = allowedUsers?.map(row => row.user_id) || []
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
                const id = evt.currentTarget.dataset.id
                const ok = await confirmDialog('Delete this question?')
                if (!ok) return
                const { error } = await deleteQuestion(id)
                if (!error) {
                  showNotification('Question deleted')
                  location.reload()
                } else {
                  showNotification('Failed to delete question', 'error')
                }
              })
            })
          })
        })

        testsContainer.querySelectorAll('.delete-test-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            const id = event.currentTarget.dataset.id
            const ok = await confirmDialog('Delete this test and all its questions?')
            if (!ok) return
            const { error } = await deleteTest(id)
            if (!error) {
              showNotification('Test deleted')
              location.reload()
            } else {
              showNotification('Failed to delete test', 'error')
            }
          })
        })

        testsContainer.querySelectorAll('.add-question-btn').forEach(btn => {
          btn.addEventListener('click', async (event) => {
            const testId = event.currentTarget.dataset.testId
            const card = event.currentTarget.closest('.card')
            const questionsContainer = document.getElementById(`questions-${testId}`)

            let editor = card.querySelector('.question-paste-editor')
            if (editor) {
              editor.remove()
              return
            }

            questionsContainer.insertAdjacentHTML('beforebegin', renderQuestionPasteForm(testId))
            editor = card.querySelector('.question-paste-editor')

            editor.querySelector('.close-question-paste-btn').addEventListener('click', () => editor.remove())
            editor.querySelector('.fill-question-example-btn').addEventListener('click', () => {
              editor.querySelector('.question-paste-input').value = QUESTION_FORMAT_EXAMPLE
            })
            editor.querySelector('.save-pasted-questions-btn').addEventListener('click', async () => {
              const input = editor.querySelector('.question-paste-input')
              let parsedQuestions

              try {
                parsedQuestions = parseQuestionsFromText(input.value)
              } catch (error) {
                showNotification(error.message, 'error')
                return
              }

              if (!parsedQuestions.length) {
                showNotification('Paste at least one formatted question', 'error')
                return
              }

              const saveButton = editor.querySelector('.save-pasted-questions-btn')
              saveButton.disabled = true
              saveButton.textContent = 'Adding...'

              let created = 0
              for (const item of parsedQuestions) {
                const { error } = await createQuestion(
                  testId,
                  item.question,
                  item.optionA,
                  item.optionB,
                  item.optionC,
                  item.optionD,
                  item.correct
                )

                if (error) {
                  saveButton.disabled = false
                  saveButton.textContent = 'Add Questions'
                  showNotification(`Added ${created}, then failed: ${error.message || ''}`, 'error')
                  return
                }
                created += 1
              }

              showNotification(`${created} question${created === 1 ? '' : 's'} added`)
              location.reload()
            })
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
