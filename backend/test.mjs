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
// the original tests use explicit open times only; weekly hours get their own test at the end
await db.exec(`update public.settings set week_hours = '{}', slot_step_min = 30, buffer_min = 10`);  // older tests were written for 30-min steps + a 10-min break
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
  ok(info.open && info.services.length === 35, `booking_info lists ${info.services.length} services`);
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
ok(local(lastDay1).includes('5:00'), `5 PM is the last START (visit runs past it): ${local(lastDay1)} (60 min service)`);

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

console.log('\nTaxes + supplies');
await asRole('authenticated', 'sang@salonsang.com', async () => {
  await q(`update public.appointments set paid = 52.50 where client_name = 'Mai Tran'`);
  ok((await q(`select paid from public.appointments where client_name = 'Mai Tran'`))[0].paid == 52.5, 'Sang can record what a client paid');
  await q(`insert into public.receipts (kind, amount, note, photo_path) values ('receipt', 23.40, 'Sally Beauty: acetone', '2026/a.jpg'), ('note', null, 'Bought a new lamp with cash', null)`);
  ok((await q('select count(*)::int n from public.receipts'))[0].n === 2, 'Sang adds a receipt and a note');
  const [sup] = await q(`insert into public.supplies (name, kind) values ('OPI Big Apple Red', 'Polish') returning id`);
  await q(`insert into public.supply_log (supply_id, kind, qty, cost) values ($1, 'bought', 3, 30)`, [sup.id]);
  let s1 = (await q('select on_hand, unit_price from public.supplies where id = $1', [sup.id]))[0];
  ok(s1.on_hand === 3 && +s1.unit_price === 10, 'bought 3 for $30 → 3 on hand, $10 each');
  const [used] = await q(`insert into public.supply_log (supply_id, kind) values ($1, 'used') returning id`, [sup.id]);
  ok((await q('select on_hand from public.supplies where id = $1', [sup.id]))[0].on_hand === 2, 'used one up → 2 left');
  await q('delete from public.supply_log where id = $1', [used.id]);
  ok((await q('select on_hand from public.supplies where id = $1', [sup.id]))[0].on_hand === 3, 'undo puts it back');
  for (let i = 0; i < 5; i++) await q(`insert into public.supply_log (supply_id, kind) values ($1, 'used')`, [sup.id]);
  ok((await q('select on_hand from public.supplies where id = $1', [sup.id]))[0].on_hand === 0, 'never goes below zero');
});
await asRole('anon', null, async () => {
  let blocked = 0;
  for (const t of ['receipts', 'supplies', 'supply_log']) { try { const r = await q(`select * from public.${t}`); if (!r.length) blocked++; } catch { blocked++; } }
  ok(blocked === 3, 'the public can\'t see receipts or supplies');
});
await asRole('authenticated', 'someone@else.com', async () => {
  const n = (await q('select (select count(*) from public.receipts) + (select count(*) from public.supplies) n'))[0].n;
  ok(+n === 0, 'a different logged-in user sees no receipts or supplies');
});

console.log('\nMore than one service (mani + pedi)');
const combo = await asRole('anon', null, async () => {
  const slots = await q(`select t from public.open_slots(2, '{7,29}', null, 7) t`);
  ok(slots.length > 0, 'open times for Gel Manicure + Spa Pedicure + Callus Removal');
  return (await q(`select public.book(2, $1, 'Ana Lopez', '541-555-0190', null, true, '{7,29}') j`, [slots[0].t]))[0].j;
});
ok(JSON.stringify(combo.addons) === JSON.stringify(['Spa Pedicure', 'Callus Removal']), 'booked: ' + combo.service + ' + ' + combo.addons.join(', '));
ok((new Date(combo.ends_at) - new Date(combo.starts_at)) / 60000 === 60 + 60 + 10, 'one visit, back to back: 130 minutes');

console.log('\nClients');
await asRole('authenticated', 'sang@salonsang.com', async () => {
  await q(`insert into public.clients (key, name, phone, notes, birthday) values ('+15415550111', 'Mai Tran', '+15415550111', 'Loves almond, nude chrome', '1990-03-14'), ('name:kim', 'Kim', null, 'New, called the salon', null)`);
  await q(`insert into public.client_photos (client_key, photo_path) values ('+15415550111', 'clients/a.jpg')`);
  const list = await q(`select * from public.owner_client_list()`);
  const mai = list.find(c => c.key === '+15415550111'), kim = list.find(c => c.key === 'name:kim'), ana = list.find(c => c.name === 'Ana Lopez');
  ok(mai && mai.notes === 'Loves almond, nude chrome', 'client list joins notes to visits');
  ok(kim && +kim.visits === 0, 'clients she adds by hand show up too');
  ok(ana && ana.next_visit, 'next visit shows for an upcoming client');
});
let denied = false;
try { await asRole('anon', null, () => q(`select * from public.owner_client_list()`)); } catch { denied = true; }
ok(denied, 'the public can\'t read the client list');
await asRole('authenticated', 'someone@else.com', async () => {
  ok((await q('select count(*)::int n from public.owner_client_list()'))[0].n === 0 && (await q('select count(*)::int n from public.clients'))[0].n === 0, 'a different logged-in user sees no clients');
});

