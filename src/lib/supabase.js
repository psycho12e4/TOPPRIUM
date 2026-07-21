import { createClient } from '@supabase/supabase-js'

const FALLBACK_SUPABASE_URL = 'https://bzrxgolyrmgpxlzwxnzz.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_eEm04nECSLtVyzj3ZDdMUA_1RJex0P8'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY
const SUPABASE_PROJECT_REF = (() => {
  try {
    return new URL(SUPABASE_URL).hostname.split('.')[0]
  } catch {
    return ''
  }
})()

function clearStoredAuth() {
  localStorage.removeItem('userId')

  if (!SUPABASE_PROJECT_REF) return

  const authStorageKey = `sb-${SUPABASE_PROJECT_REF}-auth-token`
  localStorage.removeItem(authStorageKey)
}

function withTimeout(promise, ms, message) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Use this instead of reading import.meta.env.VITE_SUPABASE_URL directly —
// that env var is often unset at runtime, which previously produced broken
// "undefined/storage/..." URLs for uploaded files.
export { SUPABASE_URL }

export function getPublicUrl(bucket, path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password })
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getCurrentUser() {
  try {
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      3000,
      'Supabase auth is not responding'
    )
    return user
  } catch (e) {
    clearStoredAuth()
    console.error('Could not restore Supabase session:', e)
    return null
  }
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function getSubject(id) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function getBooks(subjectId) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function createBook(subjectId, name, fileUrl, fileType, coverUrl = null) {
  const { data, error } = await supabase
    .from('books')
    .insert([{ subject_id: subjectId, name, file_url: fileUrl, file_type: fileType, cover_url: coverUrl }])
    .select()
  return { data, error }
}

export async function updateBook(id, { name, coverUrl } = {}) {
  const patch = {}
  if (name !== undefined) patch.name = name
  if (coverUrl !== undefined) patch.cover_url = coverUrl
  const { data, error } = await supabase
    .from('books')
    .update(patch)
    .eq('id', id)
    .select()
  return { data, error }
}

export async function deleteBook(id) {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id)
  return { error }
}

export async function createSubject(name) {
  const { data, error } = await supabase
    .from('subjects')
    .insert([{ name }])
    .select()
  return { data, error }
}

export async function updateSubject(id, name) {
  const { data, error } = await supabase
    .from('subjects')
    .update({ name })
    .eq('id', id)
    .select()
  return { data, error }
}

export async function deleteSubject(id) {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id)
  return { error }
}

