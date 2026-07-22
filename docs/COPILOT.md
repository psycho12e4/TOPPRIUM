# TOPPRIUM Copilot

An AI assistant built on the **DeepSeek** API. It has two faces, decided by the
signed-in user's role:

- **Students** get a study tutor (explains concepts, works through problems,
  quizzes them) that also answers "how do I use the site" questions. It stays
  scoped to Class IX studying and will not reveal answer keys to platform tests.
- **Admins** get everything the student chat has, plus three authoring tools —
  **Quiz** (draft MCQs), **Notes** (draft study notes), and **Rewrite**
  (rewrite / summarize / translate / simplify pasted text) — as tabs in the
  panel. Output is meant to be copied into the admin dashboard.

## Why there's a backend

The DeepSeek key must **never** ship in the browser bundle, or anyone visiting
the site could read it and run up the bill. So the browser never calls DeepSeek
directly. Instead:

```
Browser (chat widget)
   │  POST /functions/v1/copilot   (Authorization: Bearer <supabase session JWT>)
   ▼
Supabase Edge Function  (holds DEEPSEEK_API_KEY as a secret)
   │  1. verifies the session JWT  → rejects anonymous
   │  2. looks up profiles.role    → student | admin
   │  3. picks the right system prompt for role + mode
   │  4. rejects admin-only modes for non-admins
   ▼
DeepSeek /chat/completions  (streamed) → streamed straight back to the browser
```

The admin/student boundary is enforced **server-side** in the function, not in
the UI. A hostile client that flips its own role or asks for `mode: "quiz"`
still gets a `403` unless the account is genuinely an admin.

## Files

| File | Role |
|------|------|
| `supabase/functions/copilot/index.ts` | The Deno edge function (proxy + auth + prompts). |
| `src/lib/copilot.js` | Client transport: streams the reply, tiny XSS-safe Markdown renderer. |
| `src/components/copilot-widget.js` | Floating launcher + chat panel (role-aware tabs). |
| `src/main.js` | Mounts the widget after navigation on logged-in, non-auth pages. |
| `src/styles.css` | `.copilot-*` styles. |

## Deploy (one-time)

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) and to be
linked to the project (`supabase link --project-ref bzrxgolyrmgpxlzwxnzz`).

1. **Set the secrets** (the key lives here, not in the repo):

   ```bash
   supabase secrets set \
     DEEPSEEK_API_KEY=your_deepseek_key \
     DEEPSEEK_MODEL=deepseek-chat
   ```

   `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically by the
   platform — you don't set those.

2. **Deploy the function:**

   ```bash
   supabase functions deploy copilot
   ```

That's it. The frontend already points at
`${SUPABASE_URL}/functions/v1/copilot`, so once the function is live the widget
starts working for every logged-in user.

### Environment knobs (edge function)

| Secret | Default | Notes |
|--------|---------|-------|
| `DEEPSEEK_API_KEY` | — | **Required.** Your DeepSeek API key. |
| `DEEPSEEK_MODEL` | `deepseek-chat` | e.g. `deepseek-chat` or `deepseek-reasoner`. |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | Override only if using a proxy/compatible host. |

## Notes & caveats

- **Key format:** DeepSeek keys are normally `sk-...`. The value currently in
  `.env.local` (`d5b4ff92-…`) looks like a UUID — if the function returns
  *"Copilot is misconfigured (bad API key)"* (a `502`), double-check that this
  is a real DeepSeek key. If the value is actually for a different provider
  (or an OpenAI-compatible gateway), set `DEEPSEEK_BASE_URL` to that host.
- **Cost guardrails** live in the function: history is trimmed to the last 20
  messages, each message capped at 6000 chars, replies capped at 1200 tokens.
- **The widget only appears** for logged-in users, and never on the landing,
  login, signup, or admin-gate pages.
- **Answer safety:** the student prompt refuses to hand over answer keys to
  specific platform tests. It does not have access to the `questions` table's
  `correct_answer` — it only knows what the student types.