console.log('\nNo double-booking from the portal');
await asRole('authenticated', 'sang@salonsang.com', async () => {
  const d = `(now() at time zone '${tz}')::date + 3`;
  const at = t => `((${d} + time '${t}') at time zone '${tz}')`;
  await q(`insert into public.appointments (service_name, starts_at, ends_at, client_name) values ('Gel Manicure', ${at('10:00')}, ${at('11:00')}, 'First Client')`);
  let msg = '';
  try { await q(`insert into public.appointments (service_name, starts_at, ends_at, client_name) values ('Spa Pedicure', ${at('10:30')}, ${at('11:30')}, 'Second Client')`); } catch (e) { msg = e.message; }
  ok(/Already booked: First Client \(10:00 AM – 11:00 AM\)/.test(msg), 'overlapping booking is refused: ' + msg);
  let okAdj = true; try { await q(`insert into public.appointments (service_name, starts_at, ends_at, client_name) values ('Spa Pedicure', ${at('11:00')}, ${at('12:00')}, 'Right After')`); } catch { okAdj = false; }
  ok(okAdj, 'back to back (11:00 right after 10–11) is fine');
  await q(`update public.appointments set status = 'cancelled' where client_name = 'First Client'`);
  let okCancel = true; try { await q(`insert into public.appointments (service_name, starts_at, ends_at, client_name) values ('Polish Change', ${at('10:00')}, ${at('10:30')}, 'Took The Spot')`); } catch { okCancel = false; }
  ok(okCancel, 'a cancelled appointment frees its time');
  let blocked = false; try { await q(`update public.appointments set status = 'booked' where client_name = 'First Client'`); } catch { blocked = true; }
  ok(blocked, 'restoring a cancelled appointment into a taken time is refused');
  let paidOk = true; try { await q(`update public.appointments set paid = 40 where client_name = 'Took The Spot'`); } catch { paidOk = false; }
  ok(paidOk, 'editing other details (like Paid) still works');
});

