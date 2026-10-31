import { db, runBatched } from './firebase.js';
import { APP_VERSION, TYPE_BY_ID } from './constants.js';
import { formatDate, downloadBlob, todayKey, loadScript, num, formatAantal } from './utils.js';

const csvCell = (v) => {
    if (v == null) return '';
    if (typeof v === 'number') return String(v).replace('.', ','); // Belgische Excel: komma als decimaalteken
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV met puntkomma als scheidingsteken: opent correct in Excel met Belgische/Nederlandse instellingen.
export function exportCSV(items, locById, ladeById) {
    const head = ['Naam', 'Aantal', 'Eenheid', 'Categorie', 'Type', 'Locatie', 'Lade', 'Ingevoerd op', 'Houdbaar tot', 'Min. voorraad', 'Prijs', 'Notitie'];
    const rows = items.map(i => {
        const loc = locById[i.vriezerId];
        const lade = ladeById[i.ladeId];
        return [i.naam, num(i.aantal), i.eenheid, i.categorie, loc ? TYPE_BY_ID[loc.type || 'vriezer'].label : '', loc ? loc.naam : '',
            lade ? lade.naam : (i.ladeNaam || ''), formatDate(i.ingevrorenOp), i.houdbaarheidsDatum ? formatDate(i.houdbaarheidsDatum) : '',
            i.minimumVoorraad ?? '', i.prijs ?? '', i.notitie || ''].map(csvCell).join(';');
    });
    downloadBlob('﻿' + [head.join(';'), ...rows].join('\r\n'), `Voorraad_${todayKey()}.csv`, 'text/csv;charset=utf-8');
}

export async function exportPDF(items, locById, ladeById) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.text('Voorraad', 14, 15);
    doc.setFontSize(9); doc.setTextColor(120); doc.text(`Geëxporteerd op ${formatDate(new Date())}`, 14, 21);
    const sorted = [...items].sort((a, b) => {
        const la = locById[a.vriezerId], lb = locById[b.vriezerId];
        return ((la && la.naam) || '').localeCompare((lb && lb.naam) || '') || (a.naam || '').localeCompare(b.naam || '');
    });
    doc.autoTable({
        head: [['Naam', 'Aantal', 'Categorie', 'Locatie', 'Lade', 'Ingevoerd', 'Houdbaar tot', 'Prijs']],
        body: sorted.map(i => {
            const loc = locById[i.vriezerId], lade = ladeById[i.ladeId];
            return [i.naam || '', `${formatAantal(i.aantal)} ${i.eenheid || ''}`, i.categorie || '', loc ? loc.naam : '', lade ? lade.naam : '',
                formatDate(i.ingevrorenOp), i.houdbaarheidsDatum ? formatDate(i.houdbaarheidsDatum) : '', i.prijs ? `€ ${num(i.prijs).toFixed(2)}` : ''];
        }),
        startY: 26, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [13, 148, 136] }
    });
    doc.save(`Voorraad_${todayKey()}.pdf`);
}

// Back-up van alles van de huidige (beheerde) voorraad als JSON. Zelfde formaat als vroeger.
export async function exportBackup(ownerId) {
    const q = (c) => db.collection(c).where('userId', '==', ownerId).get();
    const [v, l, i, s, r, u] = await Promise.all([q('vriezers'), q('lades'), q('items'), q('shoppingList'), q('recepten'), db.collection('users').doc(ownerId).get()]);
    const withId = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const backup = {
        type: 'voorraad-backup', version: APP_VERSION, createdAt: new Date().toISOString(),
        userSettings: u.exists ? u.data() : {},
        vriezers: withId(v), lades: withId(l), items: withId(i), shoppingList: withId(s), recepten: withId(r)
    };
    downloadBlob(JSON.stringify(backup, null, 2), `Voorraad_Backup_${todayKey()}.json`, 'application/json');
}

// Zet JSON-datums ({seconds, nanoseconds} of ISO-string) terug om naar Date.
const revive = (o) => {
    const out = { ...o };
    ['ingevrorenOp', 'houdbaarheidsDatum', 'laatstGewijzigd', 'laatstGecontroleerd'].forEach(k => {
        const v = out[k];
        if (v && typeof v === 'object' && typeof v.seconds === 'number') out[k] = new Date(v.seconds * 1000);
        else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) out[k] = new Date(v);
    });
    return out;
};

// Herstel: VOEGT de back-up toe aan de huidige voorraad (overschrijft niets).
export async function importBackup(file, ownerId) {
    const data = JSON.parse(await file.text());
    if (data.type !== 'voorraad-backup') throw new Error('Dit is geen geldig back-upbestand.');
    const locMap = {}, ladeMap = {};
    for (const v of data.vriezers || []) {
        const { id, ...rest } = v;
        const ref = await db.collection('vriezers').add({ ...rest, userId: ownerId });
        if (id) locMap[id] = ref.id;
    }
    for (const l of data.lades || []) {
        const { id, ...rest } = l;
        const ref = await db.collection('lades').add(revive({ ...rest, userId: ownerId, vriezerId: locMap[rest.vriezerId] || rest.vriezerId }));
        if (id) ladeMap[id] = ref.id;
    }
    const ops = [];
    (data.items || []).forEach(({ id, ...rest }) => ops.push(b => b.set(db.collection('items').doc(), revive({
        ...rest, userId: ownerId, vriezerId: locMap[rest.vriezerId] || rest.vriezerId, ladeId: ladeMap[rest.ladeId] || rest.ladeId || ''
    }))));
    (data.shoppingList || []).forEach(({ id, ...rest }) => ops.push(b => b.set(db.collection('shoppingList').doc(), { ...rest, userId: ownerId })));
    (data.recepten || []).forEach(({ id, ...rest }) => ops.push(b => b.set(db.collection('recepten').doc(), { ...rest, userId: ownerId })));
    await runBatched(ops);
    return { items: (data.items || []).length, createdAt: data.createdAt };
}
