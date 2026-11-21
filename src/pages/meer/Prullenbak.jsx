import React, { useEffect, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, EmptyState } from '../../components/ui.jsx';
import { cx, toDate, formatDateTime, plural, emojiFor } from '../../lib/utils.js';

const DAGEN = 30;
const SOORT = {
    items: { label: 'Product', icon: 'Box' },
    lades: { label: 'Lade', icon: 'Layers' },
    vriezers: { label: 'Locatie', icon: 'Snowflake' },
    recepten: { label: 'Recept', icon: 'Book' },
    shoppingList: { label: 'Boodschap', icon: 'Cart' }
};
const REDEN = { consumed: 'opgegeten', wasted: 'weggegooid' };

// Verwijderde producten, lades, locaties, recepten en boodschappen: 30 dagen terug te zetten.
export function Prullenbak({ uid }) {
    const { ownerId, actions } = useStore();
    const { confirm } = useUi();
    const owner = uid || ownerId;
    const [list, setList] = useState(null);
    useEffect(() => db.collection('prullenbak').where('userId', '==', owner).onSnapshot(s => {
        const grens = Date.now() - DAGEN * 86400000;
        const all = s.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ouder dan 30 dagen: definitief weg (de server ruimt dit ook elke nacht op)
        all.filter(t => (toDate(t.verwijderdOp) || 0) < grens).forEach(t => db.collection('prullenbak').doc(t.id).delete().catch(() => { }));
        setList(all.filter(t => (toDate(t.verwijderdOp) || 0) >= grens).sort((a, b) => (toDate(b.verwijderdOp) || 0) - (toDate(a.verwijderdOp) || 0)));
    }, () => setList([])), [owner]);
    if (!list) return <div className="h-40 rounded-2xl bg-stone-200/60 dark:bg-stone-800/60 animate-pulse" />;
    const leeg = async () => {
        if (!(await confirm({ title: `${plural(list.length, 'item', 'items')} definitief verwijderen?`, message: 'Dit kan je niet meer terugzetten.', confirmLabel: 'Prullenbak leegmaken', danger: true }))) return;
        await Promise.all(list.map(t => actions.deleteTrash(t)));
        actions.notify('Prullenbak leeggemaakt');
    };
    return (
        <div className="space-y-3 max-w-2xl">
            <p className="text-sm text-stone-500 px-1">Wat je verwijdert, blijft hier {DAGEN} dagen staan. Tik op <b>Terugzetten</b> als het een vergissing was.</p>
            {!list.length ? <Card><EmptyState icon="Trash" title="De prullenbak is leeg" /></Card> : (
                <>
                    <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                        {list.map(t => {
                            const s = SOORT[t.coll] || { label: t.coll, icon: 'Box' };
                            const dagenOver = Math.max(0, DAGEN - Math.floor((Date.now() - (toDate(t.verwijderdOp) || 0)) / 86400000));
                            return (
                                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 text-lg">
                                        {t.coll === 'items' ? emojiFor(t.data || {}) : <Icon name={s.icon} size={17} className="text-stone-500" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-sm truncate">{t.naam || s.label}</p>
                                        <p className="text-xs text-stone-500 truncate">{s.label}{t.reden && REDEN[t.reden] ? ' · ' + REDEN[t.reden] : ''} · {formatDateTime(t.verwijderdOp)}{t.doorNaam ? ' door ' + t.doorNaam : ''}</p>
                                        <p className={cx('text-[11px]', dagenOver <= 3 ? 'text-red-600' : 'text-stone-400')}>Nog {plural(dagenOver, 'dag', 'dagen')}</p>
                                    </div>
                                    <Button size="sm" variant="soft" icon="Undo" onClick={() => actions.restoreTrash(t)}>Terugzetten</Button>
                                </div>
                            );
                        })}
                    </Card>
                    <Button variant="ghost" icon="Trash" className="text-red-600" onClick={leeg}>Prullenbak leegmaken</Button>
                </>
            )}
        </div>
    );
}
