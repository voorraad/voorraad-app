import { SEARCH_SYNONYMS, CATEGORY_EMOJI, DEFAULT_CATS, EENHEDEN, MENU_LOCATION_ID } from './constants.js';

// ---------- Datums ----------
// Firestore geeft Timestamp-objecten terug; oudere data bevat soms strings. Alles naar Date.
export const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [y, m, d] = v.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
};

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Lokale datum als 'YYYY-MM-DD' (NIET via toISOString: dat geeft UTC en is na middernacht een dag te vroeg).
export const dateKey = (d = new Date()) => {
    const x = toDate(d) || new Date();
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const todayKey = () => dateKey(new Date());
export const addDays = (d, n) => { const x = new Date(toDate(d) || new Date()); x.setDate(x.getDate() + n); return x; };
export const parseDateKey = (s) => (s ? toDate(s) : null);

export const daysSince = (v) => {
    const d = toDate(v);
    if (!d) return 0;
    return Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY);
};
export const daysUntil = (v) => {
    const d = toDate(v);
    if (!d) return null;
    return Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
};

export const formatDate = (v) => {
    const d = toDate(v);
    return d ? d.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
};
export const formatShortDate = (v) => {
    const d = toDate(v);
    return d ? d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }) : '–';
};
export const formatDateTime = (v) => {
    const d = toDate(v);
    return d ? d.toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
};
export const formatAge = (days) => {
    if (days < 1) return 'vandaag';
    if (days === 1) return '1 dag';
    if (days < 31) return `${days} dagen`;
    const m = Math.floor(days / 30.4);
    if (m < 12) return `${m} ${m === 1 ? 'maand' : 'maanden'}`;
    const y = Math.floor(m / 12), rest = m % 12;
    return `${y} jaar${rest ? ` ${rest} mnd` : ''}`;
};
export const weekdayLabel = (d, opts = { weekday: 'long' }) => {
    const s = toDate(d).toLocaleDateString('nl-BE', opts);
    return s.charAt(0).toUpperCase() + s.slice(1);
};
export const mondayOf = (d = new Date(), weekOffset = 0) => {
    const x = startOfDay(d);
    const day = x.getDay() || 7;
    x.setDate(x.getDate() - day + 1 + weekOffset * 7);
    return x;
};

// ---------- Getallen ----------
export const num = (v, fallback = 0) => { const n = parseFloat(v); return isNaN(n) ? fallback : n; };
export const round2 = (n) => Math.round(n * 100) / 100;
export const formatAantal = (aantal) => {
    const n = parseFloat(aantal);
    if (isNaN(n)) return aantal ?? '';
    const whole = Math.floor(n), frac = round2(n - whole);
    const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : null;
    if (fracStr) return whole ? `${whole}${fracStr}` : fracStr;
    return String(round2(n)).replace('.', ',');
};
export const euro = (n) => `€ ${num(n).toFixed(2).replace('.', ',')}`;
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- Zoeken ----------
export const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const levenshtein = (a, b) => {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
            cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
        }
        prev = cur;
    }
    return prev[n];
};

// Slim zoeken: substring, Belgisch-Nederlandse synoniemen en kleine tikfouten.
export const smartMatch = (name, query) => {
    const q = normalize(query);
    if (!q) return true;
    const n = normalize(name);
    if (n.includes(q)) return true;
    if ((SEARCH_SYNONYMS[q] || []).some(s => n.includes(s))) return true;
    if (q.length < 3) return false;
    const maxDist = q.length <= 4 ? 1 : 2;
    return n.split(/\s+/).some(w => Math.abs(w.length - q.length) <= maxDist && levenshtein(w, q) <= maxDist);
};

// Of een voorraadproduct overeenkomt met een recept-ingrediënt (bv. "kipfilet" ~ "kip").
export const ingredientMatches = (itemName, ingName) => {
    const a = normalize(itemName), b = normalize(ingName);
    if (!a || !b) return false;
    if (a.includes(b) || b.includes(a)) return true;
    return smartMatch(itemName, ingName) || smartMatch(ingName, itemName);
};

// ---------- Producten ----------
export const isMenuEntry = (item) => item && item.vriezerId === MENU_LOCATION_ID;
export const emojiFor = (item) => item.emoji || CATEGORY_EMOJI[item.categorie] || '📦';
export const emojiForCategory = (cat) => CATEGORY_EMOJI[cat] || '📦';

