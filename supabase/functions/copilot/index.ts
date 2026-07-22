// TOPPRIUM Copilot — Supabase Edge Function (Deno)
//
// A thin, auth-gated proxy in front of an OpenAI-compatible chat API (DeepSeek,
// Google Gemini, Groq, OpenRouter, …). The API key is a Supabase secret and
// NEVER reaches the browser — the client only ever talks to this function,
// authenticated with the caller's Supabase session JWT.
//
// Responsibilities:
//   1. Verify the caller has a valid Supabase session (rejects anonymous).
//   2. Look up their role from `profiles` (student | admin).
//   3. Pick a role- and mode-appropriate system prompt.
//   4. Enforce that admin-only modes require an admin account.
//   5. Stream the model's reply back to the client as Server-Sent Events.
//
// Deploy:  supabase functions deploy copilot
// Secrets (provider-neutral names, with legacy DEEPSEEK_* fallbacks):
//   AI_API_KEY   — the provider API key            (required)
//   AI_BASE_URL  — OpenAI-compatible base URL       (default DeepSeek)
//   AI_MODEL     — model id                         (default deepseek-chat)
//
//   Google Gemini free tier, for example:
//     AI_BASE_URL = https://generativelanguage.googleapis.com/v1beta/openai
//     AI_MODEL    = gemini-2.0-flash
//
// Any OpenAI-compatible provider works with zero code changes — only these
// three secrets differ.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Provider-neutral env, falling back to the original DEEPSEEK_* names so
// existing deployments keep working whichever secret names are set.
// .trim() guards against trailing newlines/spaces that dashboard secret
// inputs commonly append when values are pasted — an untrimmed "\n" in the
// model name or base URL silently breaks every request.
const env = (...names: string[]) => {
  for (const n of names) {
    const v = Deno.env.get(n)
    if (v) return v.trim()
  }
  return ''
}