export async function getChapters(subjectId) {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function getChapter(id) {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function createChapter(subjectId, title) {
  const { data, error } = await supabase
    .from('chapters')
    .insert([{ subject_id: subjectId, title }])
    .select()
  return { data, error }
}

export async function updateChapter(id, title) {
  const { data, error } = await supabase
    .from('chapters')
    .update({ title })
    .eq('id', id)
    .select()
  return { data, error }
}

export async function deleteChapter(id) {
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', id)
  return { error }
}

export async function getResources(chapterId, { includeAll = false } = {}) {
  let query = supabase
    .from('resources')
    .select('*')
    .eq('chapter_id', chapterId)
  if (!includeAll) query = query.eq('status', 'published')
  const { data, error } = await query.order('created_at', { ascending: false })
  return { data, error }
}

export async function createResource(chapterId, title, fileUrl, fileType, { accessLevel = 'everyone', userIds = [] } = {}) {
  const { data, error } = await supabase.rpc('admin_create_resource', {
    p_chapter_id: chapterId,
    p_title: title,
    p_file_url: fileUrl,
    p_file_type: fileType,
    p_access_level: accessLevel,
    p_user_ids: userIds,
  })
  return { data, error }
}

export async function deleteResource(id) {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id)
  return { error }
}

// Folders scoped to a chapter (groups the chapter's resources).
export async function getFolders(chapterId) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Top-level folders scoped to a subject (groups the subject's chapters/books).
export async function getSubjectFolders(subjectId) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// Sub-folders nested inside another folder (any scope).
export async function getSubFolders(parentFolderId) {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('parent_folder_id', parentFolderId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// A folder belongs to exactly one of chapterId, subjectId, or parentFolderId.
export async function createFolder({ chapterId = null, subjectId = null, parentFolderId = null, name, logoUrl = null }) {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ chapter_id: chapterId, subject_id: subjectId, parent_folder_id: parentFolderId, name, logo_url: logoUrl }])
    .select()
  return { data, error }
}

export async function setChapterFolder(chapterId, folderId) {
  const { data, error } = await supabase
    .from('chapters')
    .update({ folder_id: folderId })
    .eq('id', chapterId)
    .select()
  return { data, error }
}

export async function setBookFolder(bookId, folderId) {
  const { data, error } = await supabase
    .from('books')
    .update({ folder_id: folderId })
    .eq('id', bookId)
    .select()
  return { data, error }
}

export async function updateFolder(id, { name, logoUrl } = {}) {
  const patch = {}
  if (name !== undefined) patch.name = name
  if (logoUrl !== undefined) patch.logo_url = logoUrl
  const { data, error } = await supabase
    .from('folders')
    .update(patch)
    .eq('id', id)
    .select()
  return { data, error }
}

export async function deleteFolder(id) {
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', id)
  return { error }
}

// Assign (or unassign, with folderId = null) a resource to a folder.
export async function setResourceFolder(resourceId, folderId) {
  const { data, error } = await supabase
    .from('resources')
    .update({ folder_id: folderId })
    .eq('id', resourceId)
    .select()
  return { data, error }
}

export async function getResourceAllowedUsers(resourceId) {
  const { data, error } = await supabase
    .from('resource_allowed_users')
    .select('user_id')
    .eq('resource_id', resourceId)
  return { data, error }
}

export async function updateResourceAccess(resourceId, { accessLevel = 'everyone', userIds = [] } = {}) {
  const { error } = await supabase.rpc('admin_update_resource_access', {
    p_resource_id: resourceId,
    p_access_level: accessLevel,
    p_user_ids: userIds,
  })
  return { error }
}

export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })
  return { data, error }
}

export async function getTests(chapterId, { includeAll = false } = {}) {
  let query = supabase
    .from('tests')
    .select('*')
    .eq('chapter_id', chapterId)
  if (!includeAll) query = query.eq('status', 'published')
  const { data, error } = await query.order('created_at', { ascending: false })
  return { data, error }
}

export async function getTest(id) {
  const { data, error } = await supabase
    .from('tests')
    .select('*, questions(*)')
    .eq('id', id)
    .single()
  return { data, error }
}

// Returns title-only metadata for every published test in a chapter, including
// ones the caller cannot access (marked locked), so the UI can show a locked
// card instead of hiding the item. Content stays gated server-side.
export async function getChapterTestsPreview(chapterId) {
  const { data, error } = await supabase.rpc('list_chapter_tests_preview', {
    p_chapter_id: chapterId,
  })
  return { data, error }
}

// Same as getChapterTestsPreview but for resources. file_url comes back null
// for locked rows (the RPC withholds it), so locked cards never link out.
export async function getChapterResourcesPreview(chapterId) {
  const { data, error } = await supabase.rpc('list_chapter_resources_preview', {
    p_chapter_id: chapterId,
  })
  return { data, error }
}

export async function createTest(chapterId, title, { accessLevel = 'everyone', userIds = [] } = {}) {
  const { data, error } = await supabase.rpc('admin_create_test', {
    p_chapter_id: chapterId,
    p_title: title,
    p_access_level: accessLevel,
    p_user_ids: userIds,
  })
  return { data, error }
}

export async function deleteTest(id) {
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', id)
  return { error }
}

export async function getTestAllowedUsers(testId) {
  const { data, error } = await supabase
    .from('test_allowed_users')
    .select('user_id')
    .eq('test_id', testId)
  return { data, error }
}

