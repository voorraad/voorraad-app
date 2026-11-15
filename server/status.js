// Zelfde regels als in de app (src/lib/utils.js → itemStatus): hoe dringend moet een product op?
const DAY = 86400000;
const toDate = (v) => {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(v);
    return isNaN(d) ? null : d;
};
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysUntil = (v) => { const d = toDate(v); return d ? Math.round((startOfDay(d) - startOfDay(new Date())) / DAY) : null; };
const daysSince = (v) => { const d = toDate(v); return d ? Math.floor((startOfDay(new Date()) - startOfDay(d)) / DAY) : 0; };

export function itemStatus(item, type) {
    if (item.altijdGoed) return { level: 'ok' };
    const tht = daysUntil(item.houdbaarheidsDatum);
    if (tht !== null) {
        if (tht < 0) return { level: 'expired', days: tht, kind: 'tht' };
        if (tht <= 3) return { level: 'soon', days: tht, kind: 'tht' };
    }
    if (type === 'vriezer') {
        const age = daysSince(item.ingevrorenOp);
        if (age > 180) return { level: 'veryold', days: age, kind: 'age' };
    }
    return { level: 'ok' };
}

export function shortText(st) {
    if (st.kind === 'tht') {
        if (st.days < -1) return `${-st.days} d over datum`;
        if (st.days === -1) return 'gisteren vervallen';
        if (st.days === 0) return 'vervalt vandaag';
        if (st.days === 1) return 'vervalt morgen';
        return `nog ${st.days} d`;
    }
    if (st.kind === 'age') return `${Math.round(st.days / 30)} mnd ingevroren`;
    return '';
}