const AI_BASE_URL = env('AI_BASE_URL', 'DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'
const AI_MODEL = env('AI_MODEL', 'DEEPSEEK_MODEL') || 'deepseek-chat'
const AI_API_KEY = env('AI_API_KEY', 'DEEPSEEK_API_KEY')

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

// Keep replies snappy and costs bounded.
const MAX_HISTORY_MESSAGES = 20
const MAX_CHARS_PER_MESSAGE = 6000
const MAX_TOKENS = 1200

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------------------------------------------------------------------------
// System prompts. The student tutor is deliberately scoped; the admin modes
// are content-authoring helpers. `mode` selects one; admin-only modes are
// rejected for non-admins server-side (a hostile client can't bypass this).
// ---------------------------------------------------------------------------

const SHARED_RULES = `You are the TOPPRIUM Copilot, an assistant on TOPPRIUM — an online learning platform for Class IX (grade 9) students in India. Format answers in clean Markdown: short paragraphs, bullet lists, and fenced code blocks where useful. Be concise and encouraging. Never invent facts about a student's account, grades, or files you were not given.`

const STUDENT_PROMPT = `${SHARED_RULES}

You are talking to a **Class IX student**. Your job has two parts:

1. **Study tutor.** Explain concepts clearly at a Class IX level across their subjects (Maths, Science, English, Social Science, etc.). Break problems into steps, give worked examples, check understanding, and offer a short practice question when it helps. Encourage the student to reason rather than just handing over final answers to obvious homework — guide them to the answer.

2. **Site guide.** Answer "how do I use TOPPRIUM" questions: subjects contain chapters; chapters hold study resources (PDFs, notes) and practice tests; some books/resources may be locked until access is granted; test scores are saved after you submit a test. Point them to the relevant part of the site in plain language.

Rules:
- Stay on studying and using the platform. If asked something clearly unrelated (relationships, gossip, other-grade or off-syllabus adult topics), gently redirect: you're here to help them study.
- You do NOT have access to the answer key of any specific graded test on the platform, and you must never claim to. If asked to reveal answers to a specific platform test, decline and offer to teach the underlying concept instead.
- Keep it warm and age-appropriate.`

const ADMIN_BASE = `${SHARED_RULES}

You are talking to a **TOPPRIUM admin** (a teacher/content creator). Be direct and efficient — they are a professional building course content.`

const ADMIN_PROMPTS: Record<string, string> = {
  // General admin chat — can also answer "how do I use the admin tools".
  chat: `${ADMIN_BASE}

You can also answer questions about using the admin dashboard: creating subjects and chapters, uploading resources, building tests (question + 4 options + correct answer), setting access levels (everyone vs. selected users), organising content into folders, and the AI review queue where pending generated content is approved before students see it.`,

  // Draft MCQ quiz questions the admin can paste into the test builder.
  quiz: `${ADMIN_BASE}

TASK: Draft multiple-choice quiz questions for a Class IX topic the admin gives you.
- Produce exactly as many questions as requested (default 5 if unspecified).
- Each question MUST have exactly 4 options and one correct answer.
- Match the difficulty and syllabus to Class IX.
- Output as a Markdown numbered list. For each question use this shape:

**Q1. <question text>**
- A) <option>
- B) <option>
- C) <option>
- D) <option>
**Answer: <letter>**

Keep options plausible and unambiguous. Do not add commentary between questions unless asked.`,

  // Draft study notes / summaries the admin can publish as a resource.
  notes: `${ADMIN_BASE}

TASK: Draft clear, well-structured study notes for a Class IX topic the admin gives you.
- Use Markdown headings, bullet points, and short worked examples.
- Cover key definitions, core concepts, and common mistakes.
- Keep the reading level appropriate for Class IX.
- End with a brief "Key takeaways" list.
Output only the notes (ready to paste as a resource) unless the admin asks for something else.`,

  // Rewrite / summarize / translate / improve pasted text.
  rewrite: `${ADMIN_BASE}

TASK: Help the admin with content work on text they paste: rewrite for clarity, summarize, expand, simplify to a Class IX reading level, fix grammar, or translate. Follow their specific instruction. Return only the transformed text unless they ask for an explanation.`,
}

const ADMIN_ONLY_MODES = new Set(['quiz', 'notes', 'rewrite'])

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function pickSystemPrompt(role: string, mode: string): string {
  if (role === 'admin') {
    return ADMIN_PROMPTS[mode] || ADMIN_PROMPTS.chat
  }
  // Everyone non-admin is treated as a student.
  return STUDENT_PROMPT
}

// Trim history to the most recent N turns and clamp each message length, so a
// hostile or runaway client can't blow up cost or context.
function sanitizeMessages(raw: unknown): { role: string; content: string }[] {
  if (!Array.isArray(raw)) return []
  const cleaned = raw
    .filter(
      (m): m is { role: string; content: unknown } =>
        !!m && typeof m === 'object' && (m as any).role && (m as any).content != null,
    )
    .map((m) => {
      const role = m.role === 'assistant' ? 'assistant' : 'user'
      let content = String((m as any).content)
      if (content.length > MAX_CHARS_PER_MESSAGE) {
        content = content.slice(0, MAX_CHARS_PER_MESSAGE)
      }
      return { role, content }
    })
    .filter((m) => m.content.trim().length > 0)

  return cleaned.slice(-MAX_HISTORY_MESSAGES)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  if (!AI_API_KEY) {
    return json({ error: 'Copilot is not configured. Missing AI_API_KEY.' }, 500)
  }

  // --- Authenticate the caller via their Supabase session JWT -------------
  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Sign in to use the copilot.' }, 401)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return json({ error: 'Your session has expired. Please log in again.' }, 401)
  }

  // --- Resolve role -------------------------------------------------------
  let role = 'student'
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role === 'admin') role = 'admin'
  } catch (_e) {
    // Fall back to student on any lookup failure — least privilege.
    role = 'student'
  }

  // --- Parse & validate request body --------------------------------------
  let payload: { messages?: unknown; mode?: unknown }
  try {
    payload = await req.json()
  } catch (_e) {
    return json({ error: 'Invalid request body.' }, 400)
  }

  const mode = typeof payload.mode === 'string' ? payload.mode : 'chat'
  const messages = sanitizeMessages(payload.messages)

  if (messages.length === 0) {
    return json({ error: 'Send a message to start.' }, 400)
  }

  // Admin-only modes are rejected for students, regardless of what the client
  // claims. This is the real access boundary — the UI hint is just cosmetic.
  if (ADMIN_ONLY_MODES.has(mode) && role !== 'admin') {
    return json({ error: 'That tool is available to admins only.' }, 403)
  }

  const systemPrompt = pickSystemPrompt(role, mode)

  // --- Call the AI provider (OpenAI-compatible), streaming ----------------
  let upstream: Response
  try {
    upstream = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        stream: true,
        max_tokens: MAX_TOKENS,
        temperature: mode === 'quiz' ? 0.4 : 0.7,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    })
  } catch (_e) {
    return json({ error: 'Could not reach the AI service. Try again in a moment.' }, 502)
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    console.error('AI provider error', upstream.status, detail)
    const msg =
      upstream.status === 401
        ? 'Copilot is misconfigured (bad API key).'
        : 'The AI service returned an error. Please try again.'
    return json({ error: msg }, 502)
  }

  // Re-emit the provider's SSE stream to the client. We pass the raw
  // `data: {...}` lines through unchanged; the client parses the delta chunks.
  return new Response(upstream.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
})
