// "Book online": pick a service → one of Sang's open times → your name and number. Done, with sparkles.
import { api } from './backend.js';
import { ymd, addDays, fmtTime, fmtDate, relDay, minutes, normPhone, prettyPhone } from './lib/time.js';
import { SALON_PHONE } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DAYS = 21;
const CAT_ORDER = ['Manicure', 'Pedicure', 'Full set', 'Fill', 'Overlay', 'Extras'];

let sheet, info, state;

export function initBooking() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book]'); if (!b) return;
    e.preventDefault(); open(b.dataset.book || null);
  });
}

function build() {
  sheet = document.createElement('div');
  sheet.className = 'bk'; sheet.hidden = true;
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'bkTitle');
  sheet.innerHTML = `
    <div class="bk-back" data-close></div>
    <div class="bk-card">
      <header class="bk-head">
        <button class="bk-x" type="button" data-close aria-label="Close">×</button>
        <p class="bk-kicker">Salon Sang · Online booking</p>
        <h2 class="bk-title" id="bkTitle"><span class="script">Book</span> your time</h2>
        <ol class="bk-steps" aria-hidden="true"><li data-s="1">Service</li><li data-s="2">Time</li><li data-s="3">You</li></ol>
        <p class="bk-demo" hidden>Preview mode: nothing is saved or sent</p>
      </header>
      <div class="bk-body" data-lenis-prevent></div>
    </div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
}

async function open(preselect) {
  if (!sheet) build();
  state = { step: 1, cat: 'Manicure', service: null, addons: [], slots: null, day: null, time: null };
  sheet.hidden = false;
  document.documentElement.classList.add('no-scroll');
  requestAnimationFrame(() => sheet.classList.add('in'));
  $('.bk-demo', sheet).hidden = !api().demo;
  body('<div class="bk-loading"><i></i><i></i><i></i></div>');
  try {
    info = await api().info();
    if (!info.open) return body(`<div class="bk-msg"><p>Online booking is resting for a moment 💤</p><a class="btn btn-pink" href="sms:${SALON_PHONE}">Text Sang to book</a></div>`);
    if (preselect) { const s = info.services.find(v => String(v.id) === preselect || v.name === preselect); if (s) { state.service = s; state.cat = s.category; } }
    renderService();
  } catch (err) {
    body(`<div class="bk-msg"><p>Hmm, booking couldn't load right now.</p><p>${esc(err.message)}</p><a class="btn btn-pink" href="sms:${SALON_PHONE}">Text Sang to book</a></div>`);
  }
}
function close() {
  sheet.classList.remove('in');
  document.documentElement.classList.remove('no-scroll');
  setTimeout(() => { sheet.hidden = true; }, 300);
}
const body = html => { $('.bk-body', sheet).innerHTML = html; $('.bk-body', sheet).scrollTop = 0; };
function steps(n) { sheet.querySelectorAll('.bk-steps li').forEach(li => { li.classList.toggle('on', +li.dataset.s === n); li.classList.toggle('done', +li.dataset.s < n); }); }

// ---------- 1. service
function renderService() {
  steps(1);
  const main = info.services.filter(s => !s.addon), adds = info.services.filter(s => s.addon);
  const cats = CAT_ORDER.filter(c => main.some(s => s.category === c));
  body(`
    <div class="bk-cats" role="tablist">${cats.map(c => `<button type="button" role="tab" data-cat="${esc(c)}" aria-selected="${c === state.cat}">${esc(c)}</button>`).join('')}</div>
    <div class="bk-list">${main.filter(s => s.category === state.cat).map(s => `
      <button type="button" class="bk-svc${state.service?.id === s.id ? ' on' : ''}" data-svc="${s.id}">
        <span class="n">${esc(s.name)}</span><span class="m">${minutes(s.minutes)}</span><span class="p">${esc(s.price)}</span>
      </button>`).join('')}</div>
    ${state.service && adds.length ? `<div class="bk-adds"><p class="bk-label">Add a little extra? <span>optional</span></p>
      <div class="bk-chips">${adds.map(a => `<button type="button" class="bk-chip${state.addons.includes(a.id) ? ' on' : ''}" data-add="${a.id}" aria-pressed="${state.addons.includes(a.id)}">${esc(a.name)} <b>${esc(a.price)}</b></button>`).join('')}</div></div>` : ''}
    <div class="bk-foot"><button type="button" class="btn btn-pink bk-next" ${state.service ? '' : 'disabled'}>Pick a time →</button></div>`);
  const b = $('.bk-body', sheet);
  b.querySelectorAll('[data-cat]').forEach(x => x.onclick = () => { state.cat = x.dataset.cat; renderService(); });
  b.querySelectorAll('[data-svc]').forEach(x => x.onclick = () => { state.service = info.services.find(s => s.id === +x.dataset.svc); state.slots = null; renderService(); });
  b.querySelectorAll('[data-add]').forEach(x => x.onclick = () => {
    const id = +x.dataset.add; state.addons = state.addons.includes(id) ? state.addons.filter(i => i !== id) : [...state.addons, id]; state.slots = null; renderService();
  });
  $('.bk-next', b).onclick = () => { state.step = 2; renderTime(); };
}

