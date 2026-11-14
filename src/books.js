// Sang's bookkeeping, kept very simple: Taxes (receipts, notes, one printout for her tax guy) and
// Supplies (what she has, "used one" / "bought more", and when to buy again).
import { ymd, at, addDays, fmtDate } from './lib/time.js';

const money = n => '$' + (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const price = t => { const m = String(t || '').match(/\d+(\.\d+)?/); return m ? +m[0] : 0; };   // "$65+" → 65, "+$5" → 5
const yearRange = y => [`${y}-01-01`, `${y + 1}-01-01`];
const KINDS = [['Polish', '💅'], ['Gel', '✨'], ['Dip powder', '🫙'], ['Lotion', '🧴'], ['Tools', '✂️'], ['Other', '📦']];
const kindIcon = k => (KINDS.find(x => x[0] === k) || KINDS[5])[1];
const DAY = 86400e3;

// shrink a phone photo before uploading (keeps the free storage roomy, still sharp enough to read)
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', 0.82));
  } catch { return file; }
}
const pickPhoto = () => new Promise(res => {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = () => res(i.files[0] || null); i.click();
});

// income for one visit: what she wrote down, else the menu price (+ add-ons)
function visitIncome(a, services) {
  if (a.paid != null) return { amt: +a.paid, est: false };
  const svc = services.find(s => s.id === a.service_id) || services.find(s => s.name === a.service_name);
  let amt = price(svc?.price);
  (a.addons || []).forEach(n => { amt += price(services.find(s => s.name === n)?.price); });
  return { amt, est: true };
}
const counted = a => a.status === 'done' || (a.status === 'booked' && new Date(a.ends_at) < new Date());

async function yearData(ctx, y) {
  const [d0, d1] = yearRange(y);
  const [appts, receipts, log, supplies] = await Promise.all([
    ctx.A().appointments(at(d0), at(d1)), ctx.A().receipts(d0, d1), ctx.A().supplyLog(at(d0), at(d1)), ctx.A().supplies()
  ]);
  const visits = appts.filter(counted).map(a => ({ ...a, ...visitIncome(a, ctx.services()) }));
  const bought = log.filter(e => e.kind === 'bought');
  return {
    y, visits, receipts, bought, supplies,
    income: visits.reduce((s, v) => s + v.amt, 0),
    estimated: visits.filter(v => v.est).length,
    clients: new Set(visits.map(v => v.client_phone || v.client_name.toLowerCase())).size,
    receiptTotal: receipts.filter(r => r.kind === 'receipt').reduce((s, r) => s + (+r.amount || 0), 0),
    suppliesTotal: bought.reduce((s, e) => s + (+e.cost || 0), 0)
  };
}

// ============================================================ TAXES
export async function renderTaxes(m, ctx) {
  const { esc } = ctx, y = new Date().getFullYear();
  const d = await yearData(ctx, y);
  const recent = d.receipts.slice(0, 30);
  const urls = await ctx.A().photoUrls(recent.filter(r => r.photo_path).map(r => r.photo_path)).catch(() => ({}));
  m.innerHTML = `
    <header class="p-hello"><p class="p-kicker">Taxes</p><h1><span class="script">Keep it</span> all here</h1>
      <p class="p-sub">Snap your receipts as you go. At tax time, print one page for your tax guy.</p></header>
    <div class="b-bigs">
      <button class="b-big" id="addReceipt"><span>📸</span>Add a receipt</button>
      <button class="b-big" id="addNote"><span>✏️</span>Write a note</button>
      <button class="b-big b-print" id="print"><span>🖨️</span>Print for my tax guy</button>
    </div>
    <h2 class="p-h2">${y} so far</h2>
    <div class="b-tiles">
      <div class="b-tile"><b>${d.visits.length}</b>visits</div>
      <div class="b-tile"><b>${d.clients}</b>clients</div>
      <div class="b-tile"><b>${money(d.income)}</b>earned${d.estimated ? '*' : ''}</div>
      <div class="b-tile"><b>${money(d.receiptTotal + d.suppliesTotal)}</b>spent</div>
    </div>
    ${d.estimated ? `<p class="p-hint">* ${d.estimated} ${d.estimated === 1 ? 'visit uses' : 'visits use'} the menu price. To be exact, open an appointment and fill in <b>Paid</b>.</p>` : ''}
    <h2 class="p-h2">Receipts &amp; notes</h2>
    ${recent.length ? `<section class="b-list">${recent.map(r => `
      <button class="b-rec" data-rec="${r.id}">
        ${r.photo_path && urls[r.photo_path] ? `<img src="${urls[r.photo_path]}" alt="">` : `<i>${r.kind === 'note' ? '✏️' : '🧾'}</i>`}
        <span><b>${r.amount != null ? money(r.amount) : r.kind === 'note' ? 'Note' : 'Receipt'}</b>${esc(r.note || '')}<em>${fmtDate(r.day)}</em></span>
      </button>`).join('')}</section>`
      : '<p class="p-hint">Nothing yet. Tap <b>Add a receipt</b> and take a picture of it 📸</p>'}`;
  m.querySelector('#addReceipt').onclick = () => addReceipt(ctx);
  m.querySelector('#addNote').onclick = () => editRec(ctx, { kind: 'note', day: ymd() });
  m.querySelector('#print').onclick = () => printChoice(ctx);
  m.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => editRec(ctx, recent.find(r => r.id === +b.dataset.rec), urls));
}

