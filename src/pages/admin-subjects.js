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
  getSubjectFolders,
  getSubFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  setChapterFolder,
  setBookFolder,
} from '../lib/supabase.js'
import { renderAdminShell, initAdminShellEvents } from '../components/admin-shell.js'
import { showNotification, promptDialog, confirmDialog, formDialog } from '../lib/utils.js'
import defaultFolderLogo from '../assets/default-folder-logo.png'

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
              <button class="expand-folders-btn btn btn-outline text-sm" data-id="${subject.id}">
                Folders
              </button>
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

          <div id="folders-${subject.id}" class="hidden pl-8 space-y-3 mb-4">
            <div id="folders-list-${subject.id}"></div>
            <button class="add-folder-btn btn btn-secondary text-sm" data-subject-id="${subject.id}">
              + Add Folder
            </button>
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

function renderFolderNode(folder) {
  const logo = folder.logo_url || defaultFolderLogo
  return `
    <div class="card" data-folder-node="${folder.id}">
      <div class="flex items-center gap-3 mb-3">
        <img src="${logo}" alt="" class="w-9 h-9 rounded-lg object-cover shrink-0">
        <span class="font-semibold text-gray-900 flex-1 truncate">${folder.name}</span>
        <button class="edit-folder-btn btn btn-outline text-xs" data-id="${folder.id}" data-name="${folder.name}">Edit</button>
        <button class="delete-folder-btn btn btn-danger text-xs" data-id="${folder.id}">Delete</button>
      </div>
      <div class="pl-4 space-y-2" data-folder-contents="${folder.id}"></div>
      <div class="flex flex-wrap gap-2 mt-3 pl-4">
        <button class="add-subfolder-btn btn btn-outline text-xs" data-folder-id="${folder.id}">+ Sub-folder</button>
        <button class="add-chapter-in-folder-btn btn btn-outline text-xs" data-folder-id="${folder.id}">+ Chapter</button>
        <button class="add-book-in-folder-btn btn btn-outline text-xs" data-folder-id="${folder.id}">+ Book</button>
      </div>
    </div>
  `
}

function renderFolderChapterRow(chapter) {
  return `
    <div class="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2" data-folder-chapter="${chapter.id}">
      <span class="text-sm text-gray-800 truncate">📄 ${chapter.title}</span>
      <button class="delete-chapter-btn btn btn-danger text-xs shrink-0" data-id="${chapter.id}">Delete</button>
    </div>
  `
}

function renderFolderBookRow(book) {
  return `
    <div class="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2" data-folder-book="${book.id}">
      <span class="text-sm text-gray-800 truncate">📖 ${book.name}</span>
      <button class="delete-book-btn btn btn-danger text-xs shrink-0" data-id="${book.id}">Delete</button>
    </div>
  `
}

// Loads and wires one folder's contents: its sub-folders (recursively),
// chapters, and books. subjectId is threaded through so "+ Chapter"/"+ Book"
// inside a folder can create items scoped to the right subject.
async function loadFolderContents(folder, subjectId) {
  const container = document.querySelector(`[data-folder-contents="${folder.id}"]`)
  if (!container) return

  const [{ data: subFolders }, { data: chapters }, { data: books }] = await Promise.all([
    getSubFolders(folder.id),
    getChapters(subjectId),
    getBooks(subjectId),
  ])

  const chaptersInFolder = (chapters || []).filter(ch => ch.folder_id === folder.id)
  const booksInFolder = (books || []).filter(b => b.folder_id === folder.id)

  const rows = [
    ...(subFolders || []).map(renderFolderNode),
    ...chaptersInFolder.map(renderFolderChapterRow),
    ...booksInFolder.map(renderFolderBookRow),
  ]
  container.innerHTML = rows.join('') || '<p class="text-xs text-gray-500">Empty folder</p>'

  for (const sub of subFolders || []) {
    wireFolderNode(sub, subjectId)
    await loadFolderContents(sub, subjectId)
  }

  wireFolderRowButtons(container)
}

