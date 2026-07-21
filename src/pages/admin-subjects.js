import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getChapters,
  createChapter,
  deleteChapter,
  getBooks,
  createBook,
  deleteBook,
  uploadFile,
} from '../lib/supabase.js'
import { renderAdminShell, initAdminShellEvents } from '../components/admin-shell.js'
import { showNotification, promptDialog, confirmDialog, formDialog } from '../lib/utils.js'

export async function renderAdminSubjects() {
  const { data: subjects } = await getSubjects()

  return renderAdminShell('/admin/subjects', `
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
              <p class="text-sm text-gray-600 mt-1">Click to manage chapters or books</p>
            </div>
            <div class="flex gap-2">
              <button class="expand-books-btn btn btn-outline text-sm" data-id="${subject.id}">
                Books
              </button>
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

          <div id="books-${subject.id}" class="hidden pl-8 space-y-2 mb-4">
            <div id="books-list-${subject.id}"></div>
            <button class="add-book-btn btn btn-secondary text-sm" data-subject-id="${subject.id}">
              + Add Book
            </button>
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
  `)
}

function renderBookCard(book) {
  return `
    <div class="card flex items-center gap-3 p-4">
      ${book.cover_url
        ? `<img src="${book.cover_url}" alt="" class="w-10 h-14 rounded object-cover shrink-0">`
        : `<span class="w-10 h-14 rounded bg-brand-50 text-brand-600 flex items-center justify-center text-xl shrink-0">📖</span>`}
      <div class="flex-1 min-w-0">
        <span class="font-medium text-gray-900 truncate block">${book.name}</span>
        <a href="${book.file_url}" target="_blank" class="text-xs text-brand-600 hover:underline">View file</a>
      </div>
      <button class="delete-book-btn btn btn-danger text-xs shrink-0" data-id="${book.id}">
        Delete
      </button>
    </div>
  `
}

export function initAdminSubjectsEvents() {
  initAdminShellEvents()

  const addSubjectBtn = document.getElementById('add-subject-btn')
  if (addSubjectBtn) {
    addSubjectBtn.addEventListener('click', async () => {
      const name = await promptDialog('Enter subject name', { placeholder: 'e.g., Mathematics', confirmLabel: 'Create' })
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
      const newName = await promptDialog('Edit subject name', { defaultValue: subject.name, confirmLabel: 'Save' })
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
      const ok = await confirmDialog('This deletes the subject and all its chapters, books and resources.')
      if (!ok) return
      const { error } = await deleteSubject(e.currentTarget.dataset.id)
      if (!error) {
        showNotification('Subject deleted')
        location.reload()
      } else {
        showNotification('Failed to delete subject', 'error')
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
            const ok = await confirmDialog('This deletes the chapter and all its resources.')
            if (!ok) return
            const { error } = await deleteChapter(event.currentTarget.dataset.id)
            if (!error) {
              showNotification('Chapter deleted')
              location.reload()
            } else {
              showNotification('Failed to delete chapter', 'error')
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
      const title = await promptDialog('Enter chapter title', { placeholder: 'e.g., Chapter 1', confirmLabel: 'Create' })
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

  document.querySelectorAll('.expand-books-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const subjectId = e.currentTarget.dataset.id
      const container = document.getElementById(`books-${subjectId}`)
      const listContainer = document.getElementById(`books-list-${subjectId}`)

      if (container.classList.contains('hidden')) {
        await loadBooks(subjectId, listContainer)
        container.classList.remove('hidden')
      } else {
        container.classList.add('hidden')
      }
    })
  })

  document.querySelectorAll('.add-book-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const subjectId = e.currentTarget.dataset.subjectId
      const result = await formDialog('Add Book', [
        { name: 'name', label: 'Book name', type: 'text', placeholder: 'e.g., NCERT Mathematics' },
        { name: 'file', label: 'Book file (PDF)', type: 'file', accept: '.pdf,.docx,.pptx' },
        { name: 'cover', label: 'Cover image (optional)', type: 'file', accept: 'image/*', required: false },
      ], { confirmLabel: 'Add Book' })
      if (!result) return

      showNotification('Uploading...', 'info')

      const safeFileName = result.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `books/${Date.now()}-${safeFileName}`
      const { error: fileUploadError } = await uploadFile('resources', filePath, result.file)
      if (fileUploadError) {
        showNotification('Book file upload failed: ' + (fileUploadError.message || ''), 'error')
        return
      }
      const fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/resources/${filePath}`

      let coverUrl = null
      if (result.cover) {
        const safeCoverName = result.cover.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const coverPath = `${Date.now()}-${safeCoverName}`
        const { error: coverUploadError } = await uploadFile('book-covers', coverPath, result.cover)
        if (coverUploadError) {
          showNotification('Cover upload failed: ' + (coverUploadError.message || ''), 'error')
          return
        }
        coverUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/book-covers/${coverPath}`
      }

      const { error } = await createBook(subjectId, result.name, fileUrl, result.file.type, coverUrl)
      if (error) {
        showNotification('Failed to add book: ' + (error.message || ''), 'error')
      } else {
        showNotification('Book added')
        loadBooks(subjectId, document.getElementById(`books-list-${subjectId}`))
      }
    })
  })
}

async function loadBooks(subjectId, listContainer) {
  const { data: books } = await getBooks(subjectId)
  listContainer.innerHTML = books?.length
    ? books.map(renderBookCard).join('')
    : '<p class="text-gray-600">No books yet</p>'

  listContainer.querySelectorAll('.delete-book-btn').forEach(dbtn => {
    dbtn.addEventListener('click', async (event) => {
      const ok = await confirmDialog('Delete this book?')
      if (!ok) return
      const { error } = await deleteBook(event.currentTarget.dataset.id)
      if (!error) {
        showNotification('Book deleted')
        loadBooks(subjectId, listContainer)
      } else {
        showNotification('Failed to delete book', 'error')
      }
    })
  })
}
