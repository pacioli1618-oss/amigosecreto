# AmigoSecreto

A sign-up-free web app for **Secret Santa** draws (amigo secreto / amigo oculto): the host sets
up the group, the server runs the draw, and each person sees only who they got, through their own
link. Not even the host can see the result. Licensed under AGPL-3.0. A GR1618 app, built on the
same base as [QuemLeva](https://github.com/pacioli1618-oss/quemLeva).

- Next.js 16 (App Router, `cacheComponents`) + Supabase (Postgres, `as_*` RPCs)
- Languages: pt-BR, es, en. See [docs/i18n.md](docs/i18n.md).
- Naming and code style: [docs/conventions.md](docs/conventions.md). **Read it before contributing.**
- Deliberately left for later: [docs/improvements.md](docs/improvements.md).
- Everything the app stores on the device goes through `src/lib/device-store.ts`.

## How it works

| Who | Link | What they do |
| --- | --- | --- |
| Host | `/` → `/g/<slug>/host` (backup: `/g/<slug>/manage#<hostToken>`) | Adds names, sets "who can't get whom", runs or resets the draw. Sees who has opened their link and seen their result, never who got whom. |
| Anyone with the group link | `/g/<slug>` | Joins with their own name before the draw. Their personal link stays only on their phone. |
| Each participant | `/g/<slug>/me#<participantToken>` | Taps "reveal" to see who they got and that person's gift hints; writes their own hints. |

People can be added both ways: the host types names (each gets a personal link the host sends
on WhatsApp), or people join through the group link (full secrecy: nobody else holds their link).

The draw (`as_draw`) builds one random cycle through everyone, so nobody gets themselves and, with
3 or more people, no two people get each other. Exclusions are checked on every link of the cycle;
impossible rules return `draw_impossible`.

## Running

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types and runs TypeScript |
| `npm run i18n:check` | Checks translations: keys, ICU syntax and arguments |
| `npm test` | Unit tests (Node test runner + tsx), including RPC response mapping against real fixtures |
| `npm run db:types` | Regenerates `src/lib/database.types.ts` from the database (run `npx supabase login` once) |

## Database

Lives in the QuemLeva Supabase project, in its own `amigosecreto` schema, which is not exposed
through the Data API: all access goes through the `public.as_*` functions. Migrations live in
`supabase/migrations/`. After applying one, run `npm run db:types` and, if an RPC response
changed, refresh `tests/fixtures/` and the types in `src/lib/api-mappers.ts`.
