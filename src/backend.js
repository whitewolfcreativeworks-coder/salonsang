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
  async templatePreview(tpl, start) { return unwrap(await (await sb()).rpc('template_preview', { p_tpl: tpl, p_start: start ? start.toISOString() : null })); },
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
  [30, 'Add-on', 'Take Off Gel', '$10', 10], [31, 'Add-on', 'Take Off Dip, Hard Gel or Builder', '$15', 20], [32, 'Add-on', 'Nail Repair', '$5 each', 5]
].map(([id, category, name, price, minutes], i) => ({ id, category, name, price, minutes, is_addon: category === 'Add-on', online: true, active: true, sort: i }));

function demoState() {
  const today = ymd();
  const s = {
    settings: { id: 1, booking_open: true, tz: TZ, slot_step_min: 30, buffer_min: 10, min_notice_min: 120, max_days_ahead: 60, remind_hours_before: 4, remind_earliest: '08:00:00',
      confirm_template: "Hi {first}! 💅 You're all booked at Salon Sang: {service}, {when}. Sola Salon Studios, Suite 12 (440 W 6th Ave). Can't wait to see you! ✨ Need to change it? Just reply or call 530-648-4977 💖",
      reminder_template: "Good morning, {first}! ✨ Today's the big day: your {service} with Sang is at {time}. Salon Sang · Sola Salon Studios, Suite 12. Can't wait to pamper you! Need to change it? Reply or call 530-648-4977 💖",
      reminder_template_pm: "Hi {first}! ✨ Just a sweet reminder: your {service} with Sang is today at {time}. Salon Sang · Sola Salon Studios, Suite 12. See you soon! 💅 Need to change it? Reply or call 530-648-4977 💖" },
    services: SERVICES.map(x => ({ ...x })), openings: [], appointments: [], messages: [], seq: 100
  };
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i), wd = weekday(d);
    if (wd === 0) continue;
    s.openings.push({ id: ++s.seq, starts_at: at(d, wd === 6 ? '10:00' : '09:30').toISOString(), ends_at: at(d, '17:00').toISOString() });
  }
  const mk = (day, time, name, phone, svc, mins, source = 'portal') => ({ id: ++s.seq, service_id: null, service_name: svc, addons: [], starts_at: at(day, time).toISOString(),
    ends_at: new Date(at(day, time).getTime() + mins * 60000).toISOString(), client_name: name, client_phone: phone, note: null, source, status: 'booked', texts_ok: true, send_confirmation: true, created_at: new Date().toISOString() });
  const firstOpen = s.openings[0] ? s.openings[0].starts_at.slice(0, 10) : today;
  const d0 = ymd(new Date(s.openings[0]?.starts_at || Date.now()));
  [mk(d0, '10:00', 'Jessica Rivera', '+15415550142', 'Gel Manicure', 60, 'web'), mk(d0, '13:30', 'Mai Tran', '+15415550111', 'Premier Gel Pedicure', 105),
   mk(d0, '16:00', 'Brooke Adams', '+15415550178', 'Polish Change', 20), mk(addDays(d0, 1), '11:00', 'Linh Nguyen', '+15415550133', 'Dipping full set', 90, 'web')]
    .forEach(a => { s.appointments.push(a); demoQueue(s, a, false); });
  void firstOpen;
  return s;
}
function demoRender(s, tpl, a) {
  const st = new Date(a.starts_at), d = ymd(st), t = ymd();
  const tm = fmtTime(st), dy = d === t ? 'today' : d === addDays(t, 1) ? 'tomorrow' : fmtDate(d);
  const svc = a.service_name + (a.addons?.length ? ' + ' + a.addons.join(', ') : '');
  return tpl.replaceAll('{first}', a.client_name.trim().split(' ')[0]).replaceAll('{name}', a.client_name.trim()).replaceAll('{service}', svc)
    .replaceAll('{time}', tm).replaceAll('{day}', dy).replaceAll('{date}', fmtDate(d)).replaceAll('{when}', `${dy} at ${tm}`);
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
  for (const o of s.openings) {
    const os = new Date(o.starts_at).getTime(), oe = new Date(o.ends_at).getTime();
    for (let t = os; t + len <= oe; t += step) {
      if (t < from || t > to || t < earliest) continue;
      const clash = s.appointments.some(a => a.status === 'booked' && new Date(a.starts_at).getTime() < t + len + buf && new Date(a.ends_at).getTime() > t - buf);
      if (!clash) out.push(new Date(t));
    }
  }
  return out.sort((a, b) => a - b);
}
const wait = (ms = 250) => new Promise(r => setTimeout(r, ms));
let S = null; const st = () => (S ||= demoState());
const Demo = {
  demo: true,
  async info() { await wait(); const s = st(); return { open: s.settings.booking_open, tz: TZ, step: 30, max_days: 60,
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
  async setup() { return { phone_token: 'demo-token-1234', ntfy_topic: 'salonsang-demo' }; },
  async templatePreview(tpl, start) { const s = st(); return demoRender(s, tpl, { client_name: 'Jessica Rivera', service_name: 'Gel Manicure', addons: [], starts_at: (start || new Date(Date.now() + 5 * 3600e3)).toISOString() }); },
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co', anonKey: 'YOUR-ANON-KEY'
};

export const api = () => (isDemo() ? Demo : Live);