console.log('\nClient changes or cancels online (private link)');
{
  const tok = (await q(`select manage_token from public.appointments where client_name = 'Ana Lopez'`))[0].manage_token;
  ok(/^[0-9a-f]{24}$/.test(tok), 'every appointment gets a private link token');
  const conf = (await asRole('authenticated', 'sang@salonsang.com', () => q(`select public.message_preview(id) t from public.messages where appointment_id = (select id from public.appointments where client_name = 'Ana Lopez') and kind = 'confirm'`)))[0].t;
  ok(conf.includes('https://salonsang.com/my/?t=' + tok), 'the confirmation text carries the change/cancel link');
  const me = await asRole('anon', null, () => q(`select public.my_appt($1) j`, [tok]));
  ok(me[0].j.first === 'Ana' && me[0].j.can_change, 'the link shows the client their appointment');
  ok((await asRole('anon', null, () => q(`select public.my_appt('nope-nope-nope-nope') j`)))[0].j === null, 'a wrong link shows nothing');
  const slots = await asRole('anon', null, () => q(`select t from public.my_slots($1) t`, [tok]));
  ok(slots.length > 0, `open times to move to (${slots.length})`);
  const target = slots[slots.length - 1].t;
  const moved = (await asRole('anon', null, () => q(`select public.my_move($1, $2) j`, [tok, target])))[0].j;
  ok(new Date(moved.starts_at).getTime() === new Date(target).getTime(), 'the client moved their own appointment');
  const callsBefore = (await q('select count(*)::int n from net.calls'))[0].n;
  const gone = (await asRole('anon', null, () => q(`select public.my_cancel($1) j`, [tok])))[0].j;
  ok(gone.status === 'cancelled' && !gone.can_change, 'the client cancelled online');
  ok((await q('select count(*)::int n from net.calls'))[0].n > callsBefore, 'Sang gets a cancel alert');
  const bye = await q(`select body from public.messages where appointment_id = (select id from public.appointments where manage_token = $1) and kind = 'custom'`, [tok]);
  ok(bye.length === 1 && /is cancelled, no worries/.test(bye[0].body) && !bye[0].body.includes('/my/'), 'a sweet cancellation text is queued (no link)');
  const out = await asRole('anon', null, () => q(`select public.phone_outbox((select phone_token from private.config where id = 1)) j`).catch(() => [{ j: [] }]));
  void out;
  const pending = await q(`select kind, status from public.messages where appointment_id = (select id from public.appointments where manage_token = $1)`, [tok]);
  ok(pending.filter(m => m.kind !== 'custom' && m.status === 'pending').length === 0, 'its reminder will not go out');
  let err = ''; try { await asRole('anon', null, () => q(`select public.my_move($1, $2)`, [tok, target])); } catch (e) { err = e.message; }
  ok(/can't be changed online/.test(err), 'a cancelled appointment cannot be moved');
}

console.log('\nTime off');
const toBefore = await asRole('anon', null, () => q(`select t from public.open_slots(25, '{}', null, 7) t`));
const block = toBefore[Math.floor(toBefore.length / 2)].t;
await asRole('authenticated', 'sang@salonsang.com', () => q(`insert into public.time_off (starts_at, ends_at, note) values ($1, $1::timestamptz + interval '2 hours', 'Soccer game')`, [block]));
const toAfter = await asRole('anon', null, () => q(`select t from public.open_slots(25, '{}', null, 7) t`));
const inBlock = toAfter.filter(r => r.t >= new Date(block) && r.t < new Date(new Date(block).getTime() + 2 * 3600e3));
ok(toAfter.length < toBefore.length && inBlock.length === 0, `time off hides those times from online booking (${toBefore.length} → ${toAfter.length} slots)`);
const touching = toAfter.some(r => r.t < new Date(block) && r.t.getTime() + (15 + 10) * 60e3 > new Date(block).getTime());
ok(!touching, 'a visit must finish (plus the break) before time off starts');
let tdenied = 0; await asRole('anon', null, async () => { try { const r = await q('select * from public.time_off'); if (!r.length) tdenied = 1; } catch { tdenied = 1; } });
ok(tdenied === 1, 'the public can\'t see her time off');
const rep1 = (await asRole('anon', null, () => q(`select v.name, v.minutes from public.services v where v.id = 34`)).catch(() => [])) ;
void rep1;
const info2 = await asRole('anon', null, () => q('select public.booking_info() j'));
ok(info2[0].j.services.some(v => v.name === 'Repair / fix · 1–2 nails' && v.minutes === 30 && !v.addon), 'Repair / fix (30 min) can be booked on its own');

console.log('\nWeekly business hours (no open times needed)');
{
  await db.exec(`delete from public.openings; delete from public.time_off;`);
  ok((await asRole('anon', null, () => q(`select t from public.open_slots(25, '{}', null, 14) t`))).length === 0, 'with no hours at all, nothing is bookable');
  await db.exec(`update public.settings set week_hours = '{"1":["09:30","17:00"],"2":["09:30","17:00"],"3":["09:30","17:00"],"4":["09:30","17:00"],"5":["09:30","17:00"],"6":["10:00","17:00"]}'`);
  const wk = await asRole('anon', null, () => q(`select t from public.open_slots(25, '{}', null, 14) t`));
  const dows = new Set(wk.map(r => new Date(r.t.toLocaleString('en-US', { timeZone: tz })).getDay()));
  ok(wk.length > 40, `her normal week makes times bookable automatically (${wk.length} times over 2 weeks)`);
  ok(!dows.has(0), 'Sundays stay closed');
  const sat = wk.filter(r => new Date(r.t.toLocaleString('en-US', { timeZone: tz })).getDay() === 6).map(r => r.t.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }));
  ok(!sat.some(t => /^9:/.test(t)), 'Saturdays never start before 10:00 (' + (sat[0] || 'none this window') + ')');
  const wkDay = wk.find(r => new Date(r.t.toLocaleString('en-US', { timeZone: tz })).getDay() === 3);
  await asRole('authenticated', 'sang@salonsang.com', () => q(`insert into public.time_off (starts_at, ends_at, note) values ($1::timestamptz - interval '1 minute', $1::timestamptz + interval '3 hours', 'Doctor')`, [wkDay.t]));
  const after = await asRole('anon', null, () => q(`select t from public.open_slots(25, '{}', null, 14) t`));
  ok(!after.some(r => r.t.getTime() === wkDay.t.getTime()), 'time off still blocks her normal hours');
}

