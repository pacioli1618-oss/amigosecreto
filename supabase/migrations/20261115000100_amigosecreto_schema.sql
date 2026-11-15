-- AmigoSecreto: schema, tables and RPCs.
--
-- Lives in the QuemLeva Supabase project, in its own schema. The schema is not exposed through
-- the Data API: every read and write goes through the public.as_* functions below.
--
-- Identity without accounts (docs/conventions.md):
--   * host token        — manages the group; only its sha256 is stored.
--   * participant token — opens one person's page (who they drew, their wishes); only its
--                          sha256 is stored. When the host typed the name, the plain token is
--                          also kept in invite_token so the host can send the personal link again.
--                          When the person joined through the group link, nobody but their
--                          device has the token.
-- The draw runs here, never in the browser, and no host-facing function returns recipient_id.

create schema if not exists amigosecreto;
revoke all on schema amigosecreto from public, anon, authenticated;

------------------------------------------------------------------------
-- 1. Tables
------------------------------------------------------------------------
create table amigosecreto.groups (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null check (length(trim(title)) between 1 and 120),
  exchange_date date,
  budget        numeric(10,2) check (budget is null or budget > 0),
  currency      text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  notes         text check (length(notes) <= 1000),
  locale        text not null default 'pt-BR' check (locale in ('pt-BR', 'es', 'en')),
  drawn_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table amigosecreto.host_tokens (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references amigosecreto.groups(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index host_tokens_group_id_idx on amigosecreto.host_tokens (group_id);

create table amigosecreto.participants (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references amigosecreto.groups(id) on delete cascade,
  name         text not null check (length(trim(name)) between 1 and 60),
  token_hash   text not null unique,
  invite_token text unique,
  device_id    uuid,
  wishes       text check (length(wishes) <= 500),
  recipient_id uuid references amigosecreto.participants(id) on delete set null,
  opened_at    timestamptz,
  revealed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index participants_group_id_idx on amigosecreto.participants (group_id);
-- Two "Ana" in one group would make the draw result ambiguous.
create unique index participants_group_id_name_idx on amigosecreto.participants (group_id, lower(trim(name)));

-- "These two can't draw each other" (couples, people who live together). Symmetric:
-- stored once with participant_a_id < participant_b_id.
create table amigosecreto.exclusions (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references amigosecreto.groups(id) on delete cascade,
  participant_a_id uuid not null references amigosecreto.participants(id) on delete cascade,
  participant_b_id uuid not null references amigosecreto.participants(id) on delete cascade,
  created_at       timestamptz not null default now(),
  check (participant_a_id < participant_b_id),
  unique (participant_a_id, participant_b_id)
);
create index exclusions_group_id_idx on amigosecreto.exclusions (group_id);
create index exclusions_participant_b_id_idx on amigosecreto.exclusions (participant_b_id);

-- Anti-spam for as_create_group, same rules as QuemLeva's ql_create_event.
create table amigosecreto.secrets (
  name  text primary key,
  value text not null
);
insert into amigosecreto.secrets (name, value)
values ('ip_salt', encode(extensions.gen_random_bytes(32), 'hex'));

create table amigosecreto.create_group_log (
  id         bigint generated always as identity primary key,
  device_id  uuid,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index create_group_log_device_id_idx on amigosecreto.create_group_log (device_id, created_at desc) where device_id is not null;
create index create_group_log_ip_hash_idx on amigosecreto.create_group_log (ip_hash, created_at desc) where ip_hash is not null;
create index create_group_log_created_at_idx on amigosecreto.create_group_log (created_at);

-- RLS on and no policies: no direct access for anon/authenticated.
alter table amigosecreto.groups           enable row level security;
alter table amigosecreto.host_tokens      enable row level security;
alter table amigosecreto.participants     enable row level security;
alter table amigosecreto.exclusions       enable row level security;
alter table amigosecreto.secrets          enable row level security;
alter table amigosecreto.create_group_log enable row level security;
revoke all on all tables in schema amigosecreto from public, anon, authenticated;

------------------------------------------------------------------------
-- 2. Internal helpers (schema amigosecreto, not callable by clients)
------------------------------------------------------------------------
create function amigosecreto.hash_token(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex')
$$;

create function amigosecreto.random_text(n int)
returns text language sql volatile set search_path = '' as $$
  -- Alphabet without look-alikes (0/o, 1/l/i) so links survive being read aloud.
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (get_byte(b, i) % 31) + 1, 1), '' order by i)
  from (select extensions.gen_random_bytes(n) as b) x, generate_series(0, n - 1) as i
$$;

create function amigosecreto.require_group(p_slug text)
returns amigosecreto.groups language plpgsql stable set search_path = '' as $$
declare g amigosecreto.groups;
begin
  select * into g from amigosecreto.groups where slug = p_slug;
  if not found then
    raise exception 'group_not_found' using errcode = 'P0002';
  end if;
  return g;
end $$;

create function amigosecreto.require_host_group(p_slug text, p_host_token text)
returns amigosecreto.groups language plpgsql stable set search_path = '' as $$
declare g amigosecreto.groups;
begin
  select gr.* into g
  from amigosecreto.groups gr
  join amigosecreto.host_tokens h on h.group_id = gr.id
  where gr.slug = p_slug
    and h.token_hash = amigosecreto.hash_token(p_host_token)
    and h.revoked_at is null;
  if not found then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return g;
end $$;

create function amigosecreto.require_participant(p_slug text, p_participant_token text)
returns amigosecreto.participants language plpgsql stable set search_path = '' as $$
declare p amigosecreto.participants;
begin
  select pa.* into p
  from amigosecreto.participants pa
  join amigosecreto.groups g on g.id = pa.group_id
  where g.slug = p_slug and pa.token_hash = amigosecreto.hash_token(p_participant_token);
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  return p;
end $$;

-- Membership and exclusions are frozen once the draw is done: changing them would silently
-- invalidate results people may already have seen. The host resets the draw first.
create function amigosecreto.require_not_drawn(p_group amigosecreto.groups)
returns void language plpgsql stable set search_path = '' as $$
begin
  if p_group.drawn_at is not null then
    raise exception 'group_already_drawn' using errcode = 'P0001';
  end if;
end $$;

-- Inserts one participant and returns its plain token (only the hash is kept, plus the
-- plain copy in invite_token when the host added the name).
create function amigosecreto.insert_participant(p_group_id uuid, p_name text, p_device_id uuid, p_added_by_host boolean)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare
  v_name  text := trim(coalesce(p_name, ''));
  v_token text := amigosecreto.random_text(24);
  v_id    uuid;
begin
  if v_name = '' then
    raise exception 'participant_name_required' using errcode = '22023';
  end if;
  if (select count(*) from amigosecreto.participants where group_id = p_group_id) >= 100 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;
  if exists (select 1 from amigosecreto.participants
             where group_id = p_group_id and lower(trim(name)) = lower(v_name)) then
    raise exception 'participant_name_taken' using errcode = '23505', detail = v_name;
  end if;

  -- clock_timestamp(), not now(): names added in one call keep the order they were typed in.
  insert into amigosecreto.participants (group_id, name, token_hash, invite_token, device_id, opened_at, created_at)
  values (p_group_id, v_name, amigosecreto.hash_token(v_token),
          case when p_added_by_host then v_token end,
          p_device_id, case when p_device_id is not null then now() end, clock_timestamp())
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'name', v_name, 'participant_token', v_token);
end $$;

create function amigosecreto.request_ip_hash()
returns text language sql stable set search_path = '' as $$
  with h as (select nullif(current_setting('request.headers', true), '')::json as headers),
       ip as (
         select nullif(trim(coalesce(
                  headers->>'cf-connecting-ip',
                  split_part(headers->>'x-forwarded-for', ',', 1))), '') as value
         from h)
  select case when ip.value is null then null
              else amigosecreto.hash_token((select value from amigosecreto.secrets where name = 'ip_salt') || ip.value)
         end
  from ip
$$;

-- Limits (generous: mobile carriers put many people behind one IP):
--   per device 10/hour, 30/day; per IP 30/hour, 100/day. Over → 'rate_limited' (DETAIL hour|day).
create function amigosecreto.check_create_group_rate(p_device_id uuid)
returns void language plpgsql volatile set search_path = '' as $$
declare
  v_ip_hash text := amigosecreto.request_ip_hash();
begin
  if p_device_id is not null then perform pg_advisory_xact_lock(hashtext('as_create:' || p_device_id::text)); end if;
  if v_ip_hash   is not null then perform pg_advisory_xact_lock(hashtext('as_create:' || v_ip_hash)); end if;

  delete from amigosecreto.create_group_log where created_at < now() - interval '1 day';

  if p_device_id is not null then
    if (select count(*) from amigosecreto.create_group_log
        where device_id = p_device_id and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'rate_limited' using detail = 'hour';
    end if;
    if (select count(*) from amigosecreto.create_group_log where device_id = p_device_id) >= 30 then
      raise exception 'rate_limited' using detail = 'day';
    end if;
  end if;

  if v_ip_hash is not null then
    if (select count(*) from amigosecreto.create_group_log
        where ip_hash = v_ip_hash and created_at > now() - interval '1 hour') >= 30 then
      raise exception 'rate_limited' using detail = 'hour';
    end if;
    if (select count(*) from amigosecreto.create_group_log where ip_hash = v_ip_hash) >= 100 then
      raise exception 'rate_limited' using detail = 'day';
    end if;
  end if;

  insert into amigosecreto.create_group_log (device_id, ip_hash) values (p_device_id, v_ip_hash);
end $$;

-- Public view of a group: what anyone with the group link may see.
create function amigosecreto.group_json(p_group amigosecreto.groups)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'slug', p_group.slug,
    'title', p_group.title,
    'exchange_date', p_group.exchange_date,
    'budget', p_group.budget,
    'currency', p_group.currency,
    'notes', p_group.notes,
    'locale', p_group.locale,
    'drawn_at', p_group.drawn_at,
    'participant_names', coalesce((
      select jsonb_agg(p.name order by p.created_at, p.id)
      from amigosecreto.participants p where p.group_id = p_group.id), '[]'::jsonb)
  )
$$;

revoke execute on all functions in schema amigosecreto from public, anon, authenticated;

------------------------------------------------------------------------
-- 3. Public RPCs — anyone with the group link
------------------------------------------------------------------------

-- Returns the host token once (and the host's own participant token when they take part).
create function public.as_create_group(
  p_title         text,
  p_exchange_date date    default null,
  p_budget        numeric default null,
  p_currency      text    default 'BRL',
  p_notes         text    default null,
  p_locale        text    default 'pt-BR',
  p_device_id     uuid    default null,
  p_host_name     text    default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_slug        text;
  v_host_token  text := amigosecreto.random_text(32);
  v_group_id    uuid;
  v_participant jsonb;
begin
  perform amigosecreto.check_create_group_rate(p_device_id);

  loop
    v_slug := amigosecreto.random_text(12);
    exit when not exists (select 1 from amigosecreto.groups where slug = v_slug);
  end loop;

  insert into amigosecreto.groups (slug, title, exchange_date, budget, currency, notes, locale)
  values (v_slug, trim(p_title), p_exchange_date, p_budget, upper(coalesce(p_currency, 'BRL')),
          nullif(trim(p_notes), ''), coalesce(p_locale, 'pt-BR'))
  returning id into v_group_id;

  insert into amigosecreto.host_tokens (group_id, token_hash)
  values (v_group_id, amigosecreto.hash_token(v_host_token));

  -- The host takes part when they give a name: their token stays on their device only.
  if nullif(trim(p_host_name), '') is not null then
    v_participant := amigosecreto.insert_participant(v_group_id, p_host_name, p_device_id, false);
  end if;

  return jsonb_build_object(
    'slug', v_slug,
    'host_token', v_host_token,
    'participant_token', v_participant->>'participant_token');
end $$;

-- Join screen: group details and who is already in. Never the result.
create function public.as_get_group(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  return amigosecreto.group_json(amigosecreto.require_group(p_slug));
end $$;

-- Self-join through the group link. The token is returned once and kept only on that device.
create function public.as_join_group(p_slug text, p_name text, p_device_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_group(p_slug);
  v_participant jsonb;
begin
  perform amigosecreto.require_not_drawn(g);
  perform pg_advisory_xact_lock(hashtext('as_group:' || g.id::text));
  v_participant := amigosecreto.insert_participant(g.id, p_name, p_device_id, false);
  update amigosecreto.groups set updated_at = now() where id = g.id;
  return jsonb_build_object('participant_id', v_participant->>'id', 'participant_token', v_participant->>'participant_token');
end $$;

------------------------------------------------------------------------
-- 4. Public RPCs — a participant's personal link
------------------------------------------------------------------------

-- The person's own page. The recipient comes back only after as_reveal_recipient, so the
-- name is never on screen (or in the response) until the person taps "reveal".
create function public.as_open_participant(p_slug text, p_participant_token text, p_device_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p amigosecreto.participants := amigosecreto.require_participant(p_slug, p_participant_token);
  g amigosecreto.groups;
  r amigosecreto.participants;
begin
  select * into g from amigosecreto.groups where id = p.group_id;
  update amigosecreto.participants
  set opened_at = coalesce(opened_at, now()),
      device_id = coalesce(device_id, p_device_id)
  where id = p.id;

  if p.revealed_at is not null and p.recipient_id is not null then
    select * into r from amigosecreto.participants where id = p.recipient_id;
  end if;

  return jsonb_build_object(
    'group', amigosecreto.group_json(g),
    'me', jsonb_build_object('id', p.id, 'name', p.name, 'wishes', p.wishes),
    'has_revealed', p.revealed_at is not null and g.drawn_at is not null,
    'recipient', case when r.id is null then null
                      else jsonb_build_object('name', r.name, 'wishes', r.wishes) end);
end $$;

create function public.as_reveal_recipient(p_slug text, p_participant_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  p amigosecreto.participants := amigosecreto.require_participant(p_slug, p_participant_token);
  r amigosecreto.participants;
begin
  if p.recipient_id is null then
    raise exception 'draw_not_done' using errcode = 'P0001';
  end if;
  update amigosecreto.participants set revealed_at = coalesce(revealed_at, now()) where id = p.id;
  select * into r from amigosecreto.participants where id = p.recipient_id;
  return jsonb_build_object('name', r.name, 'wishes', r.wishes);
end $$;

-- Gift hints for whoever drew this person. Allowed before and after the draw.
create function public.as_set_wishes(p_slug text, p_participant_token text, p_wishes text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p amigosecreto.participants := amigosecreto.require_participant(p_slug, p_participant_token);
begin
  update amigosecreto.participants set wishes = nullif(trim(p_wishes), '') where id = p.id;
end $$;

------------------------------------------------------------------------
-- 5. Public RPCs — host link
------------------------------------------------------------------------

-- Everything the host needs to run the group. Deliberately no recipient_id: not even the
-- host can see who drew whom from here.
create function public.as_get_group_as_host(p_slug text, p_host_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
begin
  return amigosecreto.group_json(g) || jsonb_build_object(
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id,
               'name', p.name,
               'invite_token', p.invite_token,
               'has_opened', p.opened_at is not null,
               'has_wishes', p.wishes is not null,
               'has_revealed', p.revealed_at is not null and g.drawn_at is not null
             ) order by p.created_at, p.id)
      from amigosecreto.participants p where p.group_id = g.id), '[]'::jsonb),
    'exclusions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'participant_a_id', e.participant_a_id, 'participant_b_id', e.participant_b_id
             ) order by e.created_at, e.id)
      from amigosecreto.exclusions e where e.group_id = g.id), '[]'::jsonb));
end $$;

create function public.as_update_group(
  p_slug          text,
  p_host_token    text,
  p_title         text,
  p_exchange_date date    default null,
  p_budget        numeric default null,
  p_notes         text    default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
begin
  update amigosecreto.groups
  set title = trim(p_title), exchange_date = p_exchange_date, budget = p_budget,
      notes = nullif(trim(p_notes), ''), updated_at = now()
  where id = g.id;
end $$;

-- Host types names. Returns each new participant with its personal-link token.
create function public.as_add_participants(p_slug text, p_host_token text, p_names text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
  v_name  text;
  v_added jsonb := '[]'::jsonb;
begin
  perform amigosecreto.require_not_drawn(g);
  perform pg_advisory_xact_lock(hashtext('as_group:' || g.id::text));
  foreach v_name in array coalesce(p_names, '{}') loop
    if nullif(trim(v_name), '') is not null then
      v_added := v_added || jsonb_build_array(amigosecreto.insert_participant(g.id, v_name, null, true));
    end if;
  end loop;
  update amigosecreto.groups set updated_at = now() where id = g.id;
  return v_added;
end $$;

create function public.as_remove_participant(p_slug text, p_host_token text, p_participant_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
begin
  perform amigosecreto.require_not_drawn(g);
  delete from amigosecreto.participants where id = p_participant_id and group_id = g.id;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  update amigosecreto.groups set updated_at = now() where id = g.id;
end $$;

create function public.as_add_exclusion(p_slug text, p_host_token text, p_participant_a_id uuid, p_participant_b_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
  v_low  uuid := least(p_participant_a_id, p_participant_b_id);
  v_high uuid := greatest(p_participant_a_id, p_participant_b_id);
  v_id   uuid;
begin
  perform amigosecreto.require_not_drawn(g);
  if v_low = v_high or v_low is null then
    raise exception 'exclusion_invalid' using errcode = '22023';
  end if;
  if (select count(*) from amigosecreto.participants where group_id = g.id and id in (v_low, v_high)) <> 2 then
    raise exception 'participant_not_found' using errcode = 'P0002';
  end if;
  insert into amigosecreto.exclusions (group_id, participant_a_id, participant_b_id)
  values (g.id, v_low, v_high)
  on conflict (participant_a_id, participant_b_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from amigosecreto.exclusions where participant_a_id = v_low and participant_b_id = v_high;
  end if;
  return v_id;
end $$;

create function public.as_delete_exclusion(p_slug text, p_host_token text, p_exclusion_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
begin
  perform amigosecreto.require_not_drawn(g);
  delete from amigosecreto.exclusions where id = p_exclusion_id and group_id = g.id;
end $$;

-- The draw: one random cycle through everyone (A→B→C→…→A), so nobody draws themselves and,
-- with 3 or more people, no two people draw each other. Exclusions are checked on every link
-- of the cycle; a few thousand random tries cover any realistic family group, and a group
-- with impossible exclusions gets 'draw_impossible' instead of a hang.
create function public.as_draw(p_slug text, p_host_token text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
  v_ids     uuid[];
  v_order   uuid[];
  v_count   int;
  v_is_ok   boolean := false;
  v_drawn_at timestamptz := now();
begin
  perform amigosecreto.require_not_drawn(g);
  perform pg_advisory_xact_lock(hashtext('as_group:' || g.id::text));

  v_ids := array(select id from amigosecreto.participants where group_id = g.id);
  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count < 3 then
    raise exception 'not_enough_participants' using errcode = 'P0001';
  end if;

  for v_attempt in 1..5000 loop
    v_order := array(select x from unnest(v_ids) as x order by random());
    v_is_ok := not exists (
      select 1
      from generate_series(1, v_count) as i
      join amigosecreto.exclusions e
        on e.participant_a_id = least(v_order[i], v_order[(i % v_count) + 1])
       and e.participant_b_id = greatest(v_order[i], v_order[(i % v_count) + 1]));
    exit when v_is_ok;
  end loop;

  if not v_is_ok then
    raise exception 'draw_impossible' using errcode = 'P0001';
  end if;

  update amigosecreto.participants p
  set recipient_id = v_order[(c.i % v_count) + 1], revealed_at = null
  from generate_series(1, v_count) as c(i)
  where p.id = v_order[c.i];

  update amigosecreto.groups set drawn_at = v_drawn_at, updated_at = now() where id = g.id;
  return v_drawn_at;
end $$;

-- Undo the draw (to add someone or change exclusions). Everyone will need to look again.
create function public.as_reset_draw(p_slug text, p_host_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
begin
  update amigosecreto.participants set recipient_id = null, revealed_at = null where group_id = g.id;
  update amigosecreto.groups set drawn_at = null, updated_at = now() where id = g.id;
end $$;

create function public.as_delete_group(p_slug text, p_host_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g amigosecreto.groups := amigosecreto.require_host_group(p_slug, p_host_token);
begin
  delete from amigosecreto.groups where id = g.id;
end $$;

------------------------------------------------------------------------
-- 6. Grants: only the public RPCs, for the browser (anon) role
------------------------------------------------------------------------
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname like 'as\_%'
  loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