async function addReceipt(ctx) {
  const file = await pickPhoto(); if (!file) return;
  const blob = await shrink(file);
  editRec(ctx, { kind: 'receipt', day: ymd() }, {}, blob);
}

function editRec(ctx, r, urls = {}, blob = null) {
  const { esc } = ctx, isNote = r.kind === 'note';
  const preview = blob ? URL.createObjectURL(blob) : r.photo_path ? urls[r.photo_path] : null;
  ctx.openSheet(`
    <header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button>
      <h2>${r.id ? (isNote ? 'Note' : 'Receipt') : isNote ? '<span class="script">A</span> note' : '<span class="script">New</span> receipt'}</h2></header>
    <form class="p-form" id="recForm">
      ${preview ? `<img class="b-photo" src="${preview}" alt="Receipt photo">` : ''}
      ${isNote ? '' : `<label>How much? <small>(if you know)</small><input name="amount" inputmode="decimal" placeholder="$0.00" value="${r.amount ?? ''}"></label>`}
      <label>${isNote ? 'Your note' : 'What was it for? <small>(optional)</small>'}<textarea name="note" rows="${isNote ? 5 : 2}" maxlength="4000" placeholder="${isNote ? 'Anything your tax guy should know' : 'Polish, files, rent…'}">${esc(r.note || '')}</textarea></label>
      <label>Date<input type="date" name="day" value="${r.day}"></label>
      <button class="p-btn" type="submit">Save ✓</button>
      ${r.id ? '<button class="p-link" type="button" id="del">Delete this</button>' : ''}
    </form>`);
  const f = document.getElementById('recForm');
  f.onsubmit = async e => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = blob ? 'Saving the photo…' : 'Saving…';
    try {
      const amt = f.amount ? parseFloat(f.amount.value.replace(/[^\d.]/g, '')) : NaN;
      const row = { kind: r.kind, day: f.day.value || ymd(), note: f.note.value.trim() || null, amount: Number.isFinite(amt) ? amt : null };
      if (r.id) row.id = r.id;
      if (blob) row.photo_path = await ctx.A().uploadPhoto(blob);
      if (!row.id && !row.photo_path && !row.note && row.amount == null) { btn.disabled = false; btn.textContent = 'Save ✓'; return ctx.toast('Add a note or an amount first'); }
      await ctx.A().saveReceipt(row);
      ctx.closeSheet(); ctx.toast(isNote ? 'Note saved ✓' : 'Receipt saved 🧾'); ctx.render();
    } catch (er) { btn.disabled = false; btn.textContent = 'Save ✓'; ctx.fail(er); }
  };
  const del = document.getElementById('del');
  if (del) del.onclick = async () => {
    if (!confirm('Delete this for good?')) return;
    try { await ctx.A().deleteReceipt(r); ctx.closeSheet(); ctx.toast('Deleted'); ctx.render(); } catch (er) { ctx.fail(er); }
  };
}

function printChoice(ctx) {
  const y = new Date().getFullYear();
  ctx.openSheet(`
    <header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button><h2><span class="script">Which</span> year?</h2></header>
    <div class="b-bigs">
      <button class="b-big" data-y="${y - 1}"><span>📒</span>${y - 1}</button>
      <button class="b-big" data-y="${y}"><span>📗</span>${y} so far</button>
    </div>`);
  document.querySelectorAll('[data-y]').forEach(b => b.onclick = () => { ctx.closeSheet(); report(ctx, +b.dataset.y); });
}