// ---------- 2. time
async function renderTime() {
  steps(2);
  if (!state.slots) {
    body('<div class="bk-loading"><i></i><i></i><i></i></div><p class="bk-sub">Finding Sang’s open times…</p>');
    try { state.slots = await api().slots(state.service.id, state.addons, ymd(), DAYS); }
    catch (err) { return body(`<div class="bk-msg"><p>${esc(err.message)}</p><button type="button" class="btn btn-pink bk-back-btn">← Back</button></div>`), ($('.bk-back-btn', sheet).onclick = renderService); }
  }
  const byDay = {};
  state.slots.forEach(t => { (byDay[ymd(t)] ||= []).push(t); });
  const days = Array.from({ length: DAYS }, (_, i) => addDays(ymd(), i));
  if (!state.day || !byDay[state.day]) state.day = days.find(d => byDay[d]) || null;
  const total = minutes(state.service.minutes + info.services.filter(s => state.addons.includes(s.id)).reduce((a, s) => a + s.minutes, 0));
  body(`
    <p class="bk-pick"><b>${esc(state.service.name)}</b>${state.addons.length ? ' + ' + state.addons.map(id => esc(info.services.find(s => s.id === id).name)).join(', ') : ''} · ${total}</p>
    ${state.day ? `
    <div class="bk-days" data-lenis-prevent>${days.map(d => `
      <button type="button" class="bk-day${d === state.day ? ' on' : ''}" data-day="${d}" ${byDay[d] ? '' : 'disabled'}>
        <span>${d === ymd() ? 'Today' : fmtDate(d, { weekday: 'short' })}</span><b>${fmtDate(d, { day: 'numeric' })}</b><i>${fmtDate(d, { month: 'short' })}</i>
      </button>`).join('')}</div>
    <p class="bk-label">${esc(relDay(state.day))}</p>
    <div class="bk-times">${byDay[state.day].map(t => `<button type="button" class="bk-time${state.time?.getTime() === t.getTime() ? ' on' : ''}" data-t="${t.toISOString()}">${fmtTime(t)}</button>`).join('')}</div>`
    : `<div class="bk-msg"><p>No open times online in the next few weeks for this one, but Sang can often squeeze you in 💖</p><a class="btn btn-pink" href="sms:${SALON_PHONE}">Text Sang</a></div>`}
    <div class="bk-foot"><button type="button" class="btn btn-ghost bk-prev">← Service</button><button type="button" class="btn btn-pink bk-next" ${state.time ? '' : 'disabled'}>Almost done →</button></div>`);
  const b = $('.bk-body', sheet);
  b.querySelectorAll('[data-day]').forEach(x => x.onclick = () => { state.day = x.dataset.day; state.time = null; renderTime(); });
  b.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { state.time = new Date(x.dataset.t); renderTime(); });
  $('.bk-prev', b).onclick = renderService;
  $('.bk-next', b).onclick = renderYou;
  const on = $('.bk-day.on', b); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// ---------- 3. you
