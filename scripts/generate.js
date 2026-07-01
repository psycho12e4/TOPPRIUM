/**
 * Scheduled AI content generator for TOPPRIUM.
 *
 * Runs OUTSIDE the browser (locally via `node scripts/generate.js` or in
 * GitHub Actions). For each eligible chapter it asks OpenAI to draft a
 * practice test (MCQs) and study notes, renders the notes to a PDF, uploads
 * the PDF to Supabase Storage, and inserts everything as `status: 'pending',
 * source: 'ai'` so nothing reaches students until an admin approves it in
 * the /admin/review page. Finishes by emailing a review summary via Resend.
 *
 * Requires (env / .env locally, GitHub Secrets in CI):
 *   OPENAI_API_KEY, OPENAI_MODEL (optional, default gpt-4o-mini)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   <- service role, bypasses RLS
 *   STORAGE_BUCKET (optional, default 'resources')
 *   RESEND_API_KEY, REVIEW_NOTIFY_EMAIL, REVIEW_FROM_EMAIL, SITE_URL (email step)
 *   MAX_CHAPTERS_PER_RUN (optional, default 3)   <- cost/spam guardrail
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import PDFDocument from 'pdfkit'
import { Resend } from 'resend'

const {
  OPENAI_API_KEY,
  OPENAI_MODEL = 'gpt-4o-mini',
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  STORAGE_BUCKET = 'resources',
  RESEND_API_KEY,
  REVIEW_NOTIFY_EMAIL,
  REVIEW_FROM_EMAIL = 'onboarding@resend.dev',
  SITE_URL = '',
  MAX_CHAPTERS_PER_RUN = '3',
  // Comma-separated chapter UUIDs to target explicitly. When set, ONLY these
  // chapters are generated for (gap-check bypassed). When empty, the script
  // auto-picks chapters that have no test yet.
  TARGET_CHAPTER_IDS = '',
} = process.env

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
}
requireEnv('OPENAI_API_KEY', OPENAI_API_KEY)
requireEnv('SUPABASE_URL', SUPABASE_URL)
requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })
const maxChapters = Math.max(1, parseInt(MAX_CHAPTERS_PER_RUN, 10) || 3)
const targetChapterIds = TARGET_CHAPTER_IDS.split(',').map(s => s.trim()).filter(Boolean)

// --- OpenAI helpers ---------------------------------------------------------

async function generateTest(subjectName, chapterTitle) {
  const prompt = `You are creating a multiple-choice practice test for students.
Subject: "${subjectName}". Chapter: "${chapterTitle}".
Return JSON only, matching exactly this shape:
{
  "title": "string, a concise test title",
  "questions": [
    { "question": "string", "option_a": "string", "option_b": "string",
      "option_c": "string", "option_d": "string", "correct_answer": "a|b|c|d" }
  ]
}
Generate 5 questions. "correct_answer" MUST be one of the lowercase letters a, b, c, or d.`

  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  })
  const parsed = JSON.parse(res.choices[0].message.content)
  // Validate to protect the DB check constraint (correct_answer in a/b/c/d).
  const questions = (parsed.questions || []).filter(q =>
    q.question && q.option_a && q.option_b && q.option_c && q.option_d &&
    ['a', 'b', 'c', 'd'].includes((q.correct_answer || '').toLowerCase().trim())
  ).map(q => ({ ...q, correct_answer: q.correct_answer.toLowerCase().trim() }))
  if (!questions.length) throw new Error('No valid questions returned')
  return { title: parsed.title || `${chapterTitle} Practice Test`, questions }
}

async function generateNotes(subjectName, chapterTitle) {
  const prompt = `Write concise, well-structured study notes for students.
Subject: "${subjectName}". Chapter: "${chapterTitle}".
Plain text with short paragraphs and bullet points (use "- " for bullets).
Aim for roughly 400-600 words. Do not use markdown headers with #.`
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
  })
  return res.choices[0].message.content.trim()
}

// --- PDF rendering ----------------------------------------------------------

function notesToPdfBuffer(title, notes) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(20).text(title, { underline: false })
    doc.moveDown()
    doc.fontSize(12)
    for (const line of notes.split('\n')) {
      if (line.trim() === '') { doc.moveDown(0.5); continue }
      doc.text(line, { align: 'left' })
    }
    doc.end()
  })
}

// --- Main -------------------------------------------------------------------

async function chapterHasPendingAiTest(chapterId) {
  const { data } = await supabase
    .from('tests')
    .select('id')
    .eq('chapter_id', chapterId)
    .eq('status', 'pending')
    .eq('source', 'ai')
    .limit(1)
  return !!(data && data.length)
}

async function chapterHasAnyTest(chapterId) {
  const { data } = await supabase
    .from('tests').select('id').eq('chapter_id', chapterId).limit(1)
  return !!(data && data.length)
}

async function processChapter(chapter, subjectName) {
  const label = `${subjectName} › ${chapter.title}`
  const summary = { chapter: label, test: null, resource: null }

  // Test + questions
  const { title, questions } = await generateTest(subjectName, chapter.title)
  const { data: testRows, error: testErr } = await supabase
    .from('tests')
    .insert([{ chapter_id: chapter.id, title, status: 'pending', source: 'ai' }])
    .select()
  if (testErr) throw testErr
  const test = testRows[0]
  const { error: qErr } = await supabase.from('questions').insert(
    questions.map(q => ({
      test_id: test.id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
    }))
  )
  if (qErr) throw qErr
  summary.test = `${title} (${questions.length} questions)`

  // Study notes -> PDF -> Storage -> resource
  const notes = await generateNotes(subjectName, chapter.title)
  const pdf = await notesToPdfBuffer(`${chapter.title} — Study Notes`, notes)
  const path = `ai/${chapter.id}/${test.id}-notes.pdf`
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, pdf, { contentType: 'application/pdf', upsert: true })
  if (upErr) throw upErr
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  const { error: rErr } = await supabase.from('resources').insert([{
    chapter_id: chapter.id,
    title: `${chapter.title} — Study Notes`,
    file_url: pub.publicUrl,
    file_type: 'application/pdf',
    status: 'pending',
    source: 'ai',
  }])
  if (rErr) throw rErr
  summary.resource = `${chapter.title} — Study Notes (PDF)`

  return summary
}

async function sendSummaryEmail(results, errors) {
  if (!RESEND_API_KEY || !REVIEW_NOTIFY_EMAIL) {
    console.log('Email skipped (RESEND_API_KEY / REVIEW_NOTIFY_EMAIL not set).')
    return
  }
  const resend = new Resend(RESEND_API_KEY)
  const reviewLink = SITE_URL ? `${SITE_URL.replace(/\/$/, '')}/admin/review` : '/admin/review'
  const items = results.map(r =>
    `<li><strong>${r.chapter}</strong>: ${r.test || '—'}${r.resource ? ' + PDF notes' : ''}</li>`
  ).join('')
  const errorBlock = errors.length
    ? `<p><strong>Errors (${errors.length}):</strong></p><ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>`
    : ''
  await resend.emails.send({
    from: REVIEW_FROM_EMAIL,
    to: REVIEW_NOTIFY_EMAIL,
    subject: `TOPPRIUM: ${results.length} item(s) awaiting review`,
    html: `<h2>New AI-generated content awaiting your review</h2>
      <ul>${items || '<li>Nothing generated this run.</li>'}</ul>
      ${errorBlock}
      <p><a href="${reviewLink}">Open the review queue →</a></p>`,
  })
  console.log('Summary email sent.')
}

// Build the list of chapters to generate for, each with its subject name.
async function selectChapters() {
  let query = supabase.from('chapters').select('*, subjects(name)')
  if (targetChapterIds.length) query = query.in('id', targetChapterIds)
  const { data: chapters, error } = await query
  if (error) throw error
  if (targetChapterIds.length) {
    console.log(`Targeting ${chapters?.length || 0} explicitly chosen chapter(s).`)
    return chapters || []
  }
  // Auto mode: only chapters with no test yet (fill gaps).
  const gaps = []
  for (const ch of chapters || []) {
    if (!(await chapterHasAnyTest(ch.id))) gaps.push(ch)
  }
  console.log(`Auto mode: ${gaps.length} chapter(s) without a test.`)
  return gaps
}

async function main() {
  const candidates = await selectChapters()
  const results = []
  const errors = []
  let processed = 0

  for (const chapter of candidates) {
    if (processed >= maxChapters) break
    const subjectName = chapter.subjects?.name || 'Unknown subject'
    // Always skip chapters with a pending AI draft — don't pile up duplicates.
    if (await chapterHasPendingAiTest(chapter.id)) {
      console.log(`Skipping (pending draft exists): ${subjectName} › ${chapter.title}`)
      continue
    }
    try {
      console.log(`Generating for: ${subjectName} › ${chapter.title}`)
      results.push(await processChapter(chapter, subjectName))
      processed++
    } catch (e) {
      const msg = `${subjectName} › ${chapter.title}: ${e.message || e}`
      console.error('  Failed:', msg)
      errors.push(msg)
    }
  }
  if (processed >= maxChapters && candidates.length > processed) {
    console.log(`Note: hit MAX_CHAPTERS_PER_RUN (${maxChapters}); ${candidates.length - processed} candidate(s) left for next run.`)
  }

  console.log(`\nDone. Generated ${results.length} item set(s), ${errors.length} error(s).`)
  await sendSummaryEmail(results, errors)
  if (errors.length && !results.length) process.exit(1)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
