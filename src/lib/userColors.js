// Kleur per gebruiker. De beheerder kan zelf een kleur kiezen (users.adminKleur);
// anders krijgt elke gebruiker automatisch een vaste kleur op volgorde van id.
export const USER_TONES = {
    sky: { bar: 'border-l-sky-500', pill: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200', dot: 'bg-sky-500' },
    fuchsia: { bar: 'border-l-fuchsia-500', pill: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200', dot: 'bg-fuchsia-500' },
    amber: { bar: 'border-l-amber-500', pill: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', dot: 'bg-amber-500' },
    emerald: { bar: 'border-l-emerald-500', pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200', dot: 'bg-emerald-500' },
    violet: { bar: 'border-l-violet-500', pill: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200', dot: 'bg-violet-500' },
    rose: { bar: 'border-l-rose-500', pill: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200', dot: 'bg-rose-500' },
    lime: { bar: 'border-l-lime-500', pill: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200', dot: 'bg-lime-500' },
    orange: { bar: 'border-l-orange-500', pill: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200', dot: 'bg-orange-500' },
    cyan: { bar: 'border-l-cyan-500', pill: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200', dot: 'bg-cyan-500' },
    indigo: { bar: 'border-l-indigo-500', pill: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200', dot: 'bg-indigo-500' },
};
export const USER_TONE_DOTS = Object.fromEntries(Object.entries(USER_TONES).map(([k, t]) => [k, t.dot]));
export const USER_TONE_NAMES = {"sky": "Lichtblauw", "fuchsia": "Fuchsia", "amber": "Amber", "emerald": "Groen", "violet": "Paars", "rose": "Roze", "lime": "Limoen", "orange": "Oranje", "cyan": "Cyaan", "indigo": "Indigo"};
const KEYS = Object.keys(USER_TONES);

export const userToneKey = (id, usersList = []) => {
    const u = usersList.find(x => x.id === id);
    if (u && USER_TONES[u.adminKleur]) return u.adminKleur;
    const i = usersList.map(x => x.id).sort().indexOf(id);
    if (i >= 0) return KEYS[i % KEYS.length];
    let h = 0; for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return KEYS[h % KEYS.length];
};
export const userTone = (id, usersList) => USER_TONES[userToneKey(id, usersList)];
