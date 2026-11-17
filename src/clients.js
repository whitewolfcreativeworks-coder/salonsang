// Sang's clients: everyone she's seen (built from her appointments) plus anyone she adds, with
// notes, birthday, nail photos, visit history and "Book again".
import { ymd, fmtDate, fmtTime, relDay, prettyPhone, normPhone, smsLink } from './lib/time.js';
import { shrink, pickPhoto } from './books.js';

const DAY = 86400e3;
const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const keyOf = (name, phone) => phone || 'name:' + name.trim().toLowerCase();
let filter = 'all', query = '';

export async function renderClients(m, ctx) {
  const { esc } = ctx;
  const list = await ctx.A().clientList();
  const now = Date.now(), month = new Date().getMonth() + 1;
  const tests = {
    all: () => true,
    soon: c => !!c.next_visit,
    away: c => !c.next_visit && c.last_visit && now - new Date(c.last_visit).getTime() > 42 * DAY,
    bday: c => c.birthday && +String(c.birthday).slice(5, 7) === month
  };
  m.innerHTML = `
    <header class="p-hello"><p class="p-kicker">Clients</p><h1><span class="script">Your</span> people</h1>
      <p class="p-sub">${list.length} ${list.length === 1 ? 'client' : 'clients'}. Tap anyone for notes, photos and history.</p></header>
    <input class="c-search" type="search" placeholder="🔍 Search by name or number" value="${esc(query)}" aria-label="Search clients">
    <div class="c-filters">${[['all', 'All'], ['soon', 'Coming up'], ['away', 'Not seen in 6+ weeks'], ['bday', '🎂 Birthdays this month']]
      .map(([k, l]) => `<button type="button" data-f="${k}" class="${filter === k ? 'on' : ''}">${l} <i>${list.filter(tests[k]).length}</i></button>`).join('')}</div>
    <section class="c-list" id="cList"></section>
    <button class="p-btn p-btn-soft" id="addClient">＋ Add a client</button>`;
  const draw = () => {
    const q = query.trim().toLowerCase(), qd = q.replace(/\D/g, '');
    const shown = list.filter(tests[filter]).filter(c => !q || c.name.toLowerCase().includes(q) || (qd && (c.phone || '').includes(qd)));
    m.querySelector('#cList').innerHTML = shown.length ? shown.map(c => `
      <article class="c-row" data-key="${esc(c.key)}" tabindex="0">
        <i class="c-av">${esc(initials(c.name))}</i>
        <div class="c-who"><b>${esc(c.name)}</b><span>${c.next_visit ? `Next: ${esc(relDay(ymd(new Date(c.next_visit))))} ${fmtTime(new Date(c.next_visit))}`
          : c.last_visit ? `Last visit ${fmtDate(ymd(new Date(c.last_visit)))}` : 'New client'}${c.visits ? ` · ${c.visits} ${+c.visits === 1 ? 'visit' : 'visits'}` : ''}${c.notes ? ' · 📝' : ''}</span></div>
        ${c.phone ? `<div class="p-act"><a href="tel:${esc(c.phone)}" aria-label="Call">☏</a><a href="${smsLink(c.phone)}" aria-label="Text">✉</a></div>` : ''}
      </article>`).join('') : `<p class="p-hint">${q ? 'No one by that name yet.' : filter === 'away' ? 'Everyone has been in lately 💖' : filter === 'bday' ? 'No birthdays this month.' : filter === 'soon' ? 'No one booked yet.' : 'Your clients show up here as you add appointments.'}</p>`;
    m.querySelectorAll('[data-key]').forEach(el => {
      const open = e => { if (e.target.closest('a')) return; clientCard(ctx, list.find(c => c.key === el.dataset.key)); };
      el.onclick = open; el.onkeydown = e => { if (e.key === 'Enter') open(e); };
    });
  };
  draw();
  m.querySelector('.c-search').oninput = e => { query = e.target.value; draw(); };
  m.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; m.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  m.querySelector('#addClient').onclick = () => addClient(ctx);
}

function addClient(ctx) {
  ctx.openSheet(`
    <header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button><h2><span class="script">New</span> client</h2></header>
    <form class="p-form" id="newClient">
      <label>Name<input name="name" required maxlength="80"></label>
      <label>Mobile<input name="phone" type="tel" inputmode="tel" placeholder="(541) 555-0123"></label>
      <label>Notes<textarea name="notes" rows="3" maxlength="4000" placeholder="Favorite colors, shape, sensitive skin…"></textarea></label>
      <label>Birthday <small>(optional)</small><input name="birthday" type="date"></label>
      <button class="p-btn" type="submit">Save ✓</button>
    </form>`);
  const f = document.getElementById('newClient');
  f.onsubmit = async e => {
    e.preventDefault();
    const phone = f.phone.value.trim() ? normPhone(f.phone.value) : null;
    if (f.phone.value.trim() && !phone) return ctx.toast('That phone number looks off');
    const name = f.name.value.trim();
    try { await ctx.A().saveClient({ key: keyOf(name, phone), name, phone, notes: f.notes.value.trim() || null, birthday: f.birthday.value || null });
      ctx.closeSheet(); ctx.toast('Client added 💖'); ctx.render(); } catch (er) { ctx.fail(er); }
  };
}

