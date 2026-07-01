import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getChapters,
  createChapter,
  deleteChapter,
} from '../lib/supabase.js'
import { renderNav, initNavEvents } from '../components/nav.js'
import { showNotification, closeModal, showModal } from '../lib/utils.js'

export async function renderAdminSubjects() {
  const { data: subjects } = await getSubjects()

  return `
    ${renderNav(true)}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900">Subjects</h1>
        <button id="add-subject-btn" class="btn btn-primary">+ Add Subject</button>
      </div>

      <div class="space-y-4">
        ${subjects?.map(subject => `
          <div class="card flex justify-between items-center">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">${subject.name}</h3>
              <p class="text-sm text-gray-600 mt-1">Click to manage chapters</p>
            </div>
            <div class="flex gap-2">
              <button class="expand-subject-btn btn btn-outline text-sm" data-id="${subject.id}">
                Chapters
              </button>
              <button class="edit-subject-btn btn btn-outline text-sm" data-id="${subject.id}">
                Edit
              </button>
              <button class="delete-subject-btn btn btn-danger text-sm" data-id="${subject.id}">
                Delete
              </button>
            </div>
          </div>

          <div id="chapters-${subject.id}" class="hidden pl-8 space-y-2 mb-4">
            <div id="chapters-list-${subject.id}"></div>
            <button class="add-chapter-btn btn btn-secondary text-sm" data-subject-id="${subject.id}">
              + Add Chapter
            </button>
          </div>
        `).join('') || '<p class="text-gray-600">No subjects yet</p>'}
      </div>
    </div>
  `
}

export function initAdminSubjectsEvents() {
  initNavEvents()

  const addSubjectBtn = document.getElementById('add-subject-btn')
  if (addSubjectBtn) {
    addSubjectBtn.addEventListener('click', async () => {
      const name = prompt('Enter subject name:')
      if (name) {
        const { error } = await createSubject(name)
        if (!error) {
          showNotification('Subject created')
          location.reload()
        } else {
          showNotification('Error creating subject', 'error')
        }
      }
    })
  }

  document.querySelectorAll('.edit-subject-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id
      const { data } = await getSubjects()
      const subject = data?.find(s => s.id === id)
      if (!subject) {
        showNotification('Subject not found', 'error')
        return
      }
      const newName = prompt('Edit subject name:', subject.name)
      if (newName && newName !== subject.name) {
        const { error } = await updateSubject(id, newName)
        if (!error) {
          showNotification('Subject updated')
          location.reload()
        } else {
          showNotification('Failed to update subject', 'error')
        }
      }
    })
  })

  document.querySelectorAll('.delete-subject-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm('Delete this subject and all chapters?')) {
        const { error } = await deleteSubject(e.currentTarget.dataset.id)
        if (!error) {
          showNotification('Subject deleted')
          location.reload()
        } else {
          showNotification('Failed to delete subject', 'error')
        }
      }
    })
  })

  document.querySelectorAll('.expand-subject-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const subjectId = e.currentTarget.dataset.id
      const container = document.getElementById(`chapters-${subjectId}`)
      const listContainer = document.getElementById(`chapters-list-${subjectId}`)

      if (container.classList.contains('hidden')) {
        const { data: chapters } = await getChapters(subjectId)
        listContainer.innerHTML = chapters?.map(ch => `
          <div class="card flex justify-between items-center p-4">
            <span class="font-medium text-gray-900">${ch.title}</span>
            <button class="delete-chapter-btn btn btn-danger text-xs" data-id="${ch.id}">
              Delete
            </button>
          </div>
        `).join('') || '<p class="text-gray-600">No chapters</p>'

        listContainer.querySelectorAll('.delete-chapter-btn').forEach(dbtn => {
          dbtn.addEventListener('click', async (event) => {
            if (confirm('Delete this chapter and all resources?')) {
              const { error } = await deleteChapter(event.currentTarget.dataset.id)
              if (!error) {
                showNotification('Chapter deleted')
                location.reload()
              } else {
                showNotification('Failed to delete chapter', 'error')
              }
            }
          })
        })

        container.classList.remove('hidden')
      } else {
        container.classList.add('hidden')
      }
    })
  })

  document.querySelectorAll('.add-chapter-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const subjectId = e.currentTarget.dataset.subjectId
      const title = prompt('Enter chapter title:')
      if (title) {
        const { error } = await createChapter(subjectId, title)
        if (!error) {
          showNotification('Chapter created')
          location.reload()
        } else {
          showNotification('Failed to create chapter', 'error')
        }
      }
    })
  })
}