// the printout: one clean document, with every receipt photo, ready for "Print" or "Save as PDF"
async function report(ctx, y) {
  const { esc } = ctx;
  ctx.toast('Getting everything ready…');
  const d = await yearData(ctx, y);
  const urls = await ctx.A().photoUrls(d.receipts.filter(r => r.photo_path).map(r => r.photo_path)).catch(() => ({}));
  const supName = id => d.supplies.find(s => s.id === id)?.name || 'Supply';
  const months = Array.from({ length: 12 }, (_, i) => {
    const vs = d.visits.filter(v => new Date(v.starts_at).getMonth() === i);
    return { m: new Date(y, i, 1).toLocaleString('en-US', { month: 'long' }), n: vs.length, amt: vs.reduce((s, v) => s + v.amt, 0) };
  });
  const recs = d.receipts.filter(r => r.kind === 'receipt').sort((a, b) => a.day.localeCompare(b.day));
  const notes = d.receipts.filter(r => r.kind === 'note').sort((a, b) => a.day.localeCompare(b.day));
  const el = document.createElement('div'); el.className = 'b-report'; el.id = 'report';
  el.innerHTML = `
    <div class="b-rbar"><button class="p-btn p-btn-soft" id="rBack">← Back</button><button class="p-btn" id="rPrint">🖨️ Print or save as PDF</button>
      <button class="p-link" id="rCsv">Download a spreadsheet too</button></div>
    <article class="b-doc">
      <header><p class="p-kicker">Salon Sang Nail Studio · Sang Whitewolf</p><h1>${y} tax summary</h1>
        <p>Sola Salon Studios, Suite 12 · 440 W 6th Ave, Eugene, OR · printed ${fmtDate(ymd())}</p></header>
      <section class="b-sum">
        <div><b>${d.visits.length}</b>client visits</div><div><b>${d.clients}</b>different clients</div>
        <div><b>${money(d.income)}</b>income${d.estimated ? '*' : ''}</div>
        <div><b>${money(d.receiptTotal)}</b>receipts (${recs.length})</div><div><b>${money(d.suppliesTotal)}</b>supplies bought</div>
      </section>
      ${d.estimated ? `<p class="b-small">* ${d.estimated} of ${d.visits.length} visits have no amount written down and use the menu price instead (tips not included). Card/cash records are the final word.</p>` : '<p class="b-small">Income is what was written down for each visit.</p>'}
      <p class="b-small">Supply purchases are tracked in the portal; some may also appear as photographed receipts below, so please don't count both.</p>
      <h2>Income by month</h2>
      <table><thead><tr><th>Month</th><th>Visits</th><th>Income</th></tr></thead><tbody>
        ${months.map(x => `<tr><td>${x.m}</td><td>${x.n}</td><td>${money(x.amt)}</td></tr>`).join('')}
        <tr class="tot"><td>Total</td><td>${d.visits.length}</td><td>${money(d.income)}</td></tr></tbody></table>
      <h2>Supplies bought</h2>
      ${d.bought.length ? `<table><thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Cost</th></tr></thead><tbody>
        ${d.bought.map(e => `<tr><td>${fmtDate(ymd(new Date(e.at)))}</td><td>${esc(supName(e.supply_id))}</td><td>${e.qty}</td><td>${e.cost != null ? money(e.cost) : '—'}</td></tr>`).join('')}
        <tr class="tot"><td colspan="3">Total</td><td>${money(d.suppliesTotal)}</td></tr></tbody></table>` : '<p class="b-small">None recorded.</p>'}
      <h2>Notes</h2>
      ${notes.length ? notes.map(n => `<p class="b-n"><b>${fmtDate(n.day)}</b> ${esc(n.note || '')}</p>`).join('') : '<p class="b-small">None.</p>'}
      <h2>Receipts</h2>
      ${recs.length ? `<table><thead><tr><th>Date</th><th>For</th><th>Amount</th></tr></thead><tbody>
        ${recs.map(r => `<tr><td>${fmtDate(r.day)}</td><td>${esc(r.note || '')}</td><td>${r.amount != null ? money(r.amount) : '—'}</td></tr>`).join('')}
        <tr class="tot"><td colspan="2">Total</td><td>${money(d.receiptTotal)}</td></tr></tbody></table>
        <div class="b-photos">${recs.filter(r => urls[r.photo_path]).map(r => `<figure><img src="${urls[r.photo_path]}" alt=""><figcaption>${fmtDate(r.day)}${r.amount != null ? ' · ' + money(r.amount) : ''}${r.note ? ' · ' + esc(r.note) : ''}</figcaption></figure>`).join('')}</div>`
        : '<p class="b-small">None.</p>'}
      <h2 class="b-break">All visits</h2>
      <table class="b-visits"><thead><tr><th>Date</th><th>Client</th><th>Service</th><th>Amount</th></tr></thead><tbody>
        ${d.visits.map(v => `<tr><td>${fmtDate(ymd(new Date(v.starts_at)))}</td><td>${esc(v.client_name)}</td><td>${esc(v.service_name + (v.addons?.length ? ' + ' + v.addons.join(', ') : ''))}</td><td>${money(v.amt)}${v.est ? '*' : ''}</td></tr>`).join('')}</tbody></table>
    </article>`;
  document.body.appendChild(el); document.body.classList.add('b-printing');
  const close = () => { el.remove(); document.body.classList.remove('b-printing'); };
  el.querySelector('#rBack').onclick = close;
  el.querySelector('#rPrint').onclick = async () => {
    await Promise.all([...el.querySelectorAll('img')].map(i => i.decode().catch(() => {})));
    window.print();
  };
  el.querySelector('#rCsv').onclick = () => {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Type', 'Date', 'Who / item', 'Details', 'Amount', 'Note'].map(q).join(',')];
    d.visits.forEach(v => rows.push(['Income', ymd(new Date(v.starts_at)), v.client_name, v.service_name, v.amt.toFixed(2), v.est ? 'menu price' : ''].map(q).join(',')));
    d.bought.forEach(e => rows.push(['Supplies', ymd(new Date(e.at)), supName(e.supply_id), 'qty ' + e.qty, e.cost != null ? (+e.cost).toFixed(2) : '', ''].map(q).join(',')));
    recs.forEach(r => rows.push(['Receipt', r.day, '', r.note || '', r.amount != null ? (+r.amount).toFixed(2) : '', r.photo_path ? 'photo in portal' : ''].map(q).join(',')));
    notes.forEach(n => rows.push(['Note', n.day, '', '', '', n.note || ''].map(q).join(',')));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = `salon-sang-${y}-taxes.csv`; a.click();
  };
  window.scrollTo(0, 0);
}

