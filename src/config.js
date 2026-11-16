// Fill these in once the free Supabase project exists (Project Settings → API).
// Both values are public by design: the database only allows what salon-sang.sql permits.
export const SUPABASE_URL = 'https://elrtyeusiqvkmafrswjc.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_e0ye3YWe2HAiTmwIvU4W6A_dQIpUmHI';

export const TZ = 'America/Los_Angeles';
export const SALON_PHONE = '5306484977';
export const configured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
// ?demo shows the booking flow and the portal with pretend data (nothing is saved or sent)
export const demoMode = () => /[?&]demo\b/.test(location.search);