console.log('\nStart times every 15 minutes, no break');
{
  await db.exec(`delete from public.time_off; update public.settings set slot_step_min = 15, buffer_min = 0`);
  const d = `((now() at time zone '${tz}')::date + 8)`;
  const dow = (await q(`select extract(dow from ${d})::int w`))[0].w;
  await db.exec(`update public.settings set week_hours = '{"${dow}":["09:30","17:00"]}'; delete from public.appointments where starts_at::date between ${d} - 1 and ${d} + 1`);
  await db.exec(`insert into public.appointments(service_id, service_name, starts_at, ends_at, client_name, status) values (7, 'Spa Pedicure', (${d} + time '15:40') at time zone '${tz}', (${d} + time '16:40') at time zone '${tz}', 'Late client', 'booked')`);
  const t = (await asRole('anon', null, () => q(`select t from public.open_slots(1, '{}', ${d}, 1) t`))).map(r => r.t.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }));
  ok(t.includes('4:45 PM') && !t.includes('4:30 PM') && t.at(-1) === '5:00 PM', `a client ending 4:40 → next start 4:45 (${t.slice(-3).join(', ')})`);
  ok(t.includes('9:45 AM'), 'quarter-hour starts are offered');
}

console.log('\nHolidays');
{
  const h = async d => (await q(`select private.holiday($1::date, '{new_year,memorial,july4,labor,thanksgiving,christmas}') h`, [d]))[0].h;
  ok(await h('2026-11-26') === 'Thanksgiving' && await h('2027-11-25') === 'Thanksgiving' && await h('2026-11-27') === null, 'Thanksgiving = 4th Thursday of November');
  ok(await h('2026-05-25') === 'Memorial Day' && await h('2026-05-18') === null, 'Memorial Day = last Monday of May');
  ok(await h('2026-09-07') === 'Labor Day' && await h('2026-12-25') === 'Christmas Day' && await h('2027-01-01') === "New Year's Day" && await h('2026-07-04') === 'Fourth of July', 'Labor Day, Christmas, New Year, July 4th');
  ok(await h('2026-02-16') === null && await h('2026-12-24') === null, "Presidents' Day and Christmas Eve stay open (unless she ticks it)");
  // a holiday on one of her working days closes it; the next day stays open
  await db.exec(`update public.settings set week_hours = '{"1":["09:30","17:00"],"2":["09:30","17:00"],"3":["09:30","17:00"],"4":["09:30","17:00"],"5":["09:30","17:00"]}', max_days_ahead = 120`);
  const n = async d => (await q(`select count(*)::int n from private.free_starts(15, ('${d}'::timestamp at time zone '${tz}'), (('${d}'::date + 1)::timestamp at time zone '${tz}'))`))[0].n;
  ok(await n('2026-12-25') === 0 && await n('2026-12-24') > 0 && await n('2026-12-28') > 0, 'Christmas Day is closed; Christmas Eve and the next workday stay open');
  await db.exec(`update public.settings set holidays = '{christmas,christmas_eve}'`);
  ok(await n('2026-12-24') === 0, 'ticking "Christmas Eve" closes that day too');
  await db.exec(`insert into public.openings (starts_at, ends_at) values ('2026-12-25 10:00-08', '2026-12-25 12:00-08')`);
  ok(await n('2026-12-25') > 0, 'extra hours she opens on purpose still work on a holiday');
  await db.exec(`delete from public.openings; update public.settings set holidays = default, max_days_ahead = 60`);
}

console.log('\nSimple iPhone texts call');
{
  const tok = (await q(`select phone_token t from private.config`))[0].t;
  await db.exec(`insert into public.messages (kind, to_phone, body, send_after) values ('custom', '+15415550100', 'Hello test', now())`);
  const got = await asRole('anon', null, () => q(`select public.phone_texts($1) j`, [tok]));
  ok(got[0].j.some(m => m.text === 'Hello test'), 'phone_texts hands over the due text');
  const again = await asRole('anon', null, () => q(`select public.phone_texts($1) j`, [tok]));
  ok(!again[0].j.some(m => m.text === 'Hello test'), '…and marks it sent, so it is never sent twice');
  ok((await q(`select phone_seen_at from private.config`))[0].phone_seen_at != null, 'the portal can see when her iPhone last checked in');
  let bad = false; try { await asRole('anon', null, () => q(`select public.phone_texts('nope')`)); } catch { bad = true; }
  ok(bad, 'a wrong phone key gets nothing');
  const st = await asRole('authenticated', 'sang@salonsang.com', () => q(`select public.owner_setup() j`));
  ok('phone_seen_at' in st[0].j && 'texts_waiting' in st[0].j, 'owner_setup reports iPhone check-in and texts waiting');
  const ta = await asRole('authenticated', 'sang@salonsang.com', () => q(`select public.owner_test_alert() j`));
  ok(ta[0].j === true, 'test alert can be sent by Sang');
}

await db.exec(`select private.tick()`);
ok(true, 'daily tick runs');
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