// Herkent een paar veelvoorkomende producten om categorie/emoji/houdbaarheid voor te stellen.
const GUESSES = [
    { re: /gehakt|kip|vlees|steak|worst|spek|hamburger|filet/, cat: 'Vlees', emoji: '🥩', days: 4 },
    { re: /melk|yoghurt|room|pudding/, cat: 'Zuivel', emoji: '🥛', days: 7 },
    { re: /kaas|mozzarella|parmezaan/, cat: 'Kaas', emoji: '🧀', days: 14 },
    { re: /brood|pistolet|baguette|croissant/, cat: 'Brood', emoji: '🍞', days: 4 },
    { re: /pizza/, cat: 'Pizza', emoji: '🍕', days: 5 },
    { re: /vis|zalm|scampi|garnaal|kabeljauw|tonijn/, cat: 'Vis', emoji: '🐟', days: 2 },
    { re: /friet|kroket/, cat: 'Friet', emoji: '🍟', days: 365 },
    { re: /soep/, cat: 'Soep', emoji: '🍲', days: 4 },
    { re: /pasta|spaghetti|penne|macaroni|lasagne/, cat: 'Pasta', emoji: '🍝', days: 365 },
    { re: /rijst/, cat: 'Rijst', emoji: '🍚', days: 365 },
    { re: /ijs\b|ijsje/, cat: 'IJs', emoji: '🍦', days: 180 },
    { re: /appel|peer|banaan|aardbei|druif|sinaas|citroen/, cat: 'Fruit', emoji: '🍎', days: 7 },
    { re: /sla|tomaat|wortel|paprika|courgette|broccoli|spinazie|prei|ajuin|ui\b|groente/, cat: 'Groenten', emoji: '🥦', days: 5 }
];
export const guessProduct = (name) => {
    const n = normalize(name);
    if (!n) return null;
    return GUESSES.find(g => g.re.test(n)) || null;
};

// Status van een product: hoe dringend moet het op?
// level: 'expired' | 'soon' (≤3d) | 'week' (≤7d) | 'month' (≤30d) | 'old' (vriezer >90d) | 'veryold' (>180d) | 'ok'
export const itemStatus = (item, type) => {
    if (item.altijdGoed) return { level: 'ok', days: null, kind: 'none' };
    const tht = daysUntil(item.houdbaarheidsDatum);
    if (tht !== null) {
        if (tht < 0) return { level: 'expired', days: tht, kind: 'tht' };
        if (tht <= 3) return { level: 'soon', days: tht, kind: 'tht' };
        if (tht <= 7) return { level: 'week', days: tht, kind: 'tht' };
        if (tht <= 30 && type !== 'vriezer') return { level: 'month', days: tht, kind: 'tht' };
    }
    if (type === 'vriezer') {
        const age = daysSince(item.ingevrorenOp);
        if (age > 180) return { level: 'veryold', days: age, kind: 'age' };
        if (age > 90) return { level: 'old', days: age, kind: 'age' };
    }
    return { level: 'ok', days: tht, kind: tht !== null ? 'tht' : 'none' };
};
export const URGENCY = { expired: 0, veryold: 1, soon: 2, week: 3, old: 4, month: 5, ok: 9 };

export const statusText = (st) => {
    if (st.kind === 'tht') {
        if (st.days < -1) return `${-st.days} dagen over datum`;
        if (st.days === -1) return 'gisteren vervallen';
        if (st.days === 0) return 'vervalt vandaag';
        if (st.days === 1) return 'vervalt morgen';
        return `nog ${st.days} dagen`;
    }
    if (st.kind === 'age') return `${formatAge(st.days)} ingevroren`;
    return '';
};
export const STATUS_TONE = {
    expired: 'text-red-600 dark:text-red-400', veryold: 'text-red-600 dark:text-red-400',
    soon: 'text-orange-600 dark:text-orange-400', week: 'text-amber-600 dark:text-amber-400',
    old: 'text-amber-600 dark:text-amber-400', month: 'text-stone-500 dark:text-stone-400', ok: 'text-stone-500 dark:text-stone-400'
};
export const STATUS_BAR = {
    expired: 'bg-red-500', veryold: 'bg-red-500', soon: 'bg-orange-500', week: 'bg-amber-400', old: 'bg-amber-400',
    month: 'bg-yellow-300 dark:bg-yellow-600', ok: 'bg-emerald-400 dark:bg-emerald-600'
};

// ---------- Categorieën & eenheden ----------
export const categoriesFor = (customCategories, type) => {
    const defaults = DEFAULT_CATS[type] || DEFAULT_CATS.vriezer;
    const custom = (customCategories || []).map(c => (typeof c === 'string' ? { name: c, color: 'gray' } : c));
    if (!custom.length) return defaults;
    return [...custom, ...defaults.filter(d => !custom.some(c => c.name === d.name))];
};
export const unitsFor = (customUnits, type) => {
    const defaults = EENHEDEN[type] || EENHEDEN.vriezer;
    const custom = customUnits || [];
    return custom.length ? [...new Set([...custom, ...defaults])] : defaults;
};

export const sortLocaties = (arr) => [...arr].sort((a, b) => {
    const oa = a.order ?? 999, ob = b.order ?? 999;
    return oa !== ob ? oa - ob : (a.naam || '').localeCompare(b.naam || '');
});
export const byName = (a, b) => (a.naam || '').localeCompare(b.naam || '', 'nl');

export const randomToken = () => {
    const bytes = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
};

export const downloadBlob = (content, filename, type) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = resolve; s.onerror = () => reject(new Error('Kon ' + src + ' niet laden'));
    document.head.appendChild(s);
});

export const cx = (...a) => a.filter(Boolean).join(' ');
