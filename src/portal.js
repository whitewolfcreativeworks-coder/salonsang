// Sang's portal: her appointments, open times, texts and settings. What's in here is the truth.
import { api, isDemo } from './backend.js';
import { ymd, hm, at, addDays, weekday, fmtTime, fmtDate, relDay, minutes, prettyPhone, normPhone, smsLink } from './lib/time.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const app = $('#app');
const A = () => api();
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let view = (location.hash.slice(1) || 'today');
let services = [], settings = null, calDay = ymd();

function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), ms); }
const fail = e => { console.error(e); toast('😿 ' + (e.message || 'Something went wrong')); };

// ============================================================ boot + login
async function boot() {
  try {
    if (isDemo()) return start();
    const s = await A().session();
    A().onAuth(sess => { if (!sess) login(); });
    if (!s) return login();
    if (!(await A().isOwner())) return notOwner(s.user.email);
    start();
  } catch (e) { fail(e); login(); }
}
function login(msg = '') {
  app.innerHTML = `
    <main class="p-login">
      <p class="p-kicker">Salon Sang</p>
      <h1><span class="script">Hello</span> Sang</h1>
      <p class="p-sub">Your appointments, open times and texts.</p>
      <form class="p-card p-form" id="loginForm">
        <label>Email<input name="email" type="email" autocomplete="username" required></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
        ${msg ? `<p class="p-err">${esc(msg)}</p>` : ''}
        <button class="p-btn" type="submit">Sign in 💅</button>
        <button class="p-link" type="button" id="magic">Email me a sign-in link instead</button>
      </form>
    </main>`;
  const f = $('#loginForm');
  f.onsubmit = async e => {
    e.preventDefault(); const b = $('button[type=submit]', f); b.disabled = true; b.textContent = 'Signing in…';
    try { await A().signIn(f.email.value.trim(), f.password.value); boot(); } catch (er) { login(er.message); }
  };
  $('#magic').onclick = async () => {
    if (!f.email.value) return toast('Type your email first 💌');
    try { await A().sendLink(f.email.value.trim()); toast('Check your email for the sign-in link 💌', 5000); } catch (er) { fail(er); }
  };
}
function notOwner(email) {
  app.innerHTML = `<main class="p-login"><h1><span class="script">Oops</span></h1><p class="p-sub">${esc(email)} isn't set up as the salon's owner yet.</p><button class="p-btn" id="out">Sign out</button></main>`;
  $('#out').onclick = async () => { await A().signOut(); login(); };
}

