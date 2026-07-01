import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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
  const { data: { user } } = await supabase.auth.getUser()
  return user
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

export async function getResources(chapterId) {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function createResource(chapterId, title, fileUrl, fileType) {
  const { data, error } = await supabase
    .from('resources')
    .insert([{ chapter_id: chapterId, title, file_url: fileUrl, file_type: fileType }])
    .select()
  return { data, error }
}

export async function deleteResource(id) {
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', id)
  return { error }
}

export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })
  return { data, error }
}

export async function getTests(chapterId) {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
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

export async function createTest(chapterId, title) {
  const { data, error } = await supabase
    .from('tests')
    .insert([{ chapter_id: chapterId, title }])
    .select()
  return { data, error }
}

export async function deleteTest(id) {
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', id)
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

export async function getStudentCount() {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'student')
  return { count: count || 0, error }
}
