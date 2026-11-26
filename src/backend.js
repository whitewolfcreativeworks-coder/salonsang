import { holidayName, DEFAULT_HOLIDAYS } from './lib/holidays.js';
// One small interface for the website's booking flow and Sang's portal.
//  • live: Supabase (database rules in backend/salon-sang.sql)
//  • demo: the same rules on pretend data in this browser tab, so the flow can be tried before the
//          backend exists (?demo). Nothing is saved or sent.
import { SUPABASE_URL, SUPABASE_ANON_KEY, configured, demoMode, TZ } from './config.js';
import { ymd, at, addDays, weekday, fmtTime, fmtDate } from './lib/time.js';

export const isDemo = () => demoMode() || !configured();
let live = null;
async function sb() {
  if (!live) {
    const { createClient } = await import('@supabase/supabase-js');
    live = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return live;
}
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message || 'Something went wrong'); return data; };

// ============================================================ LIVE
const Live = {
  demo: false,
  // ---- website
  async info() { return unwrap(await (await sb()).rpc('booking_info')); },
  async slots(service, addons = [], from = null, days = 14) {
    return unwrap(await (await sb()).rpc('open_slots', { p_service: service, p_addons: addons, p_from: from, p_days: days })).map(t => new Date(t));
  },
  async book(b) {
    return unwrap(await (await sb()).rpc('book', { p_service: b.service, p_start: b.start.toISOString(), p_name: b.name,
      p_phone: b.phone, p_note: b.note || null, p_texts_ok: b.textsOk, p_addons: b.addons || [] }));
  },
  // ---- clients: change or cancel with their private link
  async myAppt(t) { return unwrap(await (await sb()).rpc('my_appt', { p_token: t })); },
  async mySlots(t, from = null, days = 42) { return unwrap(await (await sb()).rpc('my_slots', { p_token: t, p_from: from, p_days: days })).map(x => new Date(x)); },
  async myMove(t, start) { return unwrap(await (await sb()).rpc('my_move', { p_token: t, p_start: start.toISOString() })); },
  async myCancel(t) { return unwrap(await (await sb()).rpc('my_cancel', { p_token: t })); },
  // ---- portal: auth
  async session() { return unwrap(await (await sb()).auth.getSession()).session; },
  async onAuth(cb) { (await sb()).auth.onAuthStateChange((_e, s) => cb(s)); },
  async signIn(email, password) { unwrap(await (await sb()).auth.signInWithPassword({ email, password })); },
  async sendLink(email) { unwrap(await (await sb()).auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/portal/', shouldCreateUser: false } })); },
  async signOut() { await (await sb()).auth.signOut(); },
  async isOwner() { return unwrap(await (await sb()).rpc('is_owner')); },
  // ---- portal: data
  async appointments(from, to) {
    return unwrap(await (await sb()).from('appointments').select('*').gte('starts_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at'));
  },
  async saveAppointment(a) {
    const c = await sb(); const { id, ...rest } = a;
    return unwrap(id ? await c.from('appointments').update(rest).eq('id', id).select().single() : await c.from('appointments').insert(rest).select().single());
  },
  async openings(from, to) {
    return unwrap(await (await sb()).from('openings').select('*').lt('starts_at', to.toISOString()).gt('ends_at', from.toISOString()).order('starts_at'));
  },
  async addOpenings(rows) { return unwrap(await (await sb()).from('openings').insert(rows.map(r => ({ starts_at: r.starts_at.toISOString(), ends_at: r.ends_at.toISOString() }))).select()); },
  async deleteOpening(id) { unwrap(await (await sb()).from('openings').delete().eq('id', id)); },
  async messages(from, to) {
    return unwrap(await (await sb()).from('messages').select('*, appointment:appointments(client_name, starts_at, service_name, status)')
      .gte('send_after', from.toISOString()).lt('send_after', to.toISOString()).order('send_after'));
  },
  async previewMessage(id) { return unwrap(await (await sb()).rpc('message_preview', { p_id: id })); },
  async markSent(id) { unwrap(await (await sb()).from('messages').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)); },
  async queueCustom(appointment_id, to_phone, body) { unwrap(await (await sb()).from('messages').insert({ appointment_id, to_phone, body, kind: 'custom' })); },
  async settings() { return unwrap(await (await sb()).from('settings').select('*').eq('id', 1).single()); },
  async saveSettings(patch) { return unwrap(await (await sb()).from('settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1).select().single()); },
  async services() { return unwrap(await (await sb()).from('services').select('*').order('sort').order('id')); },
  async saveService(s) { const c = await sb(); const { id, ...rest } = s; return unwrap(id ? await c.from('services').update(rest).eq('id', id).select().single() : await c.from('services').insert(rest).select().single()); },
  async clients(q) { return unwrap(await (await sb()).rpc('owner_clients', { p_q: q || '' })); },
  async setup() { return unwrap(await (await sb()).rpc('owner_setup')); },
  async testAlert() { return unwrap(await (await sb()).rpc('owner_test_alert')); },
  async templatePreview(tpl, start) { return unwrap(await (await sb()).rpc('template_preview', { p_tpl: tpl, p_start: start ? start.toISOString() : null })); },
  // ---- portal: taxes (receipts + notes, photos in the private 'receipts' bucket)
  async receipts(fromDay, toDay) { return unwrap(await (await sb()).from('receipts').select('*').gte('day', fromDay).lt('day', toDay).order('day', { ascending: false }).order('id', { ascending: false })); },
  async saveReceipt(r) { const c = await sb(); const { id, ...rest } = r; return unwrap(id ? await c.from('receipts').update(rest).eq('id', id).select().single() : await c.from('receipts').insert(rest).select().single()); },
  async deleteReceipt(r) { const c = await sb(); unwrap(await c.from('receipts').delete().eq('id', r.id)); if (r.photo_path) await c.storage.from('receipts').remove([r.photo_path]); },
  async uploadPhoto(blob, folder = '') {
    const path = `${folder ? folder + '/' : ''}${new Date().getFullYear()}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${/png/.test(blob.type) ? 'png' : /heic/.test(blob.type) ? 'heic' : 'jpg'}`;
    unwrap(await (await sb()).storage.from('receipts').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false })); return path;
  },
  async photoUrls(paths) {
    if (!paths.length) return {};
    const r = unwrap(await (await sb()).storage.from('receipts').createSignedUrls(paths, 3600));
    return Object.fromEntries(r.filter(x => x.signedUrl).map(x => [x.path, x.signedUrl]));
  },
  // ---- portal: time off
  async timeOff(from, to) { return unwrap(await (await sb()).from('time_off').select('*').lt('starts_at', to.toISOString()).gt('ends_at', from.toISOString()).order('starts_at')); },
  async addTimeOff(rows) { return unwrap(await (await sb()).from('time_off').insert(rows.map(r => ({ starts_at: r.starts_at.toISOString(), ends_at: r.ends_at.toISOString(), note: r.note || null, grp: r.grp || null }))).select()); },
  async deleteTimeOff(x, all = false) { const c = await sb(); unwrap(all && x.grp ? await c.from('time_off').delete().eq('grp', x.grp).gte('starts_at', x.starts_at) : await c.from('time_off').delete().eq('id', x.id)); },
  // ---- portal: backup (everything, page by page)
  async backup() {
    const c = await sb(), out = {};
    const tables = { settings: 'id', services: 'id', openings: 'id', time_off: 'id', appointments: 'id', messages: 'id', clients: 'key',
                     client_photos: 'id', receipts: 'id', supplies: 'id', supply_log: 'id' };
    for (const [t, pk] of Object.entries(tables)) {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const page = unwrap(await c.from(t).select('*').order(pk, { ascending: true }).range(from, from + 999));
        rows.push(...page); if (page.length < 1000) break;
      }
      out[t] = rows;
    }
    return out;
  },
  // ---- portal: clients
  async clientList() { return unwrap(await (await sb()).rpc('owner_client_list')); },
  async clientHistory(c) {
    let q = (await sb()).from('appointments').select('*').order('starts_at', { ascending: false }).limit(300);
    q = c.phone ? q.eq('client_phone', c.phone) : q.ilike('client_name', c.name);
    return unwrap(await q);
  },
  async saveClient(c) { return unwrap(await (await sb()).from('clients').upsert({ ...c, updated_at: new Date().toISOString() }, { onConflict: 'key' }).select().single()); },
  async clientPhotos(key) { return unwrap(await (await sb()).from('client_photos').select('*').eq('client_key', key).order('taken_on', { ascending: false }).order('id', { ascending: false })); },
  async addClientPhoto(key, blob) { const path = await this.uploadPhoto(blob, 'clients'); return unwrap(await (await sb()).from('client_photos').insert({ client_key: key, photo_path: path }).select().single()); },
  async deleteClientPhoto(ph) { const c = await sb(); unwrap(await c.from('client_photos').delete().eq('id', ph.id)); await c.storage.from('receipts').remove([ph.photo_path]); },
  // ---- portal: supplies
  async supplies() { return unwrap(await (await sb()).from('supplies').select('*').eq('active', true).order('kind').order('name')); },
  async saveSupply(x) { const c = await sb(); const { id, ...rest } = x; return unwrap(id ? await c.from('supplies').update(rest).eq('id', id).select().single() : await c.from('supplies').insert(rest).select().single()); },
  async logSupply(supply_id, kind, qty = 1, cost = null) { return unwrap(await (await sb()).from('supply_log').insert({ supply_id, kind, qty, cost }).select().single()); },
  async undoLog(id) { unwrap(await (await sb()).from('supply_log').delete().eq('id', id)); },
  async supplyLog(from, to) { return unwrap(await (await sb()).from('supply_log').select('*').gte('at', from.toISOString()).lt('at', to.toISOString()).order('at')); },
  supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY
};

// ============================================================ DEMO (pretend data, same rules)
const SERVICES = [
  [1, 'Manicure', 'Spa Manicure', '$35', 45], [2, 'Manicure', 'Gel Manicure', '$45', 60], [3, 'Manicure', 'Deluxe Manicure', '$45', 60],
  [4, 'Manicure', 'Premier Manicure', '$50', 75], [5, 'Manicure', 'Deluxe Gel Manicure', '$55', 75], [6, 'Manicure', 'Premier Gel Manicure', '$60', 90],
  [7, 'Pedicure', 'Spa Pedicure', '$45', 60], [8, 'Pedicure', 'Gel Pedicure', '$55', 75], [9, 'Pedicure', 'Deluxe Pedicure', '$65', 75],
  [10, 'Pedicure', 'Premier Pedicure', '$70', 90], [11, 'Pedicure', 'Deluxe Gel Pedicure', '$75', 90], [12, 'Pedicure', 'Premier Gel Pedicure', '$80', 105],
  [13, 'Full set', 'Dipping full set', '$65+', 90], [14, 'Full set', 'Hard Gel full set', '$65+', 105], [15, 'Full set', 'Builder Gel full set', '$65+', 105], [16, 'Full set', 'Gel-X full set', '$65+', 90],
  [17, 'Fill', 'Dip Powder fill', '$55', 75], [18, 'Fill', 'Hard Gel fill', '$50+', 75], [19, 'Fill', 'Builder Gel fill', '$50+', 75],
  [20, 'Overlay', 'Dip Powder overlay', '$55', 75], [21, 'Overlay', 'Hard Gel overlay', '$55', 75], [22, 'Overlay', 'Builder Gel overlay', '$55', 75],
  [23, 'Extras', 'Polish Change', '$20', 20], [24, 'Extras', 'Gel Polish Change', '$30', 30], [25, 'Extras', 'Nail Trim', '$15', 15], [26, 'Extras', 'Toenail Trim', '$20', 20],
  [27, 'Add-on', 'French Tip', '+$5', 10], [28, 'Add-on', 'French Tip Gel', '+$10', 15], [29, 'Add-on', 'Callus Removal', '+$10', 10],
  [30, 'Add-on', 'Take Off Gel', '$10', 10], [31, 'Add-on', 'Take Off Dip, Hard Gel or Builder', '$15', 20], [32, 'Add-on', 'Nail Repair', '$5 each', 5], [33, 'Add-on', 'Specialty nail art design', 'priced by design', 30],
  [34, 'Repair', 'Repair / fix · 1–2 nails', 'priced by repair', 30], [35, 'Repair', 'Repair / fix · 3–5 nails', 'priced by repair', 60]
].map(([id, category, name, price, minutes], i) => ({ id, category, name, price, minutes, is_addon: category === 'Add-on', online: true, active: true, sort: i }));

function demoState() {
  const today = ymd();
  const s = {
    settings: { id: 1, booking_open: true, tz: TZ, slot_step_min: 15,
      week_hours: { 1: ['09:30', '17:00'], 2: ['09:30', '17:00'], 3: ['09:30', '17:00'], 4: ['09:30', '17:00'], 5: ['09:30', '17:00'], 6: ['10:00', '17:00'] }, holidays: [...DEFAULT_HOLIDAYS], buffer_min: 0, min_notice_min: 120, max_days_ahead: 60, remind_hours_before: 4, remind_earliest: '08:00:00',
      confirm_template: "Hi {first}! 💅 You're all booked at Salon Sang: {service}, {when}. Sola Salon Studios, Suite 12 (440 W 6th Ave). Can't wait to see you! ✨ Need to change it? Just reply or call 530-648-4977 💖",
      reminder_template: "Good morning, {first}! ✨ Today's the big day: your {service} with Sang is at {time}. Salon Sang · Sola Salon Studios, Suite 12. Can't wait to pamper you! Need to change it? Reply or call 530-648-4977 💖",
      reminder_template_pm: "Hi {first}! ✨ Just a sweet reminder: your {service} with Sang is today at {time}. Salon Sang · Sola Salon Studios, Suite 12. See you soon! 💅 Need to change it? Reply or call 530-648-4977 💖" },
    services: SERVICES.map(x => ({ ...x })), openings: [], appointments: [], messages: [], seq: 100,
    receipts: [], supplies: [], supplyLog: [], photos: {}, clients: [], clientPhotos: [], timeOff: []
  };
  // pretend bookkeeping: a few past visits, supplies with some history, a receipt and a note
  const past = [['Mai Tran', 'Premier Gel Pedicure', 80, '+15415550111'], ['Jessica Rivera', 'Gel Manicure', 45, '+15415550142'], ['Linh Nguyen', 'Dipping full set', null, '+15415550133'], ['Brooke Adams', 'Spa Pedicure', 50, '+15415550178']];
  for (let i = 1; i <= 40; i++) { const [n, svc, paid, ph] = past[i % 4]; const d = addDays(today, -i * 2);
    s.appointments.push({ id: ++s.seq, service_id: null, service_name: svc, addons: [], starts_at: at(d, '11:00').toISOString(), ends_at: at(d, '12:00').toISOString(),
      client_name: n, client_phone: ph, note: null, source: 'portal', status: 'done', texts_ok: false, send_confirmation: false, paid, created_at: new Date().toISOString() }); }
  s.appointments.push({ id: ++s.seq, service_id: null, service_name: 'Spa Manicure', addons: [], starts_at: at(addDays(today, -60), '14:00').toISOString(), ends_at: at(addDays(today, -60), '15:00').toISOString(),
    client_name: 'Rosa Diaz', client_phone: '+15415550166', note: null, source: 'portal', status: 'done', texts_ok: true, send_confirmation: false, paid: 35, created_at: new Date().toISOString() });
  s.clients.push({ key: '+15415550111', name: 'Mai Tran', phone: '+15415550111', notes: 'Loves almond shape, nude chrome. Sensitive cuticles: go gentle. Likes to chat about her kids.', birthday: `1990-${today.slice(5, 7)}-21` });
  const sup = (name, kind, on_hand, unit_price, uses) => { const x = { id: ++s.seq, name, kind, on_hand, low_at: 1, unit_price, note: null, active: true };
    s.supplies.push(x); s.supplyLog.push({ id: ++s.seq, supply_id: x.id, kind: 'bought', qty: on_hand + uses.length, cost: unit_price * (on_hand + uses.length), at: at(addDays(today, -70)).toISOString() });
    uses.forEach(dd => s.supplyLog.push({ id: ++s.seq, supply_id: x.id, kind: 'used', qty: 1, cost: null, at: at(addDays(today, -dd)).toISOString() })); };
  sup('OPI Big Apple Red', 'Polish', 2, 11.5, [60, 38, 15]); sup('Pink & White dip powder', 'Dip powder', 1, 18, [50, 22]);
  sup('Acetone (gallon)', 'Tools', 0, 24, [40, 9]); sup('Shea butter lotion', 'Lotion', 3, 9, []);
  s.receipts.push({ id: ++s.seq, kind: 'receipt', day: addDays(today, -12), amount: 46.18, note: 'Sally Beauty: dip liquids and files', photo_path: null, created_at: new Date().toISOString() },
                  { id: ++s.seq, kind: 'note', day: addDays(today, -30), amount: null, note: 'Paid Sola suite rent for the month with a check', photo_path: null, created_at: new Date().toISOString() });

  const mk = (day, time, name, phone, svc, mins, source = 'portal') => ({ id: ++s.seq, service_id: null, service_name: svc, addons: [], starts_at: at(day, time).toISOString(),
    ends_at: new Date(at(day, time).getTime() + mins * 60000).toISOString(), client_name: name, client_phone: phone, note: null, source, status: 'booked', texts_ok: true, send_confirmation: true, created_at: new Date().toISOString() });
  const firstOpen = s.openings[0] ? s.openings[0].starts_at.slice(0, 10) : today;
  let d0 = addDays(today, 1); while (!s.settings.week_hours[weekday(d0)]) d0 = addDays(d0, 1);
  [mk(d0, '10:00', 'Jessica Rivera', '+15415550142', 'Gel Manicure', 60, 'web'), mk(d0, '13:30', 'Mai Tran', '+15415550111', 'Premier Gel Pedicure', 105),
   mk(d0, '16:00', 'Brooke Adams', '+15415550178', 'Polish Change', 20), mk(addDays(d0, 1), '11:00', 'Linh Nguyen', '+15415550133', 'Dipping full set', 90, 'web')]
    .forEach(a => { s.appointments.push(a); demoQueue(s, a, false); });
  void firstOpen;
  return s;
}
function demoRender(s, tpl, a) {
  const st = new Date(a.starts_at), d = ymd(st), t = ymd();
  const tm = fmtTime(st), dy = d === t ? 'today' : d === addDays(t, 1) ? 'tomorrow' : fmtDate(d);
  const svc = a.service_name + (a.addons?.length ? ' + ' + a.addons.join(' + ') : '');
  return tpl.replaceAll('{first}', a.client_name.trim().split(' ')[0]).replaceAll('{name}', a.client_name.trim()).replaceAll('{service}', svc)
    .replaceAll('{time}', tm).replaceAll('{day}', dy).replaceAll('{date}', fmtDate(d)).replaceAll('{when}', `${dy} at ${tm}`)
    .replaceAll('{link}', 'https://salonsang.com/my/?t=a1b2c3d4e5f6') + (tpl.includes('{link}') ? '' : '\nChange or cancel anytime: https://salonsang.com/my/?t=a1b2c3d4e5f6');
}
function demoQueue(s, a, confirm) {
  s.messages = s.messages.filter(m => !(m.appointment_id === a.id && m.status === 'pending' && m.kind !== 'custom'));
  if (a.status !== 'booked' || !a.client_phone || !a.texts_ok || new Date(a.starts_at) <= new Date()) return;
  const now = Date.now(), start = new Date(a.starts_at).getTime();
  if (confirm) s.messages.push({ id: ++s.seq, appointment_id: a.id, kind: 'confirm', to_phone: a.client_phone, send_after: new Date().toISOString(), status: 'pending' });
  let r = Math.max(start - s.settings.remind_hours_before * 3600e3, at(ymd(new Date(start)), s.settings.remind_earliest.slice(0, 5)).getTime());
  if (r >= start) r = start - 30 * 60e3;
  if (r < now + 45 * 60e3 && (confirm || start < now + 90 * 60e3)) return;
  s.messages.push({ id: ++s.seq, appointment_id: a.id, kind: 'reminder', to_phone: a.client_phone, send_after: new Date(Math.max(r, now)).toISOString(), status: 'pending' });
}
function demoFree(s, mins, from, to) {
  const out = [], step = s.settings.slot_step_min * 60e3, buf = s.settings.buffer_min * 60e3, len = mins * 60e3;
  const earliest = Date.now() + s.settings.min_notice_min * 60e3;
  const wins = [...s.openings];
  for (let d = ymd(new Date(from - 864e5)); at(d).getTime() <= to + 864e5; d = addDays(d, 1)) {
    const h = s.settings.week_hours?.[weekday(d)]; if (h && !holidayName(d, s.settings.holidays)) wins.push({ starts_at: at(d, h[0]).toISOString(), ends_at: at(d, h[1]).toISOString() });
  }
  for (const o of wins) {
    const os = new Date(o.starts_at).getTime(), oe = new Date(o.ends_at).getTime();
    for (let t = os; t <= oe; t += step) {   // oe = her LAST start; a visit may run past it
      if (t < from || t > to || t < earliest) continue;
      const clash = s.appointments.some(a => a.status === 'booked' && new Date(a.starts_at).getTime() < t + len + buf && new Date(a.ends_at).getTime() > t - buf)
        || s.timeOff.some(x => new Date(x.starts_at).getTime() < t + len + buf && new Date(x.ends_at).getTime() > t);
      if (!clash) out.push(new Date(t));
    }
  }
  return out.sort((a, b) => a - b);
}
const wait = (ms = 250) => new Promise(r => setTimeout(r, ms));
const demoMine = t => (t === 'demo' ? st().appointments.filter(a => a.source === 'web').sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0] : null);
let S = null; const st = () => (S ||= demoState());
const Demo = {
  demo: true,
  async info() { await wait(); const s = st(); return { open: s.settings.booking_open, tz: TZ, step: 15, max_days: 60,
    services: s.services.filter(v => v.active && v.online).map(v => ({ id: v.id, category: v.category, name: v.name, price: v.price, minutes: v.minutes, addon: v.is_addon })) }; },
  async slots(service, addons = [], from = null, days = 14) {
    await wait(200); const s = st(); const svc = s.services.find(v => v.id === service); if (!svc) return [];
    const mins = svc.minutes + s.services.filter(v => addons.includes(v.id)).reduce((a, v) => a + v.minutes, 0);
    const d0 = from || ymd(); return demoFree(s, mins, at(d0).getTime(), at(addDays(d0, days)).getTime());
  },
  async book(b) {
    await wait(600); const s = st();
    const phone = b.phone && String(b.phone).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (!b.name || b.name.trim().length < 2) throw new Error('Please enter your name.');
    if (!phone || phone.length !== 10) throw new Error('Please enter a valid 10-digit phone number.');
    const svc = s.services.find(v => v.id === b.service), adds = s.services.filter(v => (b.addons || []).includes(v.id));
    const mins = svc.minutes + adds.reduce((a, v) => a + v.minutes, 0);
    if (!demoFree(s, mins, b.start.getTime() - 60e3, b.start.getTime() + 60e3).some(t => t.getTime() === b.start.getTime())) throw new Error('So sorry, that time was just taken. Please pick another time 💖');
    const a = { id: ++s.seq, service_id: svc.id, service_name: svc.name, addons: adds.map(v => v.name), starts_at: b.start.toISOString(), ends_at: new Date(b.start.getTime() + mins * 60e3).toISOString(),
      client_name: b.name.trim(), client_phone: '+1' + phone, note: b.note || null, source: 'web', status: 'booked', texts_ok: b.textsOk, send_confirmation: true, created_at: new Date().toISOString() };
    s.appointments.push(a); demoQueue(s, a, true);
    return { id: a.id, service: a.service_name, addons: a.addons, starts_at: a.starts_at, ends_at: a.ends_at, name: a.client_name };
  },
  // pretend client link: ?demo&t=demo opens the first online booking
  async myAppt(t) { await wait(300); const a = demoMine(t); if (!a) return null;
    return { first: a.client_name.split(' ')[0], service: a.service_name, addons: a.addons, starts_at: a.starts_at, ends_at: a.ends_at, status: a.status, can_change: a.status === 'booked' && new Date(a.starts_at) > new Date() }; },
  async mySlots(t, from = null, days = 42) { await wait(250); const s = st(), a = demoMine(t); if (!a) return [];
    const mins = (new Date(a.ends_at) - new Date(a.starts_at)) / 60e3, keep = a.status; a.status = 'moving';
    const out = demoFree(s, mins, at(from || ymd()).getTime(), at(addDays(from || ymd(), days)).getTime()); a.status = keep; return out; },
  async myMove(t, start) { await wait(500); const a = demoMine(t); const len = new Date(a.ends_at) - new Date(a.starts_at);
    a.starts_at = start.toISOString(); a.ends_at = new Date(start.getTime() + len).toISOString(); return this.myAppt(t); },
  async myCancel(t) { await wait(500); const a = demoMine(t); a.status = 'cancelled'; a.cancelled_by = 'client'; return this.myAppt(t); },
  async session() { return { user: { email: 'sang@salonsang.com' } }; },
  async onAuth() {}, async signIn() {}, async sendLink() {}, async signOut() { location.href = '/'; }, async isOwner() { return true; },
  async appointments(from, to) { await wait(120); return st().appointments.filter(a => new Date(a.starts_at) >= from && new Date(a.starts_at) < to).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).map(a => ({ ...a })); },
  async saveAppointment(a) {
    await wait(200); const s = st();
    if (a.id) { const cur = s.appointments.find(x => x.id === a.id); const moved = a.starts_at && a.starts_at !== cur.starts_at; Object.assign(cur, a); demoQueue(s, cur, moved && cur.send_confirmation); return { ...cur }; }
    const n = { id: ++s.seq, addons: [], note: null, source: 'portal', status: 'booked', texts_ok: true, send_confirmation: true, created_at: new Date().toISOString(), ...a };
    s.appointments.push(n); demoQueue(s, n, n.send_confirmation); return { ...n };
  },
  async openings(from, to) { await wait(100); return st().openings.filter(o => new Date(o.starts_at) < to && new Date(o.ends_at) > from).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).map(o => ({ ...o })); },
  async addOpenings(rows) { await wait(200); const s = st(); const out = rows.map(r => ({ id: ++s.seq, starts_at: r.starts_at.toISOString(), ends_at: r.ends_at.toISOString() })); s.openings.push(...out); return out; },
  async deleteOpening(id) { await wait(100); const s = st(); s.openings = s.openings.filter(o => o.id !== id); },
  async messages(from, to) { await wait(100); const s = st(); return s.messages.filter(m => new Date(m.send_after) >= from && new Date(m.send_after) < to)
    .map(m => ({ ...m, appointment: s.appointments.find(a => a.id === m.appointment_id) })).sort((a, b) => new Date(a.send_after) - new Date(b.send_after)); },
  async previewMessage(id) { const s = st(); const m = s.messages.find(x => x.id === id); if (m.kind === 'custom') return m.body; const a = s.appointments.find(x => x.id === m.appointment_id);
    return demoRender(s, m.kind === 'confirm' ? s.settings.confirm_template : new Date(a.starts_at).getHours() < 12 ? s.settings.reminder_template : s.settings.reminder_template_pm, a); },
  async markSent(id) { const m = st().messages.find(x => x.id === id); m.status = 'sent'; m.sent_at = new Date().toISOString(); },
  async queueCustom(appointment_id, to_phone, body) { const s = st(); s.messages.push({ id: ++s.seq, appointment_id, to_phone, body, kind: 'custom', status: 'pending', send_after: new Date().toISOString() }); },
  async settings() { await wait(100); return { ...st().settings }; },
  async saveSettings(p) { await wait(200); Object.assign(st().settings, p); return { ...st().settings }; },
  async services() { await wait(100); return st().services.map(v => ({ ...v })); },
  async saveService(v) { await wait(150); const s = st(); if (v.id) { Object.assign(s.services.find(x => x.id === v.id), v); return v; } const n = { ...v, id: ++s.seq }; s.services.push(n); return n; },
  async clients(q) { const s = st(); const m = new Map(); s.appointments.slice().sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at)).forEach(a => {
      if (!a.client_phone || m.has(a.client_phone)) return; if (q && !a.client_name.toLowerCase().includes(q.toLowerCase()) && !a.client_phone.includes(q.replace(/\D/g, '') || '¤')) return;
      m.set(a.client_phone, { name: a.client_name, phone: a.client_phone, last_visit: a.starts_at, visits: 1 }); }); return [...m.values()].slice(0, 12); },
  async setup() { return { phone_token: 'demo-token-1234', ntfy_topic: 'salonsang-demo', phone_seen_at: null, texts_waiting: 0 }; },
  async testAlert() { await wait(300); return true; },
  async templatePreview(tpl, start) { const s = st(); return demoRender(s, tpl, { client_name: 'Jessica Rivera', service_name: 'Gel Manicure', addons: [], starts_at: (start || new Date(Date.now() + 5 * 3600e3)).toISOString() }); },
  async receipts(fromDay, toDay) { await wait(120); return st().receipts.filter(r => r.day >= fromDay && r.day < toDay).sort((a, b) => b.day.localeCompare(a.day) || b.id - a.id).map(r => ({ ...r })); },
  async saveReceipt(r) { await wait(200); const s = st(); if (r.id) { const cur = s.receipts.find(x => x.id === r.id); Object.assign(cur, r); return { ...cur }; }
    const n = { id: ++s.seq, kind: 'receipt', day: ymd(), amount: null, note: null, photo_path: null, created_at: new Date().toISOString(), ...r }; s.receipts.push(n); return { ...n }; },
  async deleteReceipt(r) { await wait(120); const s = st(); s.receipts = s.receipts.filter(x => x.id !== r.id); },
  async uploadPhoto(blob, folder = '') { await wait(400); const path = `demo/${folder}${Date.now()}.jpg`; st().photos[path] = URL.createObjectURL(blob); return path; },
  async photoUrls(paths) { const s = st(); return Object.fromEntries(paths.filter(p => s.photos[p]).map(p => [p, s.photos[p]])); },
  async timeOff(from, to) { await wait(80); return st().timeOff.filter(x => new Date(x.starts_at) < to && new Date(x.ends_at) > from).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)).map(x => ({ ...x })); },
  async addTimeOff(rows) { await wait(150); const s = st(); const out = rows.map(r => ({ id: ++s.seq, starts_at: r.starts_at.toISOString(), ends_at: r.ends_at.toISOString(), note: r.note || null, grp: r.grp || null })); s.timeOff.push(...out); return out; },
  async deleteTimeOff(x, all = false) { const s = st(); s.timeOff = s.timeOff.filter(y => all && x.grp ? !(y.grp === x.grp && y.starts_at >= x.starts_at) : y.id !== x.id); },
  async backup() { const s = st(); return { settings: [s.settings], services: s.services, openings: s.openings, time_off: s.timeOff, appointments: s.appointments, messages: s.messages,
    clients: s.clients, client_photos: s.clientPhotos, receipts: s.receipts, supplies: s.supplies, supply_log: s.supplyLog }; },
  async clientList() {
    await wait(120); const s = st(), m = new Map(), now = Date.now();
    s.appointments.forEach(a => { const k = a.client_phone || 'name:' + a.client_name.trim().toLowerCase();
      const c = m.get(k) || { key: k, name: a.client_name, phone: a.client_phone, visits: 0, last_visit: null, next_visit: null, notes: null, birthday: null, _t: 0 };
      const st0 = new Date(a.starts_at).getTime(), done = a.status === 'done' || (a.status === 'booked' && new Date(a.ends_at).getTime() < now);
      if (st0 > c._t) { c._t = st0; c.name = a.client_name; }
      if (done) { c.visits++; if (!c.last_visit || st0 > new Date(c.last_visit).getTime()) c.last_visit = a.starts_at; }
      if (a.status === 'booked' && st0 > now && (!c.next_visit || st0 < new Date(c.next_visit).getTime())) c.next_visit = a.starts_at;
      m.set(k, c); });
    s.clients.forEach(c => { const x = m.get(c.key) || { key: c.key, name: c.name, phone: c.phone, visits: 0, last_visit: null, next_visit: null }; Object.assign(x, { name: c.name, notes: c.notes, birthday: c.birthday }); m.set(c.key, x); });
    return [...m.values()].map(({ _t, ...c }) => c).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  },
  async clientHistory(c) { await wait(100); return st().appointments.filter(a => c.phone ? a.client_phone === c.phone : a.client_name.toLowerCase() === c.name.toLowerCase()).sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at)).map(a => ({ ...a })); },
  async saveClient(c) { await wait(150); const s = st(); const cur = s.clients.find(x => x.key === c.key); if (cur) Object.assign(cur, c); else s.clients.push({ notes: null, birthday: null, ...c }); return { ...c }; },
  async clientPhotos(key) { await wait(80); return st().clientPhotos.filter(p => p.client_key === key).slice().reverse(); },
  async addClientPhoto(key, blob) { const path = await this.uploadPhoto(blob, 'clients'); const s = st(); const ph = { id: ++s.seq, client_key: key, photo_path: path, taken_on: ymd() }; s.clientPhotos.push(ph); return ph; },
  async deleteClientPhoto(ph) { const s = st(); s.clientPhotos = s.clientPhotos.filter(p => p.id !== ph.id); },
  async supplies() { await wait(100); return st().supplies.filter(x => x.active).sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)).map(x => ({ ...x })); },
  async saveSupply(x) { await wait(150); const s = st(); if (x.id) { const cur = s.supplies.find(y => y.id === x.id); Object.assign(cur, x); return { ...cur }; }
    const n = { id: ++s.seq, kind: 'Other', on_hand: 0, low_at: 1, unit_price: null, note: null, active: true, ...x }; s.supplies.push(n); return { ...n }; },
  async logSupply(supply_id, kind, qty = 1, cost = null) { await wait(120); const s = st(); const e = { id: ++s.seq, supply_id, kind, qty, cost, at: new Date().toISOString() }; s.supplyLog.push(e);
    const x = s.supplies.find(y => y.id === supply_id); x.on_hand = Math.max(0, x.on_hand + (kind === 'bought' ? qty : -qty)); if (kind === 'bought' && cost != null) x.unit_price = Math.round(cost / qty * 100) / 100; return { ...e }; },
  async undoLog(id) { const s = st(); const e = s.supplyLog.find(y => y.id === id); if (!e) return; s.supplyLog = s.supplyLog.filter(y => y.id !== id);
    const x = s.supplies.find(y => y.id === e.supply_id); x.on_hand = Math.max(0, x.on_hand - (e.kind === 'bought' ? e.qty : -e.qty)); },
  async supplyLog(from, to) { await wait(100); return st().supplyLog.filter(e => new Date(e.at) >= from && new Date(e.at) < to).sort((a, b) => new Date(a.at) - new Date(b.at)).map(e => ({ ...e })); },
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co', anonKey: 'YOUR-ANON-KEY'
};

export const api = () => (isDemo() ? Demo : Live);