export async function updateTestAccess(testId, { accessLevel = 'everyone', userIds = [] } = {}) {
  const { error } = await supabase.rpc('admin_update_test_access', {
    p_test_id: testId,
    p_access_level: accessLevel,
    p_user_ids: userIds,
  })
  return { error }
}

export async function createQuestion(testId, question, optionA, optionB, optionC, optionD, correctAnswer) {
  const { data, error } = await supabase
    .from('questions')
    .insert([{
      test_id: testId,
      question,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_answer: correctAnswer
    }])
    .select()
  return { data, error }
}

export async function deleteQuestion(id) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
  return { error }
}

export async function getQuestions(testId) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('test_id', testId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function saveTestScore(userId, testId, score, totalQuestions) {
  const { data, error } = await supabase
    .from('test_scores')
    .insert([{ user_id: userId, test_id: testId, score, total_questions: totalQuestions }])
    .select()
  return { data, error }
}

export async function getUserTestScores(userId) {
  const { data, error } = await supabase
    .from('test_scores')
    .select('*, tests(title), chapters(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// ---- Review queue (admin) --------------------------------------------
// Pending AI-generated content awaiting approval. Admins can read these
// thanks to the RLS policies added in supabase/add_review_status.sql.
export async function getPendingTests() {
  const { data, error } = await supabase
    .from('tests')
    .select('*, questions(*), chapters(title, subjects(name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function getPendingResources() {
  const { data, error } = await supabase
    .from('resources')
    .select('*, chapters(title, subjects(name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  return { data, error }
}

// status must be one of 'published' | 'rejected' (approve / reject).
export async function updateTestStatus(id, status) {
  const { data, error } = await supabase
    .from('tests')
    .update({ status })
    .eq('id', id)
    .select()
  return { data, error }
}

export async function updateResourceStatus(id, status) {
  const { data, error } = await supabase
    .from('resources')
    .update({ status })
    .eq('id', id)
    .select()
  return { data, error }
}

export async function getStudentCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'student')
  return { count: count || 0, error }
}

export async function getProfiles() {
  const result = await supabase
    .from('profiles')
    .select('id, email, role')
    .order('email', { ascending: true, nullsFirst: false })

  if (!result.error) return result

  const fallback = await supabase
    .from('profiles')
    .select('id, role')
    .order('created_at', { ascending: false })

  if (fallback.error) return result

  return {
    data: fallback.data?.map(profile => ({ ...profile, email: null })) || [],
    error: null,
  }
}

export async function createComplaint(email, message, userId = null) {
  const { data, error } = await supabase
    .from('complaints')
    .insert([{ email, message, user_id: userId }])
    .select()
  return { data, error }
}

export async function getComplaints() {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

// status must be one of 'open' | 'resolved'.
export async function updateComplaintStatus(id, status) {
  const { data, error } = await supabase
    .from('complaints')
    .update({ status })
    .eq('id', id)
    .select()
  return { data, error }
}

export async function createCourseRequest(name, studentClass, email, courseName = null, userId = null) {
  const { data, error } = await supabase
    .from('course_requests')
    .insert([{ name, student_class: studentClass, email, course_name: courseName, user_id: userId }])
    .select()
  return { data, error }
}

export async function getCourseRequests() {
  const { data, error } = await supabase
    .from('course_requests')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

// status must be one of 'open' | 'resolved'.
export async function updateCourseRequestStatus(id, status) {
  const { data, error } = await supabase
    .from('course_requests')
    .update({ status })
    .eq('id', id)
    .select()
  return { data, error }
}

// Sign in using a Google ID token (from Google Identity Services). Returns
// the supabase auth result. Implementation uses the client method
// `signInWithIdToken` provided by the Supabase JS SDK.
export async function signInWithGoogleIdToken(idToken) {
  if (!idToken) throw new Error('Missing id token')
  return supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
}
