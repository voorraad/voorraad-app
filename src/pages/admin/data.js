import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase.js';
import { isMenuEntry, itemStatus, URGENCY, num } from '../../lib/utils.js';

// Alle gegevens per gebruiker, opgehaald met per-gebruiker-queries (werkt met de bestaande regels).
// Wordt 2 minuten bewaard, zodat wisselen tussen tabbladen niet alles opnieuw laadt.
let cache = { key: '', at: 0, stats: {} };
const listeners = new Set();
let running = null;

async function loadAll(usersList, key) {
    for (const u of usersList) {
        let entry;
        try {
            const q = (c) => db.collection(c).where('userId', '==', u.id).get().then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))).catch(() => []);
            const [vriezers, all, lades, shopping, recepten] = await Promise.all([q('vriezers'), q('items'), q('lades'), q('shoppingList'), q('recepten')]);
            const locs = Object.fromEntries(vriezers.map(v => [v.id, v]));
            const items = all.filter(x => !isMenuEntry(x));
            const urgent = [];
            items.forEach(x => {
                const t = (locs[x.vriezerId] || {}).type || 'vriezer';
                const st = itemStatus(x, t);
                if (['expired', 'veryold', 'soon'].includes(st.level)) urgent.push({ item: x, st, loc: (locs[x.vriezerId] || {}).naam || '?' });
            });
            urgent.sort((a, b) => URGENCY[a.st.level] - URGENCY[b.st.level]);
            entry = {
                items: items.length, locs: vriezers.length, expired: urgent.filter(x => x.st.level !== 'soon').length, urgent,
                list: items, locById: locs, vriezers, lades, shopping, recepten, menu: all.filter(isMenuEntry),
                value: items.reduce((a, i) => a + num(i.prijs), 0), priced: items.filter(i => num(i.prijs) > 0).length,
                opslag: storageOf({ vriezers, items: all, lades, shopping, recepten })
            };
        } catch (e) { entry = { error: true }; }
        if (cache.key !== key) return;
        cache.stats = { ...cache.stats, [u.id]: entry };
        listeners.forEach(l => l(cache.stats));
    }
}

// Geschatte opslag (bytes) per soort gegevens + foto's die rechtstreeks in de documenten zitten
function storageOf(colls) {
    const size = (o) => { try { return new Blob([JSON.stringify(o)]).size; } catch (e) { return JSON.stringify(o).length; } };
    const out = { docs: 0, bytes: 0, fotos: 0, fotoBytes: 0, per: {} };
    Object.entries(colls).forEach(([k, list]) => {
        const b = list.reduce((a, d) => a + size(d), 0);
        out.per[k] = { n: list.length, bytes: b };
        out.docs += list.length; out.bytes += b;
        list.forEach(d => { if (typeof d.foto === 'string' && d.foto.startsWith('data:')) { out.fotos++; out.fotoBytes += d.foto.length; } });
    });
    return out;
}

export function useAllUserData(usersList) {
    const key = usersList.map(u => u.id).join(',');
    const [stats, setStats] = useState(cache.key === key ? cache.stats : {});
    useEffect(() => {
        listeners.add(setStats);
        if (cache.key !== key || Date.now() - cache.at > 120000) {
            cache = { key, at: Date.now(), stats: cache.key === key ? cache.stats : {} };
            setStats(cache.stats);
            running = loadAll(usersList, key);
        } else setStats(cache.stats);
        return () => listeners.delete(setStats);
    }, [key]);
    return stats;
}
export const refreshAllUserData = () => { cache.at = 0; };
