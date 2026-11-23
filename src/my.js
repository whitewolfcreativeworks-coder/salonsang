// salonsang.com/my/?t=… : a client's private page to see, move or cancel their appointment.
import { api } from './backend.js';
import { SALON_PHONE } from './config.js';
import { ymd, addDays, fmtTime, fmtDate, relDay } from './lib/time.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const token = new URLSearchParams(location.search).get('t') || '';
const card = $('#my');
const DAYS = 42;
let appt = null, slots = null, day = null, pick = null;

const what = a => a.service + (a.addons?.length ? ' + ' + a.addons.join(' + ') : '');
const when = a => `${relDay(ymd(new Date(a.starts_at)))}${relDay(ymd(new Date(a.starts_at))).startsWith('To') ? ', ' + fmtDate(ymd(new Date(a.starts_at)), { month: 'short', day: 'numeric' }) : ''} at ${fmtTime(new Date(a.starts_at))}`;
const contact = `<p class="bk-sub my-contact">Questions? <a href="sms:+1${SALON_PHONE}">Text Sang</a> or <a href="tel:+1${SALON_PHONE}">call 530-648-4977</a></p>`;
const show = html => { card.innerHTML = html; scrollTo(0, 0); };
const fail = e => show(`<div class="bk-msg"><p>${esc(e.message || 'Something went wrong')}</p><a class="btn btn-pink" href="sms:+1${SALON_PHONE}">Text Sang</a></div>`);

async function start() {
  show('<div class="bk-loading"><i></i><i></i><i></i></div>');
  try { appt = await api().myAppt(token); } catch (e) { return fail(e); }
  if (!appt) return show(`<div class="bk-msg"><div class="bk-heart">🔎</div><h3 class="my-h">Hmm, we couldn't find that appointment</h3><p>The link may be incomplete. Sang is happy to help.</p>
    <div class="bk-actions"><a class="btn btn-pink" href="sms:+1${SALON_PHONE}">Text Sang</a><a class="btn btn-ghost" href="tel:+1${SALON_PHONE}">Call 530-648-4977</a></div></div>`);
  home();
}

function home(note = '') {
  const a = appt;
  if (a.status === 'cancelled') return show(`<div class="bk-done"><div class="bk-heart">💖</div><h3>This one's cancelled</h3>
      <p class="bk-when">${esc(what(a))}<br>${esc(when(a))}</p><p class="bk-sub">Whenever you're ready, Sang would love to see you.</p>
      <div class="bk-actions"><a class="btn btn-pink" href="/#book">Book a new time</a></div>${contact}</div>`);
  if (!a.can_change) return show(`<div class="bk-done"><div class="bk-heart">💅</div><h3>Hi ${esc(a.first)}!</h3>
      <p class="bk-when"><b>${esc(what(a))}</b><br>${esc(when(a))}</p><p class="bk-sub">This visit can't be changed online anymore. Hope you loved it!</p>
      <div class="bk-actions"><a class="btn btn-pink" href="/#book">Book again</a></div>${contact}</div>`);
  show(`<div class="bk-done"><div class="bk-heart">💅</div><h3>Hi ${esc(a.first)}!</h3>
      ${note ? `<p class="my-note">${note}</p>` : ''}
      <p class="bk-when"><b>${esc(what(a))}</b><br>${esc(when(a))}</p>
      <p class="bk-where">Salon Sang · Sola Salon Studios, Suite 12<br>440 W 6th Ave, Eugene</p>
      <div class="bk-actions"><button class="btn btn-pink" id="move">Pick a new time</button><button class="btn btn-ghost" id="cancel">Cancel appointment</button></div>${contact}</div>`);
  $('#move').onclick = () => { slots = null; pick = null; moveView(); };
  $('#cancel').onclick = cancelView;
}

async function moveView() {
  if (!slots) {
    show('<div class="bk-loading"><i></i><i></i><i></i></div><p class="bk-sub">Finding Sang\'s open times…</p>');
    try { slots = (await api().mySlots(token, ymd(), DAYS)).filter(t => t.getTime() !== new Date(appt.starts_at).getTime()); } catch (e) { return fail(e); }
  }
  const byDay = {}; slots.forEach(t => { (byDay[ymd(t)] ||= []).push(t); });
  const days = Array.from({ length: DAYS }, (_, i) => addDays(ymd(), i));
  if (!day || !byDay[day]) day = days.find(d => byDay[d]) || null;
  show(`<h3 class="my-h">Pick a new time</h3><p class="bk-sub">${esc(what(appt))} · now ${esc(when(appt))}</p>
    ${day ? `<div class="bk-days">${days.map(d => `<button type="button" class="bk-day${d === day ? ' on' : ''}" data-day="${d}" ${byDay[d] ? '' : 'disabled'}>
        <span>${d === ymd() ? 'Today' : fmtDate(d, { weekday: 'short' })}</span><b>${fmtDate(d, { day: 'numeric' })}</b><i>${fmtDate(d, { month: 'short' })}</i></button>`).join('')}</div>
      <p class="bk-label">${esc(relDay(day))}</p>
      <div class="bk-times">${byDay[day].map(t => `<button type="button" class="bk-time${pick?.getTime() === t.getTime() ? ' on' : ''}" data-t="${t.toISOString()}">${fmtTime(t)}</button>`).join('')}</div>`
    : `<div class="bk-msg"><p>No open times online in the next few weeks, but Sang can often squeeze you in 💖</p><a class="btn btn-pink" href="sms:+1${SALON_PHONE}">Text Sang</a></div>`}
    <div class="bk-actions my-foot"><button class="btn btn-pink" id="go" ${pick ? '' : 'disabled'}>${pick ? `Move to ${esc(relDay(ymd(pick)))} ${fmtTime(pick)}` : 'Choose a time'}</button><button class="btn btn-ghost" id="back">Keep my time</button></div>`);
  card.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { day = b.dataset.day; pick = null; moveView(); });
  card.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { pick = new Date(b.dataset.t); moveView(); });
  const on = card.querySelector('.bk-day.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  $('#back').onclick = () => home();
  $('#go').onclick = async () => {
    const b = $('#go'); b.disabled = true; b.textContent = 'Moving…';
    try { appt = await api().myMove(token, pick); home(`✨ All set! You're moved. A new confirmation text is on its way.`); window.sparkleBurst?.(innerWidth / 2, 160, 50); }
    catch (e) { slots = null; pick = null; alert(e.message); moveView(); }
  };
}

function cancelView() {
  show(`<div class="bk-done"><div class="bk-heart">🥺</div><h3>Cancel this visit?</h3>
    <p class="bk-when"><b>${esc(what(appt))}</b><br>${esc(when(appt))}</p>
    <p class="bk-sub">Plans change, totally okay. Would a different time work instead?</p>
    <div class="bk-actions"><button class="btn btn-pink" id="other">Pick a different time</button><button class="btn btn-ghost" id="yes">Yes, cancel it</button><button class="my-link" id="no">Keep my appointment</button></div></div>`);
  $('#other').onclick = () => { slots = null; pick = null; moveView(); };
  $('#no').onclick = () => home();
  $('#yes').onclick = async () => {
    const b = $('#yes'); b.disabled = true; b.textContent = 'Cancelling…';
    try { appt = await api().myCancel(token); home(); } catch (e) { fail(e); }
  };
}

start();
