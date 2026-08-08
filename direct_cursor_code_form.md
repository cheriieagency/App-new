# Direct Cursor Code Form — Working Instruction

How to implement **forms directly in code** in this repo using Cursor (no design-tool handoff, no rewrite of auth scaffolding).

Companion files:

- `search_form_prompt.md` — general search UI rules  
- `form_community_search_instruction.md` — community search specifics  

---

## Working style (Ebba / this project)

1. **Edit code directly** — create, debug, iterate in `apps/web`.
2. **Prefer small diffs** — extract a component only when reuse is clear.
3. **Do not rewrite** shipped auth contracts (`/account/signin`, `/account/signup`, `SocialSignInButtons`, `lib/auth.ts` form/`onSubmit` patterns).
4. **Do not commit** unless explicitly asked.
5. **Verify** with lint / runtime behavior; fix `Array.isArray` and env/demo-auth footguns.

---

## Form implementation checklist

When adding or changing any form in Cursor:

### Structure

- [ ] `'use client'` only if the form needs state, effects, or browser APIs
- [ ] `<form onSubmit={(e) => { e.preventDefault(); void handler(e); }}>` for submit flows  
      (required for auth; prefer for all POSTs)
- [ ] Controlled inputs: `value` + `onChange`
- [ ] Loading + error state: `loading`, `error: string | null`
- [ ] Disable submit while `loading`
- [ ] Touch targets ≥ 44px (`min-h-11` / `min-h-12`)

### Data & API

- [ ] `const data = await res.json()` then normalize:  
      `Array.isArray(data) ? data : []` or read `data.error` / `formatAuthError`
- [ ] Show **real** `error.message` (or `formatAuthError`) — never only a silent generic if details exist
- [ ] Invalidate React Query keys on success when the page uses TanStack Query

### UX / i18n

- [ ] Swedish default copy; wire `t()` + `useLocale()` when keys exist
- [ ] Labels associated with inputs (`<label>` wrapping or `htmlFor`)
- [ ] Clear validation: `required`, `minLength`, useful placeholders
- [ ] Success feedback (toast, inline “Sparat”, or redirect) — pick one, don’t stack noise

### Safety

- [ ] Do not change `window.location.href` redirect patterns on auth success
- [ ] Do not bypass `authClient.signIn.email` / `signUp.email`
- [ ] Demo auth: if Supabase/DB env is dummy, expect in-memory auth (see `lib/auth-env.ts`)
- [ ] Leave `/admin` and `/dashboard` alone unless the form belongs there

---

## Where forms usually go

| Form | Location | Notes |
|------|----------|--------|
| Community search | Landing `page.tsx` / `ShowcaseSection` | Filter-only; no submit required |
| Sign up / Sign in | `app/account/*` | **Do not rewrite** submit contract |
| Login modal | `components/landing/LoginModal.tsx` | Same auth contract as signin |
| Admin product / event | `app/admin/page.tsx` | Mutations via `fetch` + React Query |
| Bio builder | Admin bio tab | JSON blocks + `bio_blocks` API |
| RSVP / join community | Dashboard / landing cards | POST then invalidate |

---

## Cursor one-shot (copy into Agent chat)

```
Follow direct_cursor_code_form.md.
Implement the form directly in apps/web code (small, focused diff).
Use <form onSubmit> + preventDefault for submit flows.
Surface real API/auth errors. Normalize list responses with Array.isArray.
Do not rewrite auth scaffolding or unrelated admin/dashboard code.
Match existing Tailwind / Plus Jakarta / rounded-2xl patterns.
```

---

## Minimal form template (non-auth)

```tsx
'use client';

import { type FormEvent, useState } from 'react';

export function ExampleForm({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? data?.message ?? 'Något gick fel');
        setLoading(false);
        return;
      }
      onSuccess?.();
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { void onSubmit(e); }} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-xs font-black text-zinc-500 uppercase tracking-wider">
        Namn
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-medium outline-none focus:border-zinc-400"
        />
      </label>
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600 break-words">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="min-h-12 rounded-xl bg-zinc-900 text-white text-sm font-black disabled:opacity-60"
      >
        {loading ? 'Sparar…' : 'Spara'}
      </button>
    </form>
  );
}
```

---

## Done when

- Form works on mobile + desktop  
- Errors are visible and specific  
- Success path updates UI or redirects correctly  
- No unrelated files changed  
- Auth / RLS / schema left intact unless the task explicitly includes them  