// ============================================================ SUPPLIES
function forecast(item, log) {
  const used = log.filter(e => e.supply_id === item.id && e.kind === 'used').sort((a, b) => new Date(a.at) - new Date(b.at));
  if (used.length < 2) return null;
  const span = (new Date(used[used.length - 1].at) - new Date(used[0].at)) / DAY;
  const units = used.slice(1).reduce((s, e) => s + e.qty, 0);
  if (span < 1 || !units) return null;
  const daysPer = span / units;
  const every = daysPer < 10 ? `${Math.round(daysPer)} day${Math.round(daysPer) === 1 ? '' : 's'}` : daysPer < 60 ? `${Math.round(daysPer / 7)} weeks` : `${Math.round(daysPer / 30)} months`;
  const buyBy = item.on_hand > 0 ? new Date(new Date(used[used.length - 1].at).getTime() + item.on_hand * daysPer * DAY) : null;
  return { every, buyBy };
}

export async function renderSupplies(m, ctx) {
  const { esc } = ctx, y = new Date().getFullYear();
  const [items, log] = await Promise.all([ctx.A().supplies(), ctx.A().supplyLog(new Date(Date.now() - 400 * DAY), new Date(Date.now() + DAY))]);
  const spent = log.filter(e => e.kind === 'bought' && new Date(e.at).getFullYear() === y).reduce((s, e) => s + (+e.cost || 0), 0);
  const low = items.filter(x => x.on_hand <= x.low_at);
  const row = x => {
    const f = forecast(x, log);
    return `<article class="b-sup${x.on_hand <= x.low_at ? ' low' : ''}">
      <button class="b-sup-name" data-item="${x.id}"><i>${kindIcon(x.kind)}</i><span><b>${esc(x.name)}</b>
        <em>${x.on_hand} left${f?.buyBy && x.on_hand > 0 ? ` · buy more around ${fmtDate(ymd(f.buyBy))}` : x.on_hand <= x.low_at ? ' · time to buy more' : ''}</em></span></button>
      <div class="b-sup-act"><button class="b-used" data-used="${x.id}" ${x.on_hand ? '' : 'disabled'}>Used one</button><button class="b-bought" data-bought="${x.id}">Bought more</button></div>
    </article>`;
  };
  const groups = KINDS.map(([k]) => [k, items.filter(x => x.on_hand > x.low_at && (KINDS.some(z => z[0] === x.kind) ? x.kind : 'Other') === k)]).filter(([, l]) => l.length);
  m.innerHTML = `
    <header class="p-hello"><p class="p-kicker">Supplies</p><h1><span class="script">What</span> you have</h1>
      <p class="p-sub">Tap <b>Used one</b> when something runs out, and <b>Bought more</b> when you restock. I'll learn how fast things go.</p></header>
    <div class="b-bigs"><button class="b-big" id="addSup"><span>➕</span>Add a supply</button></div>
    ${items.length ? `<div class="b-tiles b-tiles-2"><div class="b-tile"><b>${items.length}</b>things tracked</div><div class="b-tile"><b>${money(spent)}</b>spent in ${y}</div></div>` : ''}
    ${low.length ? `<h2 class="p-h2">⚠️ Time to buy</h2><section class="b-list">${low.map(row).join('')}</section>` : ''}
    ${groups.map(([k, l]) => `<h2 class="p-h2">${kindIcon(k)} ${esc(k)}</h2><section class="b-list">${l.map(row).join('')}</section>`).join('')}
    ${items.length ? '' : '<p class="p-hint">Start with the things you buy most: your favorite polishes, dip powders, lotion, acetone… Tap <b>Add a supply</b>.</p>'}`;
  m.querySelector('#addSup').onclick = () => editSupply(ctx, null);
  m.querySelectorAll('[data-item]').forEach(b => b.onclick = () => supplyDetail(ctx, items.find(x => x.id === +b.dataset.item), log));
  m.querySelectorAll('[data-used]').forEach(b => b.onclick = async () => {
    const x = items.find(i => i.id === +b.dataset.used); b.disabled = true;
    try {
      const e = await ctx.A().logSupply(x.id, 'used', 1);
      ctx.toastUndo(`Used one ${x.name}`, async () => { await ctx.A().undoLog(e.id); ctx.render(); });
      ctx.render();
    } catch (er) { b.disabled = false; ctx.fail(er); }
  });
  m.querySelectorAll('[data-bought]').forEach(b => b.onclick = () => boughtMore(ctx, items.find(i => i.id === +b.dataset.bought)));
}

