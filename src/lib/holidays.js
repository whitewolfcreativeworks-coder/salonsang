// The big holidays Sang can take off (mirrors private.holiday in backend/salon-sang.sql).
export const HOLIDAYS = [
  ['new_year', "New Year's Day"], ['memorial', 'Memorial Day'], ['july4', 'Fourth of July'], ['labor', 'Labor Day'],
  ['thanksgiving', 'Thanksgiving'], ['black_friday', 'Day after Thanksgiving'], ['christmas_eve', 'Christmas Eve'],
  ['christmas', 'Christmas Day'], ['nye', "New Year's Eve"]
];
export const DEFAULT_HOLIDAYS = ['new_year', 'memorial', 'july4', 'labor', 'thanksgiving', 'christmas'];
// 'YYYY-MM-DD' → holiday name if it's one she ticked, else null
export function holidayName(d, keys = DEFAULT_HOLIDAYS) {
  if (!keys?.length) return null;
  const [y, m, dd] = d.split('-').map(Number), dt = new Date(Date.UTC(y, m - 1, dd)), dow = dt.getUTCDay();
  const nov1 = new Date(Date.UTC(y, 10, 1)).getUTCDay(), thx = 1 + ((4 - nov1 + 7) % 7) + 21;
  const lastOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const hit = {
    new_year: m === 1 && dd === 1, memorial: m === 5 && dow === 1 && dd + 7 > lastOfMonth, july4: m === 7 && dd === 4,
    labor: m === 9 && dow === 1 && dd <= 7, thanksgiving: m === 11 && dd === thx, black_friday: m === 11 && dd === thx + 1,
    christmas_eve: m === 12 && dd === 24, christmas: m === 12 && dd === 25, nye: m === 12 && dd === 31
  };
  const k = HOLIDAYS.find(([key]) => keys.includes(key) && hit[key]);
  return k ? k[1] : null;
}
