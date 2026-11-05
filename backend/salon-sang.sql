-- ============================================================================================
--  Salon Sang — appointments backend (Supabase / Postgres)
--  Paste this whole file into Supabase → SQL Editor → Run. Safe to run again (idempotent).
--
--  What it does
--   • Sang's portal is the source of truth: services, open times, appointments, message settings.
--   • The website can only (1) read services, (2) see free start times inside the openings Sang
--     added, and (3) book one of those times. It can never read anyone's appointment.
--   • Texts to clients are queued in public.messages. Sang's iPhone (an Apple Shortcuts
--     automation that runs every hour) asks for whatever is due, sends it from her own number,
--     and marks it sent. Reminders go out ~4 hours before the appointment, never before 8 AM.
--   • New online bookings ping Sang instantly through the free ntfy app (ntfy.sh).
--
--  After running: put Sang's login email in the line marked  >>> OWNER EMAIL <<<  (bottom),
--  or run:  update private.config set owner_emails = array['sang@example.com'];
-- ============================================================================================

create extension if not exists pgcrypto;
do $$ begin create extension if not exists pg_net;  exception when others then raise notice 'pg_net not available'; end $$;
do $$ begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron not available'; end $$;

create schema if not exists private;          -- not exposed through the API
revoke all on schema private from public;