const stepper = (name, v, min = 0) => `<div class="b-step"><button type="button" data-step="-1" aria-label="Less">−</button><input name="${name}" type="number" inputmode="numeric" min="${min}" max="999" value="${v}"><button type="button" data-step="1" aria-label="More">＋</button></div>`;
function wireSteppers(f, onChange) {
  f.querySelectorAll('.b-step').forEach(s => { const i = s.querySelector('input');
    s.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { i.value = Math.max(+i.min || 0, (+i.value || 0) + +b.dataset.step); onChange && onChange(); });
    i.oninput = () => onChange && onChange(); });
}

function boughtMore(ctx, x) {
  const { esc } = ctx;
  ctx.openSheet(`
    <header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button><h2><span class="script">Bought</span> more</h2><p class="p-sub">${esc(x.name)}</p></header>
    <form class="p-form" id="buyForm">
      <label>How many?${stepper('qty', 1, 1)}</label>
      <label>Paid in total <small>(for your taxes)</small><input name="cost" inputmode="decimal" placeholder="$0.00" value="${x.unit_price != null ? (+x.unit_price).toFixed(2) : ''}"></label>
      <button class="p-btn" type="submit">Save ✓</button>
    </form>`);
  const f = document.getElementById('buyForm');
  wireSteppers(f, () => { if (x.unit_price != null && !f.cost.dataset.touched) f.cost.value = (x.unit_price * (+f.qty.value || 1)).toFixed(2); });
  f.cost.oninput = () => { f.cost.dataset.touched = 1; };
  f.onsubmit = async e => {
    e.preventDefault(); const c = parseFloat(f.cost.value.replace(/[^\d.]/g, ''));
    try { await ctx.A().logSupply(x.id, 'bought', Math.max(1, +f.qty.value || 1), Number.isFinite(c) ? c : null); ctx.closeSheet(); ctx.toast('Restocked 🛍️'); ctx.render(); } catch (er) { ctx.fail(er); }
  };
}

