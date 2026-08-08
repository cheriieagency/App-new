# Form: Community Search — Implementation Instruction

Concrete instructions for the **community search form** on the Nordic Creator platform (`apps/web`).  
Companion to `search_form_prompt.md` (general search rules). This file is community-specific.

---

## Where it lives

| Surface | File(s) | Notes |
|---------|---------|--------|
| Landing showcase | `src/app/page.tsx` + `src/components/landing/ShowcaseSection.tsx` | `searchQuery` filters public communities; category pills also set the query |
| Member dashboard | `src/app/dashboard/page.tsx` | `communitySearch` filters joined/available communities |
| API | `GET /api/communities` | Returns community rows (+ `is_joined` when authed) |

Do **not** put community search logic into `/admin` or auth pages.

---

## Data shape (guarded)

```ts
type Community = {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  creator_name?: string | null;
  creator_image?: string | null;
  cover_color?: string | null;
  member_count: number;
  is_featured?: boolean;
  is_joined?: boolean;
  slug?: string | null;
};
```

Fetch rules:

1. `const data = await res.json()`
2. `const communities = Array.isArray(data) ? data : []`
3. Never call `.filter` / `.slice` / `.map` on a non-array

---

## Filter logic (required)

Case-insensitive; empty query returns the full list.

Match if **any** of these contain the query:

- `name`
- `category`
- `creator_name`
- `slug` (when present)
- `description` (optional, nice-to-have)

```ts
function filterCommunities(list: Community[], query: string): Community[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => {
    const haystack = [
      c.name,
      c.category,
      c.creator_name,
      c.slug,
      c.description,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
```

Category pills (landing): clicking a pill sets `searchQuery` to that category filter string (e.g. `Hälsa`, `Marketing`). Clicking the active pill clears the query.

---

## UI spec — community search form

### Field

- Controlled `<input type="search">` (or `type="text"` + `role="searchbox"`)
- Placeholder (SV default): `Sök communities, ämnen, kreatörer...`
- Leading Lucide `Search` icon
- Trailing clear control (`X`) when `value.length > 0`
- Min height **44px**; `rounded-2xl`
- `aria-label`: `Sök communities`

### Behavior

- Typing updates parent state immediately (`onSearchChange` / `setSearchQuery`)
- Focus may scroll to `#communities` (`scrollIntoView({ behavior: 'smooth' })`)
- Results count label: e.g. `{n} st`
- Empty state copy: `Inga communities hittades för "{query}"` + button **Rensa filter**

### CTA on cards (unchanged)

- Button label: **Kika in i communityt**
- Logged out → `/account/signup`
- Logged in + joined → `/dashboard`
- Logged in + not joined → join mutation, then dashboard

---

## Component contract (preferred)

```tsx
// src/components/landing/CommunitySearchForm.tsx (or shared under components/)
type CommunitySearchFormProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  onFocusResults?: () => void;
};
```

Parent owns:

- Fetching `/api/communities`
- `searchQuery` state
- `filtered = filterCommunities(communities, searchQuery)`
- Passing `filtered` into the grid / `ShowcaseSection`

---

## i18n keys (add if missing)

| Key | SV |
|-----|----|
| `searchCommunitiesPlaceholder` | Sök communities, ämnen, kreatörer... |
| `searchCommunitiesAria` | Sök communities |
| `clearFilter` | Rensa filter |
| `noCommunitiesFound` | Inga communities hittades |
| `communitiesCount` | `{count} st` |

Wire via `t(key, locale)` when keys exist; hardcode SV only as a temporary fallback.

---

## Acceptance checklist

- [ ] Landing `#communities` filters by text + category pills
- [ ] Dashboard community list respects the same filter rules
- [ ] API error / `{ error }` payload → empty list, no crash
- [ ] Clear control resets query and restores full grid
- [ ] Mobile touch targets ≥ 44px
- [ ] Featured “Veckans Community” still renders above the filtered grid
- [ ] No changes to auth form contracts or unrelated admin mutations

---

## One-shot instruction (copy into chat)

```
Follow form_community_search_instruction.md.
Add or refine the community search form on the landing page (and dashboard if needed).
Use Array.isArray fallbacks, filter by name/category/creator/slug, wire category pills to the same query state, and keep ShowcaseSection CTAs ("Kika in i communityt") working.
Do not touch auth pages or unrelated admin code.
```