-- ---------------------------------------------------------------- private config (secrets)
create table if not exists private.config (
  id            int primary key default 1 check (id = 1),
  owner_emails  text[] not null default '{}',
  phone_token   text not null default encode(gen_random_bytes(18), 'hex'),   -- for Sang's iPhone Shortcut
  ntfy_topic    text not null default 'salonsang-' || encode(gen_random_bytes(9), 'hex'),
  last_summary  date
);
insert into private.config (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------- public tables
create table if not exists public.settings (
  id                   int primary key default 1 check (id = 1),
  booking_open         boolean not null default true,
  tz                   text not null default 'America/Los_Angeles',
  slot_step_min        int  not null default 30  check (slot_step_min between 5 and 120),
  buffer_min           int  not null default 10  check (buffer_min between 0 and 120),
  min_notice_min       int  not null default 120 check (min_notice_min between 0 and 10080),
  max_days_ahead       int  not null default 60  check (max_days_ahead between 1 and 365),
  remind_hours_before  numeric not null default 4 check (remind_hours_before between 0.5 and 48),
  remind_earliest      time not null default '08:00',
  confirm_template     text not null default
    'Hi {first}! 💅 You''re all booked at Salon Sang: {service}, {when}. Sola Salon Studios, Suite 12 (440 W 6th Ave). Can''t wait to see you! ✨ Need to change it? Just reply or call 530-648-4977 💖',
  reminder_template    text not null default
    'Good morning, {first}! ✨ Today''s the big day: your {service} with Sang is at {time}. Salon Sang · Sola Salon Studios, Suite 12. Can''t wait to pamper you! Need to change it? Reply or call 530-648-4977 💖',
  reminder_template_pm text not null default
    'Hi {first}! ✨ Just a sweet reminder: your {service} with Sang is today at {time}. Salon Sang · Sola Salon Studios, Suite 12. See you soon! 💅 Need to change it? Reply or call 530-648-4977 💖',
  updated_at           timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

create table if not exists public.services (
  id        serial primary key,
  category  text not null,                 -- Manicure, Pedicure, Full set, Fill, Overlay, Extras, Add-on
  name      text not null,
  price     text not null,                 -- shown as written: "$45", "$65+", "+$5"
  minutes   int  not null check (minutes between 5 and 480),
  is_addon  boolean not null default false,
  online    boolean not null default true, -- bookable on the website
  active    boolean not null default true,
  sort      int not null default 0
);

create table if not exists public.openings (
  id         bigserial primary key,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  note       text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists openings_range on public.openings (starts_at, ends_at);

create table if not exists public.appointments (
  id                bigserial primary key,
  service_id        int references public.services(id) on delete set null,
  service_name      text not null,          -- snapshot, so history stays readable if the menu changes
  addons            text[] not null default '{}',
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  client_name       text not null check (length(client_name) between 1 and 80),
  client_phone      text,                   -- +1XXXXXXXXXX
  note              text check (length(note) <= 500),
  source            text not null default 'portal' check (source in ('web','portal')),
  status            text not null default 'booked' check (status in ('booked','cancelled','done','no_show')),
  texts_ok          boolean not null default true,   -- client agreed to appointment texts
  send_confirmation boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists appt_start on public.appointments (starts_at);
create index if not exists appt_phone on public.appointments (client_phone);

create table if not exists public.messages (
  id             bigserial primary key,
  appointment_id bigint references public.appointments(id) on delete cascade,
  kind           text not null check (kind in ('confirm','reminder','custom')),
  to_phone       text not null,
  body           text,                     -- only for 'custom'; others are written fresh when sent
  send_after     timestamptz not null default now(),
  status         text not null default 'pending' check (status in ('pending','sent','skipped')),
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists msg_due on public.messages (status, send_after);

-- ---------------------------------------------------------------- helpers
create or replace function private.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'email') = any (c.owner_emails), false) from private.config c where c.id = 1
$$;
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$ select private.is_owner() $$;

-- digits → +1XXXXXXXXXX (US numbers), or null when it isn't a valid 10-digit number
create or replace function private.norm_phone(p text) returns text
language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p,''), '\D', '', 'g');
begin
  if length(d) = 11 and left(d,1) = '1' then d := substr(d,2); end if;
  if length(d) <> 10 or left(d,1) in ('0','1') then return null; end if;
  return '+1' || d;
end $$;

create or replace function private.cfg() returns public.settings
language sql stable security definer set search_path = '' as $$ select * from public.settings where id = 1 $$;

-- fill a message template for an appointment ({first} {name} {service} {time} {day} {when} {date})
create or replace function private.render(tpl text, a public.appointments) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  s   public.settings := private.cfg();
  st  timestamp := a.starts_at at time zone s.tz;
  today date := (now() at time zone s.tz)::date;
  tm  text := ltrim(to_char(st, 'FMHH12:MI AM'), '0');
  dy  text;
  svc text := a.service_name || case when cardinality(a.addons) > 0 then ' + ' || array_to_string(a.addons, ', ') else '' end;
begin
  tm := replace(tm, ':00 ', ' ');
  dy := case when st::date = today then 'today'
             when st::date = today + 1 then 'tomorrow'
             else to_char(st, 'FMDay, FMMon FMDD') end;
  return replace(replace(replace(replace(replace(replace(replace(tpl,
    '{first}', split_part(btrim(a.client_name), ' ', 1)),
    '{name}', btrim(a.client_name)),
    '{service}', svc),
    '{time}', tm),
    '{day}', dy),
    '{date}', to_char(st, 'FMDay, FMMon FMDD')),
    '{when}', dy || ' at ' || tm);
end $$;

-- ping Sang's phone through ntfy (free, open source). Never lets a failure block a booking.
create or replace function private.alert(p_title text, p_message text) returns void
language plpgsql security definer set search_path = '' as $$
declare c private.config := (select x from private.config x where id = 1);
begin
  perform net.http_post(
    url     := 'https://ntfy.sh/',
    body    := jsonb_build_object('topic', c.ntfy_topic, 'title', p_title, 'message', p_message,
                                  'tags', jsonb_build_array('nail_care'), 'click', 'https://salonsang.com/portal/'),
    headers := jsonb_build_object('Content-Type', 'application/json'));
exception when others then
  raise notice 'alert not sent: %', sqlerrm;
end $$;

-- free start times for a service of p_minutes between p_from and p_to (web booking rules)
create or replace function private.free_starts(p_minutes int, p_from timestamptz, p_to timestamptz)
returns setof timestamptz language sql stable security definer set search_path = '' as $$
  with s as (select * from public.settings where id = 1),
  win as (
    select greatest(o.starts_at, p_from) as a, least(o.ends_at, p_to + make_interval(mins => p_minutes)) as b, o.starts_at as o_start
    from public.openings o
    where o.ends_at > p_from and o.starts_at < p_to
  ),
  cand as (
    -- starts aligned to the step, counted from the opening's own start (so 9:30 openings give 9:30, 10:00 …)
    select distinct g as t
    from win, s,
         generate_series(win.o_start, win.b - make_interval(mins => p_minutes), make_interval(mins => s.slot_step_min)) g
    where g >= win.a
  )
  select c.t from cand c, s
  where c.t >= now() + make_interval(mins => s.min_notice_min)
    and c.t <  now() + make_interval(days => s.max_days_ahead)
    and c.t <= p_to
    -- the whole service must fit inside one opening
    and exists (select 1 from public.openings o
                where o.starts_at <= c.t and o.ends_at >= c.t + make_interval(mins => p_minutes))
    -- and must not touch an existing appointment (plus a little clean-up buffer)
    and not exists (select 1 from public.appointments ap
                    where ap.status = 'booked'
                      and ap.starts_at < c.t + make_interval(mins => p_minutes + s.buffer_min)
                      and ap.ends_at   > c.t - make_interval(mins => s.buffer_min))
  order by 1
$$;

-- (re)queue the texts for one appointment
create or replace function private.queue_messages(a public.appointments, p_confirm boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.settings := private.cfg();
  local_start timestamp := a.starts_at at time zone s.tz;
  earliest timestamptz := ((local_start::date + s.remind_earliest) at time zone s.tz);
  remind_at timestamptz;
begin
  delete from public.messages where appointment_id = a.id and status = 'pending' and kind in ('confirm','reminder');
  if a.status <> 'booked' or a.client_phone is null or not a.texts_ok or a.starts_at <= now() then return; end if;

  if p_confirm then
    insert into public.messages (appointment_id, kind, to_phone, send_after) values (a.id, 'confirm', a.client_phone, now());
  end if;

  -- reminder: ~N hours before, but not before the morning cut-off (8 AM). For appointments that
  -- start before 8 AM, 30 minutes before.
  remind_at := greatest(a.starts_at - make_interval(secs => (s.remind_hours_before * 3600)::int), earliest);
  if remind_at >= a.starts_at then remind_at := a.starts_at - interval '30 minutes'; end if;
  -- skip when the confirmation would arrive about the same time anyway (booked last-minute)
  if remind_at < now() + interval '45 minutes' and (p_confirm or a.starts_at < now() + interval '90 minutes') then return; end if;
  insert into public.messages (appointment_id, kind, to_phone, send_after)
  values (a.id, 'reminder', a.client_phone, greatest(remind_at, now()));
end $$;

create or replace function private.appt_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function private.appt_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.queue_messages(new, new.send_confirmation);
  elsif new.status is distinct from old.status
     or new.starts_at is distinct from old.starts_at
     or new.client_phone is distinct from old.client_phone
     or new.texts_ok is distinct from old.texts_ok then
    -- moved or changed: send a fresh confirmation only if the time actually moved
    perform private.queue_messages(new, new.starts_at is distinct from old.starts_at and new.send_confirmation);
  end if;
  return null;
end $$;

drop trigger if exists appt_touch on public.appointments;
create trigger appt_touch before insert or update on public.appointments for each row execute function private.appt_changed();
drop trigger if exists appt_msgs on public.appointments;
create trigger appt_msgs after insert or update on public.appointments for each row execute function private.appt_after();

-- ---------------------------------------------------------------- PUBLIC API (website)
create or replace function public.booking_info() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'open', s.booking_open, 'tz', s.tz, 'step', s.slot_step_min, 'max_days', s.max_days_ahead,
    'services', coalesce((select json_agg(json_build_object('id', v.id, 'category', v.category, 'name', v.name,
                  'price', v.price, 'minutes', v.minutes, 'addon', v.is_addon) order by v.sort, v.id)
                from public.services v where v.active and v.online), '[]'::json))
  from public.settings s where s.id = 1
$$;

-- free start times for a service (+ add-ons) over the next p_days days starting at local date p_from
create or replace function public.open_slots(p_service int, p_addons int[] default '{}', p_from date default null, p_days int default 14)
returns setof timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  s public.settings := private.cfg();
  mins int;
  d0 date := coalesce(p_from, (now() at time zone s.tz)::date);
begin
  if not s.booking_open then return; end if;
  select sum(v.minutes) into mins from public.services v
   where v.active and v.online and (v.id = p_service or v.id = any (coalesce(p_addons,'{}')))
     and (v.id = p_service) = not v.is_addon;
  if mins is null or not exists (select 1 from public.services where id = p_service and active and online and not is_addon) then return; end if;
  return query select * from private.free_starts(mins, (d0::timestamp at time zone s.tz),
                      ((d0 + least(greatest(p_days,1), 62))::timestamp at time zone s.tz));
end $$;

-- book an open time from the website
create or replace function public.book(p_service int, p_start timestamptz, p_name text, p_phone text,
                                       p_note text default null, p_texts_ok boolean default true, p_addons int[] default '{}')
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  s public.settings := private.cfg();
  svc public.services;
  addon_names text[];
  mins int;
  phone text := private.norm_phone(p_phone);
  nm text := btrim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g'));
  a public.appointments;
  local_start timestamp;
begin
  perform pg_advisory_xact_lock(7104977);                      -- one booking at a time: no double-booking races
  if not s.booking_open then raise exception 'Online booking is paused right now. Please call or text 530-648-4977.' using errcode = 'P0001'; end if;
  if length(nm) < 2 or length(nm) > 80 then raise exception 'Please enter your name.' using errcode = 'P0001'; end if;
  if phone is null then raise exception 'Please enter a valid 10-digit phone number.' using errcode = 'P0001'; end if;
  if length(coalesce(p_note,'')) > 300 then raise exception 'That note is a little long (300 characters max).' using errcode = 'P0001'; end if;

  select * into svc from public.services where id = p_service and active and online and not is_addon;
  if not found then raise exception 'Please pick a service.' using errcode = 'P0001'; end if;
  select array_agg(name order by sort, id), coalesce(sum(minutes),0) into addon_names, mins
    from public.services where id = any (coalesce(p_addons,'{}')) and active and online and is_addon;
  mins := svc.minutes + coalesce(mins,0);

  -- gentle abuse limits
  if (select count(*) from public.appointments where client_phone = phone and status = 'booked' and starts_at > now() and source = 'web') >= 3 then
    raise exception 'You already have a few upcoming bookings. Please text 530-648-4977 to book more.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.appointments where source = 'web' and created_at > now() - interval '1 hour') >= 15 then
    raise exception 'Booking is very busy right now. Please call or text 530-648-4977.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from private.free_starts(mins, p_start - interval '1 minute', p_start + interval '1 minute') t where t = p_start) then
    raise exception 'So sorry, that time was just taken. Please pick another time 💖' using errcode = 'P0001';
  end if;

  insert into public.appointments (service_id, service_name, addons, starts_at, ends_at, client_name, client_phone, note, source, texts_ok, send_confirmation)
  values (svc.id, svc.name, coalesce(addon_names,'{}'), p_start, p_start + make_interval(mins => mins), nm, phone,
          nullif(btrim(coalesce(p_note,'')),''), 'web', coalesce(p_texts_ok, true), true)
  returning * into a;

  local_start := a.starts_at at time zone s.tz;
  perform private.alert('New booking 💅',
    a.client_name || ' · ' || a.service_name ||
    case when cardinality(a.addons) > 0 then ' + ' || array_to_string(a.addons, ', ') else '' end ||
    E'\n' || to_char(local_start, 'FMDay, FMMon FMDD') || ' at ' || ltrim(to_char(local_start, 'FMHH12:MI AM'), '0') ||
    E'\n' || a.client_phone || coalesce(E'\n“' || a.note || '”', ''));

  return json_build_object('id', a.id, 'service', a.service_name, 'addons', a.addons,
                           'starts_at', a.starts_at, 'ends_at', a.ends_at, 'name', a.client_name);
end $$;

-- ---------------------------------------------------------------- SANG'S iPHONE (Shortcuts)
-- The Shortcut calls phone_outbox every hour with the secret token, texts each item, then calls phone_sent.
create or replace function public.phone_outbox(p_token text) returns json
language plpgsql volatile security definer set search_path = '' as $$
declare out json;
begin
  if p_token is null or p_token <> (select phone_token from private.config where id = 1) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- reminders for appointments that were cancelled, finished or already started are skipped
  update public.messages m set status = 'skipped'
   from public.appointments a
   where m.appointment_id = a.id and m.status = 'pending'
     and (a.status <> 'booked' or a.starts_at <= now() or not a.texts_ok);
  select coalesce(json_agg(json_build_object('id', m.id, 'phone', m.to_phone,
           'text', case when m.kind = 'custom' then m.body
                        when m.kind = 'confirm' then private.render(s.confirm_template, a)
                        when (a.starts_at at time zone s.tz)::time < time '12:00' then private.render(s.reminder_template, a)
                        else private.render(s.reminder_template_pm, a) end)
           order by m.send_after, m.id), '[]'::json)
    into out
    from public.messages m
    left join public.appointments a on a.id = m.appointment_id
    cross join public.settings s
   where s.id = 1 and m.status = 'pending' and m.send_after <= now() + interval '10 minutes';
  return out;
end $$;

create or replace function public.phone_sent(p_token text, p_id bigint) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_token is null or p_token <> (select phone_token from private.config where id = 1) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.messages set status = 'sent', sent_at = now() where id = p_id and status = 'pending';
  return found;
end $$;

-- ---------------------------------------------------------------- PORTAL helpers (owner only)
create or replace function public.owner_setup() returns json
language plpgsql stable security definer set search_path = '' as $$
declare c private.config := (select x from private.config x where id = 1);
begin
  if not private.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  return json_build_object('phone_token', c.phone_token, 'ntfy_topic', c.ntfy_topic);
end $$;

-- the text a message will say if sent right now (for the portal's one-tap "send from my phone")
create or replace function public.message_preview(p_id bigint) returns text
language plpgsql stable security definer set search_path = '' as $$
declare m public.messages; a public.appointments; s public.settings := private.cfg();
begin
  if not private.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into m from public.messages where id = p_id;
  if m.kind = 'custom' then return m.body; end if;
  select * into a from public.appointments where id = m.appointment_id;
  return case when m.kind = 'confirm' then private.render(s.confirm_template, a)
              when (a.starts_at at time zone s.tz)::time < time '12:00' then private.render(s.reminder_template, a)
              else private.render(s.reminder_template_pm, a) end;
end $$;

-- fill in a template with sample data (portal settings preview)
create or replace function public.template_preview(p_tpl text, p_start timestamptz default null) returns text
language plpgsql stable security definer set search_path = '' as $$
declare a public.appointments;
begin
  if not private.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  a.client_name := 'Jessica Rivera'; a.service_name := 'Gel Manicure'; a.addons := '{}';
  a.starts_at := coalesce(p_start, date_trunc('hour', now()) + interval '5 hours');
  return private.render(p_tpl, a);
end $$;

-- returning clients for quick entry (name + phone), most recent first
create or replace function public.owner_clients(p_q text default '') returns table(name text, phone text, last_visit timestamptz, visits bigint)
language sql stable security definer set search_path = '' as $$
  select (array_agg(client_name order by starts_at desc))[1], client_phone, max(starts_at), count(*)
    from public.appointments
   where private.is_owner() and client_phone is not null
     and (p_q = '' or client_name ilike '%' || p_q || '%'
          or (regexp_replace(p_q, '\D', '', 'g') <> '' and client_phone like '%' || regexp_replace(p_q, '\D', '', 'g') || '%'))
   group by client_phone
   order by max(starts_at) desc
   limit 12
$$;

-- ---------------------------------------------------------------- daily summary + housekeeping
create or replace function private.tick() returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.settings := private.cfg();
  c private.config := (select x from private.config x where id = 1);
  today date := (now() at time zone s.tz)::date;
  n int; first_t text;
begin
  -- mark past appointments done
  update public.appointments set status = 'done' where status = 'booked' and ends_at < now() - interval '6 hours';
  -- morning summary to Sang (once a day, a little before the reminder cut-off)
  if (now() at time zone s.tz)::time >= s.remind_earliest - interval '30 minutes' and (c.last_summary is null or c.last_summary < today) then
    select count(*), min(ltrim(to_char(starts_at at time zone s.tz, 'FMHH12:MI AM'), '0')) into n, first_t
      from public.appointments where status = 'booked' and (starts_at at time zone s.tz)::date = today;
    update private.config set last_summary = today where id = 1;
    if n > 0 then
      perform private.alert('Good morning, Sang ☀️', n || case when n = 1 then ' appointment' else ' appointments' end || ' today. First one at ' || first_t || '. You''ve got this 💖');
    end if;
  end if;
end $$;

do $$ begin
  perform cron.unschedule('salon-sang-tick');
exception when others then null; end $$;
do $$ begin
  perform cron.schedule('salon-sang-tick', '*/15 * * * *', 'select private.tick()');
exception when others then raise notice 'pg_cron not scheduled: %', sqlerrm; end $$;

-- ---------------------------------------------------------------- security: row level security
alter table public.settings     enable row level security;
alter table public.services     enable row level security;
alter table public.openings     enable row level security;
alter table public.appointments enable row level security;
alter table public.messages     enable row level security;

do $$ declare t text; begin
  foreach t in array array['settings','services','openings','appointments','messages'] loop
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all to authenticated using (private.is_owner()) with check (private.is_owner())', t);
  end loop;
end $$;
-- (the website reads services and slots only through booking_info() / open_slots(), never the tables)

grant usage on schema private to authenticated;   -- needed so policies can call private.is_owner()
revoke all on all tables in schema private from anon, authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_owner() to authenticated;

revoke execute on function public.owner_setup(), public.message_preview(bigint), public.template_preview(text, timestamptz), public.owner_clients(text) from public, anon;
grant  execute on function public.owner_setup(), public.message_preview(bigint), public.template_preview(text, timestamptz), public.owner_clients(text) to authenticated;
grant  execute on function public.booking_info(), public.open_slots(int, int[], date, int),
                           public.book(int, timestamptz, text, text, text, boolean, int[]),
                           public.phone_outbox(text), public.phone_sent(text, bigint), public.is_owner() to anon, authenticated;

-- ---------------------------------------------------------------- the menu (minutes are first guesses; Sang can edit them in the portal)
insert into public.services (id, category, name, price, minutes, is_addon, online, sort) values
  (1,  'Manicure', 'Spa Manicure',          '$35', 45, false, true, 10),
  (2,  'Manicure', 'Gel Manicure',          '$45', 60, false, true, 11),
  (3,  'Manicure', 'Deluxe Manicure',       '$45', 60, false, true, 12),
  (4,  'Manicure', 'Premier Manicure',      '$50', 75, false, true, 13),
  (5,  'Manicure', 'Deluxe Gel Manicure',   '$55', 75, false, true, 14),
  (6,  'Manicure', 'Premier Gel Manicure',  '$60', 90, false, true, 15),
  (7,  'Pedicure', 'Spa Pedicure',          '$45', 60, false, true, 20),
  (8,  'Pedicure', 'Gel Pedicure',          '$55', 75, false, true, 21),
  (9,  'Pedicure', 'Deluxe Pedicure',       '$65', 75, false, true, 22),
  (10, 'Pedicure', 'Premier Pedicure',      '$70', 90, false, true, 23),
  (11, 'Pedicure', 'Deluxe Gel Pedicure',   '$75', 90, false, true, 24),
  (12, 'Pedicure', 'Premier Gel Pedicure',  '$80', 105, false, true, 25),
  (13, 'Full set', 'Dipping full set',      '$65+', 90, false, true, 30),
  (14, 'Full set', 'Hard Gel full set',     '$65+', 105, false, true, 31),
  (15, 'Full set', 'Builder Gel full set',  '$65+', 105, false, true, 32),
  (16, 'Full set', 'Gel-X full set',        '$65+', 90, false, true, 33),
  (17, 'Fill',     'Dip Powder fill',       '$55', 75, false, true, 40),
  (18, 'Fill',     'Hard Gel fill',         '$50+', 75, false, true, 41),
  (19, 'Fill',     'Builder Gel fill',      '$50+', 75, false, true, 42),
  (20, 'Overlay',  'Dip Powder overlay',    '$55', 75, false, true, 50),
  (21, 'Overlay',  'Hard Gel overlay',      '$55', 75, false, true, 51),
  (22, 'Overlay',  'Builder Gel overlay',   '$55', 75, false, true, 52),
  (23, 'Extras',   'Polish Change',         '$20', 20, false, true, 60),
  (24, 'Extras',   'Gel Polish Change',     '$30', 30, false, true, 61),
  (25, 'Extras',   'Nail Trim',             '$15', 15, false, true, 62),
  (26, 'Extras',   'Toenail Trim',          '$20', 20, false, true, 63),
  (27, 'Add-on',   'French Tip',            '+$5', 10, true, true, 70),
  (28, 'Add-on',   'French Tip Gel',        '+$10', 15, true, true, 71),
  (29, 'Add-on',   'Callus Removal',        '+$10', 10, true, true, 72),
  (30, 'Add-on',   'Take Off Gel',          '$10', 10, true, true, 73),
  (31, 'Add-on',   'Take Off Dip, Hard Gel or Builder', '$15', 20, true, true, 74),
  (32, 'Add-on',   'Nail Repair',           '$5 each', 5, true, true, 75)
on conflict (id) do nothing;
select setval(pg_get_serial_sequence('public.services','id'), greatest((select max(id) from public.services), 1));

-- >>> OWNER EMAIL <<<  (Sang's portal login; add more emails to the array if needed)
-- update private.config set owner_emails = array['sang@example.com'];