async function clientCard(ctx, c) {
  const { esc } = ctx;
  const [hist, photos] = await Promise.all([ctx.A().clientHistory(c), ctx.A().clientPhotos(c.key).catch(() => [])]);
  const urls = await ctx.A().photoUrls(photos.map(p => p.photo_path)).catch(() => ({}));
  const past = hist.filter(a => a.status === 'done' || (a.status === 'booked' && new Date(a.ends_at) < new Date()));
  const next = hist.filter(a => a.status === 'booked' && new Date(a.starts_at) > new Date()).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))[0];
  const what = a => a.service_name + (a.addons?.length ? ' + ' + a.addons.join(' + ') : '');
  ctx.openSheet(`
    <header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button>
      <h2>${esc(c.name)}</h2><p class="p-sub">${c.phone ? esc(prettyPhone(c.phone)) : 'No number yet'}${c.visits ? ` · ${c.visits} ${+c.visits === 1 ? 'visit' : 'visits'}` : ''}</p></header>
    <div class="c-acts">
      ${c.phone ? `<a class="c-act" href="tel:${esc(c.phone)}">☏<span>Call</span></a><a class="c-act" href="${smsLink(c.phone)}">✉<span>Text</span></a>` : ''}
      <button class="c-act c-book" id="again">＋<span>Book again</span></button>
    </div>
    ${next ? `<p class="c-next">📅 Next visit: <b>${esc(relDay(ymd(new Date(next.starts_at))))} at ${fmtTime(new Date(next.starts_at))}</b> · ${esc(what(next))}</p>` : ''}
    <form class="p-form" id="cForm">
      <label>Notes<textarea name="notes" rows="4" maxlength="4000" placeholder="Favorite colors, shape and length, sensitive skin, likes to chat or likes quiet…">${esc(c.notes || '')}</textarea></label>
      <label>Birthday <small>(optional)</small><input name="birthday" type="date" value="${esc(c.birthday || '')}"></label>
      <button class="p-btn" type="submit">Save notes ✓</button>
    </form>
    <h3 class="b-h3">Nail photos</h3>
    <div class="c-photos">${photos.filter(p => urls[p.photo_path]).map(p => `<button class="c-ph" data-ph="${p.id}"><img src="${urls[p.photo_path]}" alt=""><span>${fmtDate(p.taken_on)}</span></button>`).join('')}
      <button class="c-ph c-ph-add" id="addPh"><i>📸</i><span>Add a photo</span></button></div>
    <h3 class="b-h3">Visits</h3>
    ${past.length ? `<ul class="b-hist">${past.slice(0, 60).map(a => `<li><span>${fmtDate(ymd(new Date(a.starts_at)))}</span>${esc(what(a))}${a.paid != null ? ` · $${(+a.paid).toFixed(0)}` : ''}</li>`).join('')}</ul>` : '<p class="p-hint">No visits yet.</p>'}
    ${c.phone ? '' : `<p class="p-hint">Add a mobile number on their next appointment and their history will follow them.</p>`}`);
  const f = document.getElementById('cForm');
  f.onsubmit = async e => {
    e.preventDefault();
    try { await ctx.A().saveClient({ key: c.key, name: c.name, phone: c.phone, notes: f.notes.value.trim() || null, birthday: f.birthday.value || null });
      c.notes = f.notes.value.trim() || null; c.birthday = f.birthday.value || null; ctx.toast('Saved ✓'); ctx.render(); } catch (er) { ctx.fail(er); }
  };
  document.getElementById('again').onclick = () => {
    const last = past[0] || hist[0];
    ctx.closeSheet();
    setTimeout(() => ctx.newAppt({ client_name: c.name, client_phone: c.phone, service_id: last?.service_id ?? null, service_name: last?.service_name, addons: last?.addons || [] }), 280);
  };
  document.getElementById('addPh').onclick = async () => {
    const file = await pickPhoto(); if (!file) return;
    ctx.toast('Saving the photo…');
    try {
      if (!c.notes && !c.birthday) await ctx.A().saveClient({ key: c.key, name: c.name, phone: c.phone });   // make sure the client exists
      await ctx.A().addClientPhoto(c.key, await shrink(file)); ctx.toast('Photo saved 📸'); clientCard(ctx, c);
    } catch (er) { ctx.fail(er); }
  };
  document.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => {
    const ph = photos.find(p => p.id === +b.dataset.ph);
    ctx.openSheet(`<header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button><h2>${esc(c.name)}</h2><p class="p-sub">${fmtDate(ph.taken_on)}</p></header>
      <img class="b-photo" src="${urls[ph.photo_path]}" alt=""><button class="p-btn p-btn-soft" id="back">← Back to ${esc(c.name.split(' ')[0])}</button><button class="p-link" id="delPh">Delete this photo</button>`);
    document.getElementById('back').onclick = () => clientCard(ctx, c);
    document.getElementById('delPh').onclick = async () => { if (!confirm('Delete this photo?')) return; try { await ctx.A().deleteClientPhoto(ph); clientCard(ctx, c); } catch (er) { ctx.fail(er); } };
  });
}
