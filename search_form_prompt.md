# Search Form Prompt — clikd: Platform

Use this prompt when building, refining, or debugging search UI in the clikd: app (`apps/web`).

---

## Role

You are an expert Next.js 15 (App Router) + TypeScript + Tailwind engineer working on a Nordic all-in-one creator platform (Stan Store + Skool + Events + AI).

## Goal

Implement a clean, accessible, mobile-first **search form** that filters communities, members, products, or content without breaking existing creator (`/admin`) or member (`/dashboard`) flows.

## Stack constraints

- Next.js App Router, React client components where needed (`'use client'`)
- Tailwind CSS (dark slate / glass, `rounded-2xl`, mobile-first)
- Icons: Lucide React (`Search`, `X`)
- i18n: prefer `t()` + `useLocale()` from `@/lib/i18n` and `@/lib/locale-context` (SV default, also EN/NO/DA/FI)
- Touch targets ≥ 44px; support click + touch
- No new monolithic page rewrites — extract small components under `src/components/` when possible

## Functional requirements

1. **Controlled input**
   - State: `searchQuery` (string)
   - `onChange` updates query immediately
   - Optional: debounce (150–300ms) before filtering large lists

2. **Filter behavior**
   - Case-insensitive match on relevant fields, e.g.:
     - Communities: `name`, `category`, `creator_name`, `slug`
     - Members: `name`, `email`
     - Products: `name`, `type`
   - Empty query → show full list
   - No matches → empty state with “Rensa filter” / clear action

3. **UX**
   - Leading search icon inside the field
   - Clear (X) button when query is non-empty
   - Placeholder localized (e.g. SV: `Sök communities, ämnen, kreatörer...`)
   - `aria-label` on the input and clear button
   - Smooth scroll to results container when focusing search from a CTA (`#communities` or equivalent)

4. **Data safety**
   - Never assume API data is an array:  
     `const list = Array.isArray(data) ? data : []`
   - Guard missing string fields: `(c.name ?? '').toLowerCase()`

5. **Do not break**
   - Auth contracts (`/account/signin`, `/account/signup` form `onSubmit`)
   - Admin / dashboard route ownership
   - Existing join/RSVP/mutation flows

## Suggested component API

```tsx
type SearchFormProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFocusResults?: () => void; // e.g. scroll to #communities
  className?: string;
};
```

## Acceptance checklist

- [ ] Works on mobile and desktop
- [ ] Clears filter in one tap
- [ ] Empty / error API payloads do not crash
- [ ] Swedish copy by default; wired to i18n when keys exist
- [ ] Results update as the user types
- [ ] No regressions on `/`, `/dashboard`, `/admin`

## Out of scope

- Full-text Postgres search / Supabase RPC (unless explicitly requested)
- Algolia / external search vendors
- Rewriting auth or schema.sql

---

## One-shot instruction (copy into chat)

```
Implement or refine the platform search form using search_form_prompt.md.
Keep it mobile-first, i18n-ready, and safe with Array.isArray fallbacks.
Put reusable UI in src/components/ if the form is shared; otherwise keep local state on the page.
Do not touch auth pages or admin/dashboard unrelated flows.
```
