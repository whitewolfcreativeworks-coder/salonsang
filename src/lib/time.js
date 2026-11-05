// Salon time helpers: everything is shown in the salon's time zone, whatever the visitor's phone says.
import { TZ } from '../config.js';

const parts = (d, opts) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', ...opts })
  .formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));

// 'YYYY-MM-DD' of a Date in salon time
export function ymd(d = new Date()) {
  const p = parts(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}
// 'HH:MM' (24h) of a Date in salon time
export function hm(d) {
  const p = parts(d, { hour: '2-digit', minute: '2-digit' });
  return `${p.hour}:${p.minute}`;
}
// salon-local date + time → Date (handles daylight saving)
export function at(dateStr, timeStr = '00:00') {
  const [y, m, d] = dateStr.split('-').map(Number), [H, M] = timeStr.split(':').map(Number);
  let t = Date.UTC(y, m - 1, d, H, M);
  for (let i = 0; i < 2; i++) {                   // shift by the zone offset at that instant (twice settles DST edges)
    const p = parts(new Date(t), { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    t += Date.UTC(y, m - 1, d, H, M) - asUTC;
  }
  return new Date(t);
}
export const addDays = (dateStr, n) => { const d = new Date(dateStr + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekday = dateStr => new Date(dateStr + 'T12:00:00Z').getUTCDay();   // 0 = Sunday

export const fmtTime = d => new Date(d).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).replace(':00 ', ' ');
export const fmtDay = d => new Date(d).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long', month: 'short', day: 'numeric' });
export const fmtDayShort = d => new Date(d).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
export function fmtDate(dateStr, opts = { weekday: 'long', month: 'short', day: 'numeric' }) {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
}
export function relDay(dateStr) {
  const t = ymd();
  if (dateStr === t) return 'Today';
  if (dateStr === addDays(t, 1)) return 'Tomorrow';
  return fmtDate(dateStr);
}
export const minutes = m => m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`;

export function prettyPhone(p) {
  const d = String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (p || '');
}
export function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  return d.length === 10 && !/^[01]/.test(d) ? '+1' + d : null;
}
// sms: link that opens Messages with the text filled in (iPhone uses &body=, Android ?body=)
export function smsLink(phone, body) {
  const ios = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
  return `sms:${phone}${body ? (ios ? '&' : '?') + 'body=' + encodeURIComponent(body) : ''}`;
}