function wireFolderRowButtons(scope) {
  scope.querySelectorAll('.delete-chapter-btn').forEach(dbtn => {
    dbtn.addEventListener('click', async (event) => {
      const id = event.currentTarget.dataset.id
      const ok = await confirmDialog('This deletes the chapter and all its resources.')
      if (!ok) return
      const { error } = await deleteChapter(id)
      if (!error) {
        showNotification('Chapter deleted')
        location.reload()
      } else {
        showNotification('Failed to delete chapter', 'error')
      }
    })
  })

  scope.querySelectorAll('.delete-book-btn').forEach(dbtn => {
    dbtn.addEventListener('click', async (event) => {
      const id = event.currentTarget.dataset.id
      const ok = await confirmDialog('Delete this book?')
      if (!ok) return
      const { error } = await deleteBook(id)
      if (!error) {
        showNotification('Book deleted')
        location.reload()
      } else {
        showNotification('Failed to delete book', 'error')
      }
    })
  })
}

function wireFolderNode(folder, subjectId) {
  const node = document.querySelector(`[data-folder-node="${folder.id}"]`)
  if (!node) return

  const editBtn = node.querySelector(`.edit-folder-btn[data-id="${folder.id}"]`)
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      const result = await formDialog('Edit Folder', [
        { name: 'name', label: 'Folder name', type: 'text', defaultValue: folder.name },
        { name: 'logo', label: 'New logo (optional)', type: 'file', accept: 'image/*', required: false },
      ], { confirmLabel: 'Save' })
      if (!result) return

      let logoUrl
      if (result.logo) {
        const safeName = result.logo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${Date.now()}-${safeName}`
        const { error: upErr } = await uploadFile('folder-logos', path, result.logo)
        if (upErr) {
          showNotification('Logo upload failed: ' + (upErr.message || ''), 'error')
          return
        }
        logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/folder-logos/${path}`
      }

      const { error } = await updateFolder(folder.id, { name: result.name, logoUrl })
      if (error) {
        showNotification('Failed to update folder: ' + (error.message || ''), 'error')
      } else {
        showNotification('Folder updated')
        location.reload()
      }
    })
  }

  const deleteBtn = node.querySelector(`.delete-folder-btn[data-id="${folder.id}"]`)
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const ok = await confirmDialog('This deletes the folder. Sub-folders are deleted too; chapters/books inside are kept, just unassigned.')
      if (!ok) return
      const { error } = await deleteFolder(folder.id)
      if (error) {
        showNotification('Failed to delete folder: ' + (error.message || ''), 'error')
      } else {
        showNotification('Folder deleted')
        location.reload()
      }
    })
  }

  const addSubfolderBtn = node.querySelector(`.add-subfolder-btn[data-folder-id="${folder.id}"]`)
  if (addSubfolderBtn) {
    addSubfolderBtn.addEventListener('click', async () => {
      const result = await formDialog('Add Sub-folder', [
        { name: 'name', label: 'Folder name', type: 'text', placeholder: 'e.g., Term 1' },
        { name: 'logo', label: 'Folder logo (optional)', type: 'file', accept: 'image/*', required: false },
      ], { confirmLabel: 'Create' })
      if (!result) return

      let logoUrl = null
      if (result.logo) {
        const safeName = result.logo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${Date.now()}-${safeName}`
        const { error: upErr } = await uploadFile('folder-logos', path, result.logo)
        if (upErr) {
          showNotification('Logo upload failed: ' + (upErr.message || ''), 'error')
          return
        }
        logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/folder-logos/${path}`
      }

      const { error } = await createFolder({ parentFolderId: folder.id, name: result.name, logoUrl })
      if (error) {
        showNotification('Failed to create sub-folder: ' + (error.message || ''), 'error')
      } else {
        showNotification('Sub-folder created')
        location.reload()
      }
    })
  }

  const addChapterBtn = node.querySelector(`.add-chapter-in-folder-btn[data-folder-id="${folder.id}"]`)
  if (addChapterBtn) {
    addChapterBtn.addEventListener('click', async () => {
      const title = await promptDialog('Enter chapter title', { placeholder: 'e.g., Chapter 1', confirmLabel: 'Create' })
      if (!title) return
      const { data, error } = await createChapter(subjectId, title)
      const newChapter = data?.[0]
      if (error || !newChapter) {
        showNotification('Failed to create chapter', 'error')
        return
      }
      const { error: assignError } = await setChapterFolder(newChapter.id, folder.id)
      if (assignError) {
        showNotification('Chapter created, but failed to place it in the folder', 'error')
      } else {
        showNotification('Chapter created')
      }
      location.reload()
    })
  }

  const addBookBtn = node.querySelector(`.add-book-in-folder-btn[data-folder-id="${folder.id}"]`)
  if (addBookBtn) {
    addBookBtn.addEventListener('click', async () => {
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

      const { data: bookData, error } = await createBook(subjectId, result.name, fileUrl, result.file.type, coverUrl)
      const newBook = bookData?.[0]
      if (error || !newBook) {
        showNotification('Failed to add book: ' + (error?.message || ''), 'error')
        return
      }
      const { error: assignError } = await setBookFolder(newBook.id, folder.id)
      if (assignError) {
        showNotification('Book added, but failed to place it in the folder', 'error')
      } else {
        showNotification('Book added')
      }
      location.reload()
    })
  }
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
      const id = e.currentTarget.dataset.id
      const ok = await confirmDialog('This deletes the subject and all its chapters, books and resources.')
      if (!ok) return
      const { error } = await deleteSubject(id)
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
        const { data: allChapters } = await getChapters(subjectId)
        const chapters = allChapters?.filter(ch => !ch.folder_id)
        listContainer.innerHTML = chapters?.map(ch => `
          <div class="card flex justify-between items-center p-4">
            <span class="font-medium text-gray-900">${ch.title}</span>
            <button class="delete-chapter-btn btn btn-danger text-xs" data-id="${ch.id}">
              Delete
            </button>
          </div>
        `).join('') || '<p class="text-gray-600">No ungrouped chapters (chapters inside folders show under Folders)</p>'

        listContainer.querySelectorAll('.delete-chapter-btn').forEach(dbtn => {
          dbtn.addEventListener('click', async (event) => {
            const id = event.currentTarget.dataset.id
            const ok = await confirmDialog('This deletes the chapter and all its resources.')
            if (!ok) return
            const { error } = await deleteChapter(id)
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

  document.querySelectorAll('.expand-folders-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const subjectId = e.currentTarget.dataset.id
      const container = document.getElementById(`folders-${subjectId}`)
      const listContainer = document.getElementById(`folders-list-${subjectId}`)

      if (container.classList.contains('hidden')) {
        const { data: folders } = await getSubjectFolders(subjectId)
        listContainer.innerHTML = folders?.length
          ? folders.map(renderFolderNode).join('')
          : '<p class="text-gray-600 text-sm">No folders yet. Folders let you group chapters and books (e.g. "Term 1", "Reference Material").</p>'

        for (const folder of folders || []) {
          wireFolderNode(folder, subjectId)
          await loadFolderContents(folder, subjectId)
        }

        container.classList.remove('hidden')
      } else {
        container.classList.add('hidden')
      }
    })
  })

  document.querySelectorAll('.add-folder-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const subjectId = e.currentTarget.dataset.subjectId
      const result = await formDialog('Add Folder', [
        { name: 'name', label: 'Folder name', type: 'text', placeholder: 'e.g., Term 1, Reference Material' },
        { name: 'logo', label: 'Folder logo (optional)', type: 'file', accept: 'image/*', required: false },
      ], { confirmLabel: 'Create' })
      if (!result) return

      let logoUrl = null
      if (result.logo) {
        const safeName = result.logo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${Date.now()}-${safeName}`
        const { error: upErr } = await uploadFile('folder-logos', path, result.logo)
        if (upErr) {
          showNotification('Logo upload failed: ' + (upErr.message || ''), 'error')
          return
        }
        logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/folder-logos/${path}`
      }

      const { error } = await createFolder({ subjectId, name: result.name, logoUrl })
      if (error) {
        showNotification('Failed to create folder: ' + (error.message || ''), 'error')
      } else {
        showNotification('Folder created')
        location.reload()
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
  const { data: allBooks } = await getBooks(subjectId)
  const books = allBooks?.filter(b => !b.folder_id)
  listContainer.innerHTML = books?.length
    ? books.map(renderBookCard).join('')
    : '<p class="text-gray-600">No ungrouped books (books inside folders show under Folders)</p>'

  listContainer.querySelectorAll('.delete-book-btn').forEach(dbtn => {
    dbtn.addEventListener('click', async (event) => {
      const id = event.currentTarget.dataset.id
      const ok = await confirmDialog('Delete this book?')
      if (!ok) return
      const { error } = await deleteBook(id)
      if (!error) {
        showNotification('Book deleted')
        loadBooks(subjectId, listContainer)
      } else {
        showNotification('Failed to delete book', 'error')
      }
    })
  })
}