// ============================================================ shell
async function start() {
  app.innerHTML = `
    ${isDemo() ? '<div class="p-demo">Preview mode · pretend data · nothing is saved or texted</div>' : ''}
    <main class="p-main" id="main"></main>
    <button class="p-fab" id="fab" aria-label="New appointment">＋</button>
    <nav class="p-tabs">
      ${[['today', '☀️', 'Today'], ['calendar', '🗓️', 'Calendar'], ['hours', '🕘', 'Open times'], ['settings', '⚙️', 'Settings']]
        .map(([k, i, l]) => `<button data-view="${k}"><span>${i}</span>${l}</button>`).join('')}
    </nav>
    <div class="p-sheet" id="sheet" hidden><div class="p-sheet-back" data-close></div><div class="p-sheet-card" id="sheetCard"></div></div>`;
  $$('.p-tabs button').forEach(b => b.onclick = () => go(b.dataset.view));
  $('#fab').onclick = () => editAppt(null, view === 'calendar' ? calDay : ymd());
  $('#sheet').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== view) go(v); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && $('#sheet').hidden) render(); });
  try { [services, settings] = await Promise.all([A().services(), A().settings()]); } catch (e) { fail(e); }
  go(view);
}
function go(v) {
  view = ['today', 'calendar', 'hours', 'settings'].includes(v) ? v : 'today';
  history.replaceState(null, '', '#' + view);
  $$('.p-tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  render();
}
function render() {
  const m = $('#main'); if (!m) return;
  ({ today: renderToday, calendar: renderCalendar, hours: renderHours, settings: renderSettings })[view](m).catch(fail);
}
const dayRange = d => [at(d), at(addDays(d, 1))];

// ============================================================ TODAY
async function renderToday(m) {
  const t = ymd();
  const [appts, upcoming, msgs] = await Promise.all([
    A().appointments(...dayRange(t)),
    A().appointments(at(addDays(t, 1)), at(addDays(t, 4))),
    A().messages(at(addDays(t, -2)), at(addDays(t, 2)))
  ]);
  const live = appts.filter(a => a.status !== 'cancelled');
  const hour = +hm(new Date()).slice(0, 2);
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const due = msgs.filter(x => x.status === 'pending' && new Date(x.send_after) <= new Date(Date.now() + 10 * 60e3));
  const todayMsgs = msgs.filter(x => ymd(new Date(x.send_after)) === t || (x.status === 'pending' && new Date(x.send_after) < new Date()));
  m.innerHTML = `
    <header class="p-hello"><p class="p-kicker">${fmtDate(t)}</p><h1><span class="script">${hello},</span> Sang</h1>
      <p class="p-sub">${live.length ? `${live.length} ${live.length === 1 ? 'appointment' : 'appointments'} today` : 'No appointments today. Rest those hands 💖'}${due.length ? ` · <b>${due.length} text${due.length > 1 ? 's' : ''} ready to go</b>` : ''}</p></header>
    <section class="p-list">${live.map(a => apptCard(a)).join('')}</section>
    ${todayMsgs.length ? `<h2 class="p-h2">Texts today</h2><section class="p-card p-msgs">${todayMsgs.map(msgRow).join('')}</section>
      <p class="p-hint">Your iPhone sends these by itself every hour. If one is waiting, tap <b>Send</b> to text it yourself.</p>` : ''}
    ${upcoming.filter(a => a.status === 'booked').length ? `<h2 class="p-h2">Coming up</h2><section class="p-list">${upcoming.filter(a => a.status === 'booked').map(a => apptCard(a, true)).join('')}</section>` : ''}`;
  wireAppts(m, [...appts, ...upcoming]);
  wireMsgs(m, msgs);
}
function apptCard(a, showDay = false) {
  const s = new Date(a.starts_at), e = new Date(a.ends_at);
  const what = a.service_name + (a.addons?.length ? ' + ' + a.addons.join(', ') : '');
  return `
    <article class="p-appt ${a.status}" data-appt="${a.id}" tabindex="0">
      <div class="p-when"><b>${fmtTime(s)}</b><span>${showDay ? esc(relDay(ymd(s))) : fmtTime(e)}</span></div>
      <div class="p-who"><h3>${esc(a.client_name)}</h3><p>${esc(what)}</p>
        ${a.note ? `<p class="p-note">“${esc(a.note)}”</p>` : ''}
        <p class="p-tags">${a.source === 'web' ? '<i class="web">booked online</i>' : ''}${a.status !== 'booked' ? `<i class="st">${esc(a.status.replace('_', '-'))}</i>` : ''}${a.texts_ok ? '' : '<i>no texts</i>'}</p></div>
      ${a.client_phone ? `<div class="p-act"><a href="tel:${a.client_phone}" aria-label="Call ${esc(a.client_name)}">☏</a><a href="${smsLink(a.client_phone)}" aria-label="Text ${esc(a.client_name)}">✉</a></div>` : ''}
    </article>`;
}
function wireAppts(root, list) {
  $$('[data-appt]', root).forEach(el => {
    const open = e => { if (e.target.closest('a')) return; editAppt(list.find(a => a.id === +el.dataset.appt)); };
    el.onclick = open; el.onkeydown = e => { if (e.key === 'Enter') open(e); };
  });
}
function msgRow(x) {
  const who = x.appointment?.client_name || prettyPhone(x.to_phone);
  const label = { confirm: 'Confirmation', reminder: 'Reminder', custom: 'Message' }[x.kind];
  const when = new Date(x.send_after);
  const st = x.status === 'sent' ? `<span class="ok">Sent ${fmtTime(x.sent_at || when)} ✓</span>`
    : x.status === 'skipped' ? '<span class="muted">Skipped</span>'
    : when > new Date(Date.now() + 10 * 60e3) ? `<span class="muted">Goes out ${relDay(ymd(when)) === 'Today' ? '' : relDay(ymd(when)) + ' '}${fmtTime(when)}</span>`
    : `<button class="p-mini" data-send="${x.id}">Send</button>`;
  return `<div class="p-msg"><div><b>${esc(label)}</b> to ${esc(who)}</div>${st}</div>`;
}
function wireMsgs(root, msgs) {
  $$('[data-send]', root).forEach(b => b.onclick = async () => {
    const x = msgs.find(m => m.id === +b.dataset.send);
    try {
      const body = await A().previewMessage(x.id);
      location.href = smsLink(x.to_phone, body);
      await A().markSent(x.id);
      setTimeout(render, 800);
    } catch (e) { fail(e); }
  });
}

// ============================================================ CALENDAR
async function renderCalendar(m) {
  const t = ymd();
  const start = addDays(calDay < t ? calDay : t, 0);
  const days = Array.from({ length: 28 }, (_, i) => addDays(t, i - 3));
  const [appts, opens, allAppts] = await Promise.all([A().appointments(...dayRange(calDay)), A().openings(...dayRange(calDay)), A().appointments(at(days[0]), at(addDays(days.at(-1), 1)))]);
  void start;
  const count = {}; allAppts.filter(a => a.status === 'booked').forEach(a => { const d = ymd(new Date(a.starts_at)); count[d] = (count[d] || 0) + 1; });
  const items = [...opens.map(o => ({ t: new Date(o.starts_at), o })), ...appts.map(a => ({ t: new Date(a.starts_at), a }))].sort((x, y) => x.t - y.t || (x.o ? -1 : 1));
  m.innerHTML = `
    <header class="p-hello"><h1><span class="script">Calendar</span></h1></header>
    <div class="p-days">${days.map(d => `<button class="p-day${d === calDay ? ' on' : ''}${d === t ? ' today' : ''}" data-day="${d}"><span>${fmtDate(d, { weekday: 'short' })}</span><b>${fmtDate(d, { day: 'numeric' })}</b>${count[d] ? `<i>${count[d]}</i>` : '<i class="z"></i>'}</button>`).join('')}</div>
    <h2 class="p-h2">${esc(relDay(calDay))}${relDay(calDay).startsWith('To') ? ' · ' + fmtDate(calDay, { month: 'short', day: 'numeric' }) : ''}</h2>
    ${opens.length ? '' : `<p class="p-hint">No open times this day, so it isn't bookable online. <button class="p-link" id="openThis">Open this day</button></p>`}
    <section class="p-list">${items.map(i => i.o ? `<div class="p-open">Open ${fmtTime(i.o.starts_at)} – ${fmtTime(i.o.ends_at)}</div>` : apptCard(i.a)).join('') || ''}</section>
    <button class="p-btn p-btn-soft" id="addHere">＋ Add an appointment on ${esc(fmtDate(calDay, { weekday: 'long' }))}</button>`;
  $$('[data-day]', m).forEach(b => b.onclick = () => { calDay = b.dataset.day; render(); });
  wireAppts(m, appts);
  $('#addHere', m).onclick = () => editAppt(null, calDay);
  const ot = $('#openThis', m); if (ot) ot.onclick = () => { hoursPrefill = calDay; go('hours'); };
  const on = $('.p-day.on', m); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// ============================================================ OPEN TIMES
let hoursPrefill = null;
async function renderHours(m) {
  const t = ymd();
  const opens = await A().openings(at(t), at(addDays(t, 60)));
  const appts = await A().appointments(at(t), at(addDays(t, 60)));
  const booked = {}; appts.filter(a => a.status === 'booked').forEach(a => { const d = ymd(new Date(a.starts_at)); booked[d] = (booked[d] || 0) + 1; });
  const byDay = {}; opens.forEach(o => (byDay[ymd(new Date(o.starts_at))] ||= []).push(o));
  const from = hoursPrefill || t;
  const singleDay = !!hoursPrefill; hoursPrefill = null;
  m.innerHTML = `
    <header class="p-hello"><h1><span class="script">Open times</span></h1><p class="p-sub">Clients can only book online inside the times you open here.</p></header>
    <form class="p-card p-form" id="openForm">
      <div class="p-row"><label>From<input type="time" name="from" value="09:30" step="900" required></label><label>Until<input type="time" name="to" value="${settingsCloseGuess(from)}" step="900" required></label></div>
      <fieldset class="p-wd"><legend>Days</legend>${WD.map((d, i) => `<label><input type="checkbox" name="wd" value="${i}" ${singleDay ? (weekday(from) === i ? 'checked' : '') : (i ? 'checked' : '')}><span>${d}</span></label>`).join('')}</fieldset>
      <div class="p-row"><label>Starting<input type="date" name="start" value="${from}" min="${t}" required></label>
        <label>For<select name="weeks">${[[1, '1 week'], [2, '2 weeks'], [4, '4 weeks'], [8, '8 weeks']].map(([v, l]) => `<option value="${v}" ${v === (singleDay ? 1 : 2) ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <p class="p-hint" id="openPreview"></p>
      <button class="p-btn" type="submit">Open these times ✨</button>
    </form>
    <h2 class="p-h2">Coming up</h2>
    <section class="p-card p-opens">${Object.keys(byDay).sort().map(d => `
      <div class="p-oday"><div><b>${esc(relDay(d))}</b>${relDay(d).startsWith('To') ? ` · ${fmtDate(d, { month: 'short', day: 'numeric' })}` : ''}${booked[d] ? ` <i>${booked[d]} booked</i>` : ''}</div>
        ${byDay[d].map(o => `<div class="p-orow">${fmtTime(o.starts_at)} – ${fmtTime(o.ends_at)}<button class="p-x" data-del="${o.id}" aria-label="Remove">×</button></div>`).join('')}</div>`).join('') || '<p class="p-hint">Nothing open yet. Add your hours above 💖</p>'}</section>`;
  const f = $('#openForm', m);
  const plan = () => {
    const days = $$('input[name=wd]:checked', f).map(x => +x.value), out = [];
    for (let i = 0; i < +f.weeks.value * 7; i++) {
      const d = addDays(f.start.value, i);
      if (days.includes(weekday(d)) && f.from.value < f.to.value) out.push({ d, starts_at: at(d, f.from.value), ends_at: at(d, f.to.value) });
    }
    return out.filter(r => r.ends_at > new Date());
  };
  const prev = () => { const p = plan(); $('#openPreview', m).textContent = p.length ? `${p.length} day${p.length > 1 ? 's' : ''}: ${p.slice(0, 4).map(r => fmtDate(r.d, { weekday: 'short', month: 'short', day: 'numeric' })).join(', ')}${p.length > 4 ? '…' : ''}` : 'Pick at least one day.'; };
  f.oninput = prev; prev();
  f.onsubmit = async e => {
    e.preventDefault();
    const p = plan(); if (!p.length) return toast('Pick at least one day');
    // don't double up: skip days that already have an overlapping opening
    const fresh = p.filter(r => !opens.some(o => new Date(o.starts_at) < r.ends_at && new Date(o.ends_at) > r.starts_at));
    try { await A().addOpenings(fresh); toast(`Opened ${fresh.length} day${fresh.length === 1 ? '' : 's'} ✨${fresh.length < p.length ? ` (${p.length - fresh.length} already open)` : ''}`); render(); } catch (er) { fail(er); }
  };
  $$('[data-del]', m).forEach(b => b.onclick = async () => {
    const o = opens.find(x => x.id === +b.dataset.del);
    if (!confirm(`Close ${fmtDate(ymd(new Date(o.starts_at)))} ${fmtTime(o.starts_at)} – ${fmtTime(o.ends_at)}?\nAppointments already booked stay booked.`)) return;
    try { await A().deleteOpening(o.id); toast('Closed'); render(); } catch (er) { fail(er); }
  });
}
// summer (Apr–Oct) until 7 PM, winter until 5 PM
function settingsCloseGuess(d) { const mth = +d.slice(5, 7); return mth >= 4 && mth <= 10 ? '19:00' : '17:00'; }

// ============================================================ APPOINTMENT SHEET
function openSheet(html) { $('#sheetCard').innerHTML = html; $('#sheet').hidden = false; requestAnimationFrame(() => $('#sheet').classList.add('in')); }
function closeSheet() { $('#sheet').classList.remove('in'); setTimeout(() => { $('#sheet').hidden = true; }, 250); }

function editAppt(a, day = ymd()) {
  const isNew = !a;
  const main = services.filter(s => !s.is_addon && s.active), adds = services.filter(s => s.is_addon && s.active);
  const cats = [...new Set(main.map(s => s.category))];
  const s0 = a ? new Date(a.starts_at) : null;
  const curSvc = a ? (services.find(s => s.id === a.service_id) || services.find(s => s.name === a.service_name)) : null;
  const len = a ? Math.round((new Date(a.ends_at) - new Date(a.starts_at)) / 60000) : 60;
  openSheet(`
    <header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button>
      <h2>${isNew ? '<span class="script">New</span> appointment' : esc(a.client_name)}</h2>
      ${a ? `<p class="p-sub">${esc(relDay(ymd(s0)))} at ${fmtTime(s0)}${a.source === 'web' ? ' · booked online' : ''}</p>` : ''}</header>
    <form class="p-form" id="apptForm" autocomplete="off">
      <label class="p-ac">Client<input name="name" required value="${esc(a?.client_name || '')}" placeholder="Name"><div class="p-sugg" id="sugg"></div></label>
      <label>Mobile<input name="phone" type="tel" inputmode="tel" value="${esc(prettyPhone(a?.client_phone))}" placeholder="(541) 555-0123"></label>
      <label>Service<select name="service">${cats.map(c => `<optgroup label="${esc(c)}">${main.filter(s => s.category === c).map(s => `<option value="${s.id}" data-min="${s.minutes}" ${curSvc?.id === s.id ? 'selected' : ''}>${esc(s.name)} · ${esc(s.price)}</option>`).join('')}</optgroup>`).join('')}
        ${a && !curSvc ? `<option value="" selected>${esc(a.service_name)}</option>` : ''}</select></label>
      <details class="p-adds" ${a?.addons?.length ? 'open' : ''}><summary>Add-ons</summary>${adds.map(s => `<label class="p-chk"><input type="checkbox" name="addon" value="${s.id}" data-min="${s.minutes}" ${a?.addons?.includes(s.name) ? 'checked' : ''}><span>${esc(s.name)} <i>${esc(s.price)}</i></span></label>`).join('')}</details>
      <div class="p-row"><label>Day<input type="date" name="day" required value="${a ? ymd(s0) : day}"></label><label>Time<input type="time" name="time" required step="300" value="${a ? hm(s0) : ''}"></label></div>
      <label>Length (minutes)<input type="number" name="len" min="5" max="480" step="5" value="${len}"></label>
      <label>Note<textarea name="note" rows="2" maxlength="500">${esc(a?.note || '')}</textarea></label>
      <label class="p-chk"><input type="checkbox" name="texts_ok" ${a ? (a.texts_ok ? 'checked' : '') : 'checked'}><span>Text reminders for this client</span></label>
      <label class="p-chk"><input type="checkbox" name="confirm" ${isNew ? 'checked' : ''}><span>${isNew ? 'Send a confirmation text' : 'Send a new confirmation if I change the time'}</span></label>
      <p class="p-warn" id="warn" hidden></p>
      <button class="p-btn" type="submit">${isNew ? 'Save appointment 💅' : 'Save changes'}</button>
      ${a ? `<div class="p-row p-more">
        ${a.status === 'booked' ? `<button type="button" class="p-btn p-btn-soft" data-status="cancelled">Cancel appointment</button><button type="button" class="p-btn p-btn-soft" data-status="no_show">No-show</button>`
          : `<button type="button" class="p-btn p-btn-soft" data-status="booked">Restore appointment</button>`}</div>
        ${a.client_phone ? `<a class="p-link" href="${smsLink(a.client_phone)}">Text ${esc(a.client_name.split(' ')[0])} from my phone</a>` : ''}` : ''}
    </form>`);
  const f = $('#apptForm');
  const recalc = () => {
    const base = +(f.service.selectedOptions[0]?.dataset.min || len);
    const extra = $$('input[name=addon]:checked', f).reduce((s, x) => s + +x.dataset.min, 0);
    f.len.value = base + extra;
  };
  f.service.onchange = recalc; $$('input[name=addon]', f).forEach(x => x.onchange = recalc);
  // returning clients
  let tmr; f.name.oninput = () => { clearTimeout(tmr); tmr = setTimeout(async () => {
    const q = f.name.value.trim(); const box = $('#sugg');
    if (q.length < 2) { box.innerHTML = ''; return; }
    const list = await A().clients(q).catch(() => []);
    box.innerHTML = list.map(c => `<button type="button" data-p="${esc(c.phone)}" data-n="${esc(c.name)}">${esc(c.name)} <i>${esc(prettyPhone(c.phone))}</i></button>`).join('');
    $$('button', box).forEach(b => b.onclick = () => { f.name.value = b.dataset.n; f.phone.value = prettyPhone(b.dataset.p); box.innerHTML = ''; });
  }, 220); };
  // gentle warnings (Sang's portal is the law, so they never block)
  const check = async () => {
    const w = $('#warn'); if (!f.day.value || !f.time.value) return (w.hidden = true);
    const s = at(f.day.value, f.time.value), e = new Date(s.getTime() + +f.len.value * 60000);
    const [same, opens] = await Promise.all([A().appointments(...dayRange(f.day.value)), A().openings(...dayRange(f.day.value))]);
    const clash = same.filter(x => x.status === 'booked' && x.id !== a?.id && new Date(x.starts_at) < e && new Date(x.ends_at) > s);
    const inside = opens.some(o => new Date(o.starts_at) <= s && new Date(o.ends_at) >= e);
    const msg = [clash.length ? `Overlaps ${clash.map(x => `${x.client_name} at ${fmtTime(x.starts_at)}`).join(', ')}` : '', !inside ? 'Outside your open times (that’s okay)' : ''].filter(Boolean);
    w.hidden = !msg.length; w.textContent = msg.join(' · ');
  };
  f.day.onchange = f.time.onchange = f.len.onchange = () => check().catch(() => {});
  if (a) check().catch(() => {});
  f.onsubmit = async e => {
    e.preventDefault();
    const phone = f.phone.value.trim() ? normPhone(f.phone.value) : null;
    if (f.phone.value.trim() && !phone) return toast('That phone number looks off');
    const start = at(f.day.value, f.time.value);
    const svc = services.find(s => s.id === +f.service.value);
    const row = {
      service_id: svc?.id ?? a?.service_id ?? null, service_name: svc?.name || a?.service_name || 'Appointment',
      addons: $$('input[name=addon]:checked', f).map(x => services.find(s => s.id === +x.value).name),
      starts_at: start.toISOString(), ends_at: new Date(start.getTime() + +f.len.value * 60000).toISOString(),
      client_name: f.name.value.trim(), client_phone: phone, note: f.note.value.trim() || null,
      texts_ok: f.texts_ok.checked, send_confirmation: f.confirm.checked
    };
    if (a) row.id = a.id; else row.source = 'portal';
    const btn = $('button[type=submit]', f); btn.disabled = true;
    try { await A().saveAppointment(row); closeSheet(); toast(isNew ? 'Booked 💅' : 'Saved ✓'); render(); }
    catch (er) { btn.disabled = false; fail(er); }
  };
  $$('[data-status]', f).forEach(b => b.onclick = async () => {
    const st = b.dataset.status;
    if (st === 'cancelled' && !confirm(`Cancel ${a.client_name}'s appointment? Their reminder won't be sent.`)) return;
    try { await A().saveAppointment({ id: a.id, status: st }); closeSheet(); toast(st === 'booked' ? 'Restored' : st === 'cancelled' ? 'Cancelled' : 'Marked no-show'); render(); } catch (er) { fail(er); }
  });
}

// ============================================================ SETTINGS
async function renderSettings(m) {
  const [s, setup] = await Promise.all([A().settings(), A().setup().catch(() => ({}))]);
  settings = s;
  const sb = A().supabaseUrl;
  m.innerHTML = `
    <header class="p-hello"><h1><span class="script">Settings</span></h1></header>
    <form class="p-card p-form" id="setForm">
      <label class="p-chk big"><input type="checkbox" name="booking_open" ${s.booking_open ? 'checked' : ''}><span><b>Online booking is on</b><br><small>Turn off to pause website bookings (vacation, busy week)</small></span></label>
      <h3>Reminder texts</h3>
      <div class="p-row"><label>Send<select name="remind_hours_before">${[2, 3, 4, 5, 6, 24].map(h => `<option value="${h}" ${+s.remind_hours_before === h ? 'selected' : ''}>${h === 24 ? '1 day' : h + ' hours'} before</option>`).join('')}</select></label>
        <label>But not before<input type="time" name="remind_earliest" value="${String(s.remind_earliest).slice(0, 5)}"></label></div>
      <h3>Online booking rules</h3>
      <div class="p-row"><label>Book at least<select name="min_notice_min">${[[60, '1 hour'], [120, '2 hours'], [180, '3 hours'], [720, '12 hours'], [1440, '1 day']].map(([v, l]) => `<option value="${v}" ${s.min_notice_min === v ? 'selected' : ''}>${l} ahead</option>`).join('')}</select></label>
        <label>Up to<select name="max_days_ahead">${[14, 30, 60, 90].map(v => `<option value="${v}" ${s.max_days_ahead === v ? 'selected' : ''}>${v} days out</option>`).join('')}</select></label></div>
      <div class="p-row"><label>Start times every<select name="slot_step_min">${[15, 30, 60].map(v => `<option value="${v}" ${s.slot_step_min === v ? 'selected' : ''}>${v} min</option>`).join('')}</select></label>
        <label>Break between clients<select name="buffer_min">${[0, 5, 10, 15, 20, 30].map(v => `<option value="${v}" ${s.buffer_min === v ? 'selected' : ''}>${v} min</option>`).join('')}</select></label></div>
      <h3>Your messages</h3>
      <p class="p-hint">Words in {curly braces} fill in by themselves: {first} {name} {service} {time} {when} {date}</p>
      ${[['confirm_template', 'Confirmation (right after booking)'], ['reminder_template', 'Reminder, morning appointments'], ['reminder_template_pm', 'Reminder, afternoon appointments']].map(([k, l]) => `
        <label>${l}<textarea name="${k}" rows="4">${esc(s[k])}</textarea></label><p class="p-preview" data-prev="${k}"></p>`).join('')}
      <button class="p-btn" type="submit">Save settings</button>
    </form>

    <h2 class="p-h2">Your menu</h2>
    <p class="p-hint">Minutes decide how long each booking blocks. Untick “online” for anything you'd rather book yourself.</p>
    <section class="p-card p-menu">${services.map(v => `
      <div class="p-svc" data-svc="${v.id}"><div class="n">${esc(v.name)}<small>${esc(v.category)}</small></div>
        <input aria-label="Price" name="price" value="${esc(v.price)}"><input aria-label="Minutes" name="minutes" type="number" min="5" max="480" step="5" value="${v.minutes}">
        <label class="p-tog"><input type="checkbox" name="online" ${v.online ? 'checked' : ''}><span>online</span></label></div>`).join('')}</section>

    <h2 class="p-h2">Your iPhone</h2>
    <section class="p-card p-setup">
      <p><b>Texts to clients</b> go out from your own number through the “Salon Sang texts” shortcut. It needs these two things:</p>
      <label>Shortcut address<input readonly value="${esc(sb)}/rest/v1/rpc/phone_outbox"></label>
      <label>Your secret phone key<input readonly value="${esc(setup.phone_token || '')}"></label>
      <label>Site key (for the apikey header)<input readonly value="${esc(A().anonKey)}"></label>
      <p><b>New-booking alerts</b> come through the free <b>ntfy</b> app. Subscribe to this topic:</p>
      <label>Alert topic<input readonly value="${esc(setup.ntfy_topic || '')}"></label>
      <p class="p-hint">Tap any box to copy it. Step-by-step: <a href="setup.html${isDemo() ? '?demo' : ''}">iPhone setup guide</a>. Keep your phone key private.</p>
    </section>
    <button class="p-btn p-btn-soft" id="signout">Sign out</button>`;
  const f = $('#setForm', m);
  const prevAll = async () => { for (const p of $$('[data-prev]', m)) {
    const k = p.dataset.prev; const sample = k === 'reminder_template_pm' ? at(addDays(ymd(), 0), '14:30') : at(addDays(ymd(), k === 'confirm_template' ? 1 : 0), '10:00');
    try { p.textContent = await A().templatePreview(f[k].value, sample); } catch { p.textContent = ''; } } };
  let pt; f.oninput = () => { clearTimeout(pt); pt = setTimeout(prevAll, 300); }; prevAll();
  f.onsubmit = async e => {
    e.preventDefault();
    const patch = { booking_open: f.booking_open.checked, remind_hours_before: +f.remind_hours_before.value, remind_earliest: f.remind_earliest.value,
      min_notice_min: +f.min_notice_min.value, max_days_ahead: +f.max_days_ahead.value, slot_step_min: +f.slot_step_min.value, buffer_min: +f.buffer_min.value,
      confirm_template: f.confirm_template.value, reminder_template: f.reminder_template.value, reminder_template_pm: f.reminder_template_pm.value };
    try { settings = await A().saveSettings(patch); toast('Saved ✓'); } catch (er) { fail(er); }
  };
  $$('.p-svc', m).forEach(row => row.onchange = async () => {
    const id = +row.dataset.svc;
    const patch = { id, price: $('[name=price]', row).value.trim(), minutes: +$('[name=minutes]', row).value, online: $('[name=online]', row).checked };
    try { await A().saveService(patch); Object.assign(services.find(v => v.id === id), patch); toast('Menu updated ✓', 1400); } catch (er) { fail(er); }
  });
  $$('.p-setup input', m).forEach(i => i.onclick = () => { i.select(); navigator.clipboard?.writeText(i.value).then(() => toast('Copied ✓', 1200)).catch(() => {}); });
  $('#signout', m).onclick = async () => { await A().signOut(); if (!isDemo()) login(); };
}

boot();
