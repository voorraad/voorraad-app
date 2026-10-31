import React, { useEffect, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Sheet, Button, Stepper } from './ui.jsx';
import { cx, num, round2, emojiFor, formatDateTime, byName } from '../lib/utils.js';

// Controle: loop een lade na en zet de aantallen juist. Er wordt pas iets opgeslagen bij "Klaar".
export default function AuditSheet() {
    const { auditLadeId, closeAudit, openForm } = useUi();
    const { lades, items, locById, typeOf, actions } = useStore();
    const lade = lades.find(l => l.id === auditLadeId);
    const [checked, setChecked] = useState(new Set());
    const [removed, setRemoved] = useState(new Set());
    const [drafts, setDrafts] = useState({});
    const [busy, setBusy] = useState(false);
    useEffect(() => { setChecked(new Set()); setRemoved(new Set()); setDrafts({}); }, [auditLadeId]);
    if (!lade) return null;

    const list = items.filter(i => i.ladeId === lade.id).sort(byName);
    const toggle = (set, setter, id) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); setter(n); };
    const changes = list.filter(i => drafts[i.id] != null && round2(num(drafts[i.id])) !== round2(num(i.aantal))).map(i => ({ item: i, aantal: round2(num(drafts[i.id])) }));
    const doneCount = list.filter(i => checked.has(i.id) || removed.has(i.id)).length;
    const loc = locById[lade.vriezerId];

    const finish = async () => {
        setBusy(true);
        try { await actions.finishAudit(lade, [...removed], changes); closeAudit(); }
        finally { setBusy(false); }
    };

    return (
        <Sheet open onClose={closeAudit} size="lg" title={`Controle: ${lade.naam}`}
            subtitle={`${loc ? loc.naam + ' · ' : ''}${lade.laatstGecontroleerd ? 'laatst gecontroleerd ' + formatDateTime(lade.laatstGecontroleerd) : 'nog nooit gecontroleerd'}`}
            footer={
                <div className="flex items-center gap-3">
                    <span className="text-sm text-stone-500 flex-1">{doneCount}/{list.length} nagekeken{removed.size ? ` · ${removed.size} weg` : ''}{changes.length ? ` · ${changes.length} aangepast` : ''}</span>
                    <Button onClick={finish} disabled={busy} icon="Check">Klaar</Button>
                </div>
            }>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Kijk elk product na: pas het aantal aan, tik op <b>✓</b> als het klopt of op <b>✕</b> als het er niet meer is.</p>
            <ul className="space-y-2">
                {list.map(i => {
                    const isOk = checked.has(i.id), isGone = removed.has(i.id);
                    const val = drafts[i.id] ?? num(i.aantal, 1);
                    const changed = drafts[i.id] != null && round2(num(drafts[i.id])) !== round2(num(i.aantal));
                    return (
                        <li key={i.id} className={cx('rounded-2xl border p-3 flex flex-wrap items-center gap-3 transition-colors',
                            isGone ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30 opacity-70' : isOk ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30' : changed ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20' : 'border-stone-200 dark:border-stone-700')}>
                            <span className="text-2xl w-8 text-center">{emojiFor(i)}</span>
                            <div className="flex-1 min-w-[8rem]">
                                <p className={cx('font-semibold', isGone && 'line-through text-red-700 dark:text-red-300')}>{i.naam}</p>
                                <p className="text-xs text-stone-500">{isGone ? 'wordt verwijderd' : changed ? `was ${i.aantal} ${i.eenheid}` : i.eenheid}</p>
                            </div>
                            {!isGone && <Stepper size="sm" value={val} onChange={a => setDrafts(d => ({ ...d, [i.id]: a }))} min={0.25} className="w-32" />}
                            <div className="flex gap-1.5 ml-auto">
                                <button type="button" onClick={() => openForm({ item: i, viaBalans: true })} aria-label="Bewerken" className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"><Icon name="Edit" size={16} /></button>
                                <button type="button" onClick={() => { toggle(removed, setRemoved, i.id); const c = new Set(checked); c.delete(i.id); setChecked(c); }} aria-label={isGone ? 'Herstellen' : 'Klopt niet'}
                                    className={cx('w-9 h-9 rounded-xl flex items-center justify-center', isGone ? 'bg-red-600 text-white' : 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50')}><Icon name={isGone ? 'Undo' : 'X'} size={16} /></button>
                                {!isGone && <button type="button" onClick={() => toggle(checked, setChecked, i.id)} aria-label="Klopt"
                                    className={cx('w-9 h-9 rounded-xl flex items-center justify-center', isOk ? 'bg-emerald-600 text-white' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50')}><Icon name="Check" size={16} strokeWidth={3} /></button>}
                            </div>
                        </li>
                    );
                })}
                {list.length === 0 && <p className="text-sm text-stone-500 py-6 text-center">Deze lade is leeg.</p>}
            </ul>
            <Button variant="soft" block icon="Plus" className="mt-3" onClick={() => {
                openForm({ type: typeOf({ vriezerId: lade.vriezerId }), prefill: { vriezerId: lade.vriezerId, ladeId: lade.id }, viaBalans: true, nonce: Date.now() });
            }}>Product toevoegen in deze lade</Button>
        </Sheet>
    );
}
