# Deploy

Production runs on **Vercel** (Next.js, no Vercel-specific code) with the **Supabase project
shared with QuemLeva** (sa-east-1), in its own `amigosecreto` schema.

## 1. Database

Apply `supabase/migrations/20261115000100_amigosecreto_schema.sql` once (Supabase → SQL editor,
or `supabase db push`). It only creates the `amigosecreto` schema and the `public.as_*` functions;
it does not touch `quemleva` or `oqfalta`. Then run the security and performance advisors.

## 2. Vercel project

1. Import the GitHub repository in Vercel (framework preset: Next.js, default build and output).
2. Environment variables (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://uqkyhzvdwynpkqdiuvyn.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key (`.env.example`) |
   | `NEXT_PUBLIC_SITE_URL` | optional: `https://amigosecreto.gr1618.io` (base of the link-preview image URL) |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | optional: contact on About, Privacy and Terms; without it, GitHub issues |

   Both Supabase values are public by design: the browser calls the `as_*` RPCs directly and the
   tables are not exposed.
3. Function region: **São Paulo (gru1)**, next to the database (`vercel.json`).

## 3. Domain

Validation phase: `amigosecreto.gr1618.io` (DNS for `gr1618.io` is managed at Hover).

1. Vercel → Project → Settings → Domains → add `amigosecreto.gr1618.io`.
2. At Hover, add the `CNAME` record Vercel shows (name `amigosecreto`).
3. Wait for Vercel to mark the domain valid; HTTPS is automatic.

## 4. Smoke test after each deploy

1. Phone A: create a group taking part yourself, add two names, send one personal link to phone C.
2. Phone B: open the group link, join with a new name, write gift hints.
3. Phone A: add an exclusion, run the draw. The panel says nobody has seen their result yet.
4. Phones B and C: tap "reveal". Nobody gets themselves or someone they are excluded with.
5. Phone A: the panel shows who has seen their result, never who got whom.
6. Paste the group link in a WhatsApp chat: the card shows the group name and date, no names.
