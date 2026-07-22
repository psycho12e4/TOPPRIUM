// Client-side copilot transport + tiny Markdown renderer.
//
// The browser never sees the DeepSeek key — it calls our Supabase Edge
// Function (supabase/functions/copilot), authenticated with the user's
// session token. The function proxies to DeepSeek and streams the reply back
// as Server-Sent Events, which we parse into text deltas here.

import { supabase, SUPABASE_URL } from './supabase.js'

const COPILOT_ENDPOINT = `${SUPABASE_URL}/functions/v1/copilot`

/**
 * Stream a copilot reply.
 *
 * @param {Array<{role:'user'|'assistant', content:string}>} messages
 * @param {object} opts
 * @param {string} [opts.mode]         'chat' | 'quiz' | 'notes' | 'rewrite'
 * @param {(delta:string)=>void} [opts.onDelta]  called with each text chunk
 * @param {AbortSignal} [opts.signal]  to cancel an in-flight reply
 * @returns {Promise<string>}          the full reply text
 * @throws  {Error}                    with a user-facing .message on failure
 */
export async function streamCopilot(messages, { mode = 'chat', onDelta, signal } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Please log in to use the copilot.')
  }

  const res = await fetch(COPILOT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages, mode }),
    signal,
  })

  if (!res.ok) {
    // The function returns JSON { error } for every failure path.
    let message = 'The copilot ran into a problem. Please try again.'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // non-JSON body — keep the default message
    }
    throw new Error(message)
  }

  if (!res.body) {
    throw new Error('The copilot returned an empty response.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  // Parse the SSE stream: lines of `data: {json}` plus a terminal `data: [DONE]`.
  // A chunk may split mid-line, so we keep an incomplete tail in `buffer`.
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sepIndex
    while ((sepIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, sepIndex).trim()
      buffer = buffer.slice(sepIndex + 1)

      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '' || data === '[DONE]') continue

      try {
        const parsed = JSON.parse(data)
        const delta = parsed?.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          if (onDelta) onDelta(delta)
        }
      } catch {
        // Ignore keep-alive/comment lines or partial JSON that slipped through.
      }
    }
  }

  return full
}

// ---------------------------------------------------------------------------
// Minimal, XSS-safe Markdown → HTML. We escape all input first, then apply a
// small subset of Markdown (headings, bold/italic, inline + fenced code,
// bullet/numbered lists, links). No raw HTML from the model is ever trusted.
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Private-use sentinels for stashing code spans while parsing the rest, so a
// code span's contents can't be re-parsed as bold/italic/links. Built at
// runtime (not as literals) to keep them out of source and regex literals.
const CODE_OPEN = String.fromCharCode(0xe000)
const CODE_CLOSE = String.fromCharCode(0xe001)

function renderInline(text) {
  const codePlaceholders = []
  let out = text.replace(/`([^`]+)`/g, (_m, code) => {
    codePlaceholders.push(`<code class="copilot-code-inline">${code}</code>`)
    return `${CODE_OPEN}${codePlaceholders.length - 1}${CODE_CLOSE}`
  })

  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')

  // Links: [text](http(s)://…) — restricted to http(s) to block javascript: URIs.
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="copilot-link">${label}</a>`
  })

  // Restore stashed code spans.
  const restore = new RegExp(`${CODE_OPEN}(\\d+)${CODE_CLOSE}`, 'g')
  out = out.replace(restore, (_m, i) => codePlaceholders[Number(i)])
  return out
}

/**
 * Render a Markdown string to safe HTML for the chat bubble.
 * @param {string} md
 * @returns {string} HTML
 */
export function renderMarkdown(md) {
  const escaped = escapeHtml(md)
  const lines = escaped.split('\n')
  const html = []
  let i = 0
  let listType = null // 'ul' | 'ol' | null

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`)
      listType = null
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block ```
    if (/^\s*```/.test(line)) {
      closeList()
      const codeLines = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence
      html.push(`<pre class="copilot-code-block"><code>${codeLines.join('\n')}</code></pre>`)
      continue
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = Math.min(heading[1].length + 2, 6) // demote so h1 → h3 in-bubble
      html.push(`<h${level} class="copilot-h">${renderInline(heading[2])}</h${level}>`)
      i++
      continue
    }

    // Bullet list
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      if (listType !== 'ul') {
        closeList()
        html.push('<ul class="copilot-ul">')
        listType = 'ul'
      }
      html.push(`<li>${renderInline(bullet[1])}</li>`)
      i++
      continue
    }

    // Numbered list
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/)
    if (numbered) {
      if (listType !== 'ol') {
        closeList()
        html.push('<ol class="copilot-ol">')
        listType = 'ol'
      }
      html.push(`<li>${renderInline(numbered[1])}</li>`)
      i++
      continue
    }

    // Blank line
    if (line.trim() === '') {
      closeList()
      i++
      continue
    }

    // Paragraph
    closeList()
    html.push(`<p class="copilot-p">${renderInline(line)}</p>`)
    i++
  }

  closeList()
  return html.join('\n')
}
