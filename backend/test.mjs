// Runs backend/salon-sang.sql in a real Postgres (PGlite) with small stand-ins for Supabase's
// auth.jwt() and pg_net, then exercises the booking, security and reminder rules.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('./salon-sang.sql', import.meta.url), 'utf8');
const db = new PGlite({ extensions: { pgcrypto } });
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) fails++; };
const q = async (s, p) => (await db.query(s, p)).rows;
const asRole = async (role, email, fn) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${JSON.stringify(email ? { email } : {})}', false);`);
  try { return await fn(); } finally { await db.exec('reset role;'); }
};

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.jwt() to anon, authenticated;
  create schema net;
  create table net.calls (id serial, url text, body jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.calls(url, body) values (url, body) returning id $$;
  grant usage on schema public to anon, authenticated;
`);
await db.exec(sql);
// Supabase grants table privileges to anon/authenticated by default; RLS does the protecting
await db.exec(`grant all on all tables in schema public to anon, authenticated; grant all on all sequences in schema public to anon, authenticated;`);
await db.exec(`update private.config set owner_emails = array['sang@salonsang.com'];`);
await db.exec(sql); // idempotent re-run
console.log('schema loaded twice ✓');

const tz = 'America/Los_Angeles';
// openings: tomorrow 9:30–17:00 local, and the day after 9:30–12:00
await db.exec(`
  insert into public.openings (starts_at, ends_at) values
   (((now() at time zone '${tz}')::date + 1 + time '09:30') at time zone '${tz}', ((now() at time zone '${tz}')::date + 1 + time '17:00') at time zone '${tz}'),
   (((now() at time zone '${tz}')::date + 2 + time '09:30') at time zone '${tz}', ((now() at time zone '${tz}')::date + 2 + time '12:00') at time zone '${tz}');`);

console.log('\nWebsite (anon)');
await asRole('anon', null, async () => {
  const info = (await q('select public.booking_info() j'))[0].j;
  ok(info.open && info.services.length === 32, `booking_info lists ${info.services.length} services`);
  let denied = false; try { await q('select * from public.appointments'); } catch { denied = true; }
  const rows = denied ? [] : await q('select * from public.appointments');
  ok(rows.length === 0, 'anon cannot read appointments');
  let blocked = false; try { await q("insert into public.openings(starts_at, ends_at) values (now(), now()+interval '1h')"); } catch { blocked = true; }
  ok(blocked, 'anon cannot add openings');
  let tokenBlocked = false; try { await q('select public.owner_setup()'); } catch { tokenBlocked = true; }
  ok(tokenBlocked, 'anon cannot read the phone token');
});

const slots = await asRole('anon', null, () => q(`select t from public.open_slots(2, '{}', null, 7) t`));
const local = r => new Date(r.t).toLocaleString('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' });
console.log('  first slots:', slots.slice(0, 4).map(local).join(', '), '…', slots.length, 'total');
ok(slots.length > 0 && local(slots[0]).includes('9:30'), 'Gel Manicure slots start at 9:30 AM tomorrow');
const lastDay1 = slots.filter(r => local(r).startsWith(local(slots[0]).slice(0, 3))).pop();
ok(local(lastDay1).includes('4:00'), `last start that fits before 5 PM is ${local(lastDay1)} (60 min service)`);

// book 10:00 tomorrow
const ten = slots.find(r => local(r).includes('10:00'));
const booked = await asRole('anon', null, () => q(`select public.book(2, $1, 'Jessica Rivera', '(541) 555-0142', 'Pink please!', true, '{27}') j`, [ten.t]));
ok(booked[0].j.id > 0, `booked Gel Manicure + French Tip at ${local(ten)}`);
const appt = (await q('select * from public.appointments where id = $1', [booked[0].j.id]))[0];
ok(appt.client_phone === '+15415550142' && (new Date(appt.ends_at) - new Date(appt.starts_at)) / 60000 === 70, 'phone normalized, length = 60 + 10 min add-on');

let dup = ''; try { await asRole('anon', null, () => q(`select public.book(2, $1, 'Someone Else', '5415550199')`, [ten.t])); } catch (e) { dup = e.message; }
ok(/just taken/.test(dup), 'same time cannot be booked twice');
const after = await asRole('anon', null, () => q(`select t from public.open_slots(2, '{}', null, 7) t`));
const gone = after.filter(r => { const h = local(r); return h.startsWith(local(ten).slice(0, 3)) && /(9:30|10:00|10:30|11:00) AM/.test(h); }).map(local);
ok(gone.length === 0, `9:30–11:00 starts are no longer offered tomorrow (overlap + 10 min buffer); next is ${local(after.find(r => local(r).startsWith(local(ten).slice(0,3)) && new Date(r.t) > new Date(ten.t)))}`);
let bad = ''; try { await asRole('anon', null, () => q(`select public.book(2, $1, 'X Y', '123')`, [after[0].t])); } catch (e) { bad = e.message; }
ok(/valid 10-digit/.test(bad), 'bad phone rejected');
let outside = ''; try { await asRole('anon', null, () => q(`select public.book(2, now() + interval '3 days 3 hours', 'Ann Lee', '5415550100')`)); } catch (e) { outside = e.message; }
ok(/just taken/.test(outside), 'times outside Sang\'s openings cannot be booked');

const alerts = await q('select body from net.calls');
ok(alerts.length === 1 && /New booking/.test(alerts[0].body.title) && /Jessica/.test(alerts[0].body.message), 'Sang got an ntfy alert: ' + JSON.stringify(alerts[0]?.body.message));

console.log('\nTexts');
const msgs = await q('select kind, send_after from public.messages where appointment_id = $1 order by id', [appt.id]);
ok(msgs.map(m => m.kind).join() === 'confirm,reminder', 'queued a confirmation and a reminder');
const rem = msgs.find(m => m.kind === 'reminder');
ok(new Date(rem.send_after).toLocaleTimeString('en-US', { timeZone: tz }) === '8:00:00 AM', `10:00 AM appointment → reminder at ${new Date(rem.send_after).toLocaleTimeString('en-US', { timeZone: tz })} (not 6 AM)`);

// a 2:30 PM appointment entered by Sang in the portal
await asRole('authenticated', 'sang@salonsang.com', () => q(`insert into public.appointments (service_name, starts_at, ends_at, client_name, client_phone)
  values ('Spa Pedicure', ((now() at time zone '${tz}')::date + 1 + time '14:30') at time zone '${tz}', ((now() at time zone '${tz}')::date + 1 + time '15:30') at time zone '${tz}', 'Mai Tran', '+15415550111')`));
const rem2 = (await q(`select send_after from public.messages m join public.appointments a on a.id = m.appointment_id where a.client_name = 'Mai Tran' and kind = 'reminder'`))[0];
ok(new Date(rem2.send_after).toLocaleTimeString('en-US', { timeZone: tz }) === '10:30:00 AM', `2:30 PM appointment → reminder at ${new Date(rem2.send_after).toLocaleTimeString('en-US', { timeZone: tz })} (4 hours before)`);

console.log('\nSang\'s iPhone Shortcut');
const token = (await q('select phone_token from private.config'))[0].phone_token;
let wrong = false; try { await asRole('anon', null, () => q(`select public.phone_outbox('nope')`)); } catch { wrong = true; }
ok(wrong, 'wrong token is refused');
const box = (await asRole('anon', null, () => q(`select public.phone_outbox($1) j`, [token])))[0].j;
ok(box.length === 2 && box.every(m => m.phone && m.text), `outbox has ${box.length} due confirmations now (reminders wait until their time)`);
console.log('    → ' + box[0].text);
await asRole('anon', null, () => q(`select public.phone_sent($1, $2)`, [token, box[0].id]));
const box2 = (await asRole('anon', null, () => q(`select public.phone_outbox($1) j`, [token])))[0].j;
ok(box2.length === 1, 'marked-sent message is not sent again');

// pretend it's reminder time: move Jessica's reminder into the past and render it
await q(`update public.messages set send_after = now() - interval '1 minute' where appointment_id = $1 and kind = 'reminder'`, [appt.id]);
const box3 = (await asRole('anon', null, () => q(`select public.phone_outbox($1) j`, [token])))[0].j;
const r3 = box3.find(m => /big day/.test(m.text));
ok(!!r3, 'morning reminder text rendered');
console.log('    → ' + r3?.text);

console.log('\nPortal (Sang)');
await asRole('authenticated', 'sang@salonsang.com', async () => {
  const n = (await q('select count(*)::int n from public.appointments'))[0].n;
  ok(n === 2, 'Sang sees all appointments');
  const setup = (await q('select public.owner_setup() j'))[0].j;
  ok(setup.phone_token === token && setup.ntfy_topic.startsWith('salonsang-'), 'Sang can read her phone token + alert topic');
  await q(`update public.appointments set status = 'cancelled' where client_name = 'Jessica Rivera'`);
  const pend = (await q(`select count(*)::int n from public.messages where appointment_id = $1 and status = 'pending'`, [appt.id]))[0].n;
  ok(pend === 0, 'cancelling removes pending texts');
  const clients = await q(`select * from public.owner_clients('mai')`);
  ok(clients.length === 1 && clients[0].phone === '+15415550111', 'client lookup by name works');
  const prev = (await q(`select public.template_preview((select reminder_template from public.settings)) t`))[0].t;
  ok(/Jessica/.test(prev), 'template preview: ' + prev);
});
await asRole('authenticated', 'someone@else.com', async () => {
  const n = (await q('select count(*)::int n from public.appointments'))[0].n;
  ok(n === 0, 'a different logged-in user sees nothing');
});
const freed = await asRole('anon', null, () => q(`select t from public.open_slots(2, '{}', null, 7) t`));
ok(freed.some(r => r.t.getTime() === new Date(ten.t).getTime()), 'cancelled 10:00 slot is open again');

await db.exec(`select private.tick()`);
ok(true, 'daily tick runs');
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