function editSupply(ctx, x) {
  const { esc } = ctx, isNew = !x;
  ctx.openSheet(`
    <header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button><h2>${isNew ? '<span class="script">Add</span> a supply' : 'Edit'}</h2></header>
    <form class="p-form" id="supForm">
      <label>What is it?<input name="name" required maxlength="80" placeholder="OPI Big Apple Red" value="${esc(x?.name || '')}"></label>
      <div class="b-kinds" role="radiogroup" aria-label="Type">${KINDS.map(([k, i]) => `<label><input type="radio" name="kind" value="${k}" ${(x?.kind || 'Polish') === k ? 'checked' : ''}><span>${i} ${k}</span></label>`).join('')}</div>
      ${isNew ? `<label>How many do you have now?${stepper('on_hand', 1)}</label>
      <label>Price for one <small>(optional)</small><input name="unit_price" inputmode="decimal" placeholder="$0.00"></label>` : ''}
      <label>Warn me when I have this many left${stepper('low_at', x?.low_at ?? 1)}</label>
      <button class="p-btn" type="submit">Save ✓</button>
      ${isNew ? '' : '<button class="p-link" type="button" id="rm">Stop tracking this</button>'}
    </form>`);
  const f = document.getElementById('supForm'); wireSteppers(f);
  f.onsubmit = async e => {
    e.preventDefault();
    const row = { name: f.name.value.trim(), kind: f.kind.value, low_at: Math.max(0, +f.low_at.value || 0) };
    if (isNew) { row.on_hand = Math.max(0, +f.on_hand.value || 0); const p = parseFloat((f.unit_price.value || '').replace(/[^\d.]/g, '')); row.unit_price = Number.isFinite(p) ? p : null; }
    else row.id = x.id;
    try { await ctx.A().saveSupply(row); ctx.closeSheet(); ctx.toast(isNew ? 'Added ✓' : 'Saved ✓'); ctx.render(); } catch (er) { ctx.fail(er); }
  };
  const rm = document.getElementById('rm');
  if (rm) rm.onclick = async () => {
    if (!confirm(`Stop tracking ${x.name}? (Its purchases stay in your tax records.)`)) return;
    try { await ctx.A().saveSupply({ id: x.id, active: false }); ctx.closeSheet(); ctx.toast('Removed'); ctx.render(); } catch (er) { ctx.fail(er); }
  };
}

function supplyDetail(ctx, x, log) {
  const { esc } = ctx;
  const f = forecast(x, log);
  const mine = log.filter(e => e.supply_id === x.id).slice().reverse();
  const lastBuy = mine.find(e => e.kind === 'bought');
  ctx.openSheet(`
    <header class="p-sheet-head"><button class="p-x big" data-close aria-label="Close">×</button><h2>${kindIcon(x.kind)} ${esc(x.name)}</h2>
      <p class="p-sub">${x.on_hand} left${x.unit_price != null ? ` · ${money(x.unit_price)} each` : ''}</p></header>
    <div class="b-facts">
      ${f ? `<p>You use about <b>one every ${f.every}</b>.</p>${f.buyBy ? `<p>Buy more around <b>${fmtDate(ymd(f.buyBy))}</b>.</p>` : '<p><b>You\'re out.</b> Time to buy more.</p>'}`
        : '<p>Tap <b>Used one</b> each time you finish one, and after a couple I\'ll tell you how fast it goes and when to buy more.</p>'}
      ${lastBuy ? `<p>Last bought <b>${fmtDate(ymd(new Date(lastBuy.at)))}</b>${lastBuy.cost != null ? ` for <b>${money(lastBuy.cost)}</b>` : ''}.</p>` : ''}
    </div>
    ${mine.length ? `<h3 class="b-h3">History</h3><ul class="b-hist">${mine.slice(0, 20).map(e => `<li><span>${fmtDate(ymd(new Date(e.at)))}</span>${e.kind === 'bought' ? `Bought ${e.qty}${e.cost != null ? ` · ${money(e.cost)}` : ''}` : `Used ${e.qty}`}</li>`).join('')}</ul>` : ''}
    <button class="p-btn p-btn-soft" id="edit">Edit</button>`);
  document.getElementById('edit').onclick = () => editSupply(ctx, x);
}