function renderYou(err) {
  steps(3);
  const f = state.form || { name: '', phone: '', note: '', textsOk: true };
  body(`
    <div class="bk-summary"><b>${esc(state.service.name)}</b>${state.addons.length ? ' + ' + state.addons.map(id => esc(info.services.find(s => s.id === id).name)).join(', ') : ''}
      <span>${esc(relDay(ymd(state.time)))} at ${fmtTime(state.time)}</span></div>
    <form class="bk-form" novalidate>
      <label>Your name<input name="name" autocomplete="name" required maxlength="60" value="${esc(f.name)}"></label>
      <label>Mobile number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="(541) 555-0123" value="${esc(f.phone)}"></label>
      <label><span class="t">Anything Sang should know? <i>optional</i></span><textarea name="note" rows="2" maxlength="300" placeholder="Inspo, length, colors, allergies…">${esc(f.note)}</textarea></label>
      <label class="bk-check"><input type="checkbox" name="textsOk" ${f.textsOk ? 'checked' : ''}><span>Text me a confirmation and a little reminder on the day ✨</span></label>
      ${err ? `<p class="bk-err" role="alert">${esc(err)}</p>` : ''}
      <div class="bk-foot"><button type="button" class="btn btn-ghost bk-prev">← Time</button><button type="submit" class="btn btn-pink bk-go">Book it 💖</button></div>
      <p class="bk-fine">Texts come from Sang's own phone. Reply anytime to change or cancel.</p>
    </form>`);
  const form = $('.bk-form', sheet);
  $('.bk-prev', form).onclick = () => { state.form = read(form); renderTime(); };
  form.onsubmit = async e => {
    e.preventDefault();
    const v = state.form = read(form);
    if (v.name.trim().length < 2) return renderYou('Please enter your name.');
    if (!normPhone(v.phone)) return renderYou('Please enter a valid 10-digit mobile number.');
    const go = $('.bk-go', form); go.disabled = true; go.textContent = 'Booking…';
    try {
      const r = await api().book({ service: state.service.id, addons: state.addons, start: state.time, name: v.name.trim(), phone: v.phone, note: v.note.trim(), textsOk: v.textsOk });
      done(r, v);
    } catch (er) {
      if (/taken/.test(er.message)) { state.slots = null; state.time = null; await renderTime(); const m = document.createElement('p'); m.className = 'bk-err'; m.textContent = er.message; $('.bk-body', sheet).prepend(m); }
      else renderYou(er.message);
    }
  };
}
const read = f => ({ name: f.name.value, phone: f.phone.value, note: f.note.value, textsOk: f.textsOk.checked });

// ---------- done
function done(r, v) {
  steps(4);
  const start = new Date(r.starts_at), end = new Date(r.ends_at);
  const first = v.name.trim().split(' ')[0];
  const what = r.service + (r.addons?.length ? ' + ' + r.addons.join(', ') : '');
  body(`
    <div class="bk-done">
      <div class="bk-heart" aria-hidden="true">💅</div>
      <h3>You're booked, ${esc(first)}!</h3>
      <p class="bk-when"><b>${esc(what)}</b><br>${esc(relDay(ymd(start)))} at ${fmtTime(start)}</p>
      <p class="bk-where">Salon Sang · Sola Salon Studios, Suite 12<br>440 W 6th Ave, Eugene</p>
      ${v.textsOk ? `<p class="bk-sub">A confirmation text is on its way to ${esc(prettyPhone(v.phone))}, and a sweet reminder will come on the day ✨</p>` : ''}
      <div class="bk-actions">
        <a class="btn btn-pink" download="salon-sang.ics" href="${ics(what, start, end)}">Add to my calendar</a>
        <a class="btn btn-ghost" href="sms:${SALON_PHONE}">Text Sang</a>
      </div>
      <button type="button" class="bk-close-link" data-close>Back to the salon</button>
    </div>`);
  const h = $('.bk-heart', sheet).getBoundingClientRect();
  window.sparkleBurst && window.sparkleBurst(h.left + h.width / 2, h.top + h.height / 2, 60);
}
function ics(what, start, end) {
  const f = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Salon Sang//Booking//EN', 'BEGIN:VEVENT', `UID:${f(start)}-${Math.random().toString(36).slice(2)}@salonsang.com`,
    `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${what} at Salon Sang 💅`,
    'LOCATION:Salon Sang\\, Sola Salon Studios Suite 12\\, 440 W 6th Ave\\, Eugene\\, OR 97401', 'DESCRIPTION:Need to change it? Call or text 530-648-4977',
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Salon Sang today 💅', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(txt);
}
