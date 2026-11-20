import React, { useEffect, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { db } from '../lib/firebase.js';
import { useUi } from '../state/ui.jsx';
import { Toggle, Select, Chip } from './ui.jsx';
import { MELDING_SOORTEN, DAGEN, VERGRENDELD } from '../lib/meldingen.js';
import { sortLocaties, toDate, formatDateTime } from '../lib/utils.js';

// Locaties uit alle voorraden van deze gebruiker (eigen + gedeeld met hem/haar).
// owners: lijst van voorraad-id's (gewone gebruiker: uit de app zelf); zonder lijst zoekt de beheerder het op.
export function useLocatiesVan(uid, owners) {
    const [list, setList] = useState(null);
    useEffect(() => {
        if (!uid) return;
        let stop = false;
        (async () => {
            const set = new Set([uid, ...(owners || [])]);
            if (!owners) {
                const t = await db.collection('toegang').where('uid', '==', uid).get().catch(() => null);
                if (t) t.docs.forEach(d => set.add(d.data().ownerId));
            }
            const res = [];
            for (const o of set) {
                const v = await db.collection('vriezers').where('userId', '==', o).get().catch(() => null);
                if (v) v.docs.forEach(d => res.push({ id: d.id, ...d.data(), eigen: o === uid }));
            }
            if (!stop) setList(sortLocaties(res));
        })();
        return () => { stop = true; };
    }, [uid, (owners || []).join()]);
    return list;
}

// Keuzelijst voor meldingen. admin = beheerder past de instellingen van iemand anders aan (niets vergrendeld).
export function MeldingKeuze({ prefs: p, onSave, standaardUur, uid, owners, admin = false, verzoek = {}, onVraag }) {
    const { confirm } = useUi();
    const locs = useLocatiesVan(p.wijziging ? uid : null, owners);
    const save = (patch) => onSave({ ...p, ...patch });
    const uren = Array.from({ length: 16 }, (_, i) => String(6 + i).padStart(2, '0') + ':00');
    const zet = async (id, c) => {
        if (!admin && !c && VERGRENDELD.includes(id)) {
            const ok = await confirm({
                title: 'Vraag het aan de beheerder',
                message: 'Berichten en uitnodigingen staan altijd aan, zodat je niets belangrijks mist. Alleen de beheerder kan ze uitzetten. Wil je het vragen?',
                confirmLabel: 'Vraag aan beheerder'
            });
            if (ok && onVraag) onVraag(id);
            return;
        }
        save({ [id]: c });
    };
    let groep = null;
    return (
        <div>
            <label className="flex items-center gap-3 mt-2">
                <span className="flex-1 text-sm text-stone-600 dark:text-stone-300">Dagelijkse meldingen om</span>
                <Select className="h-9 w-32 text-sm" value={p.tijd || ''} onChange={e => save({ tijd: e.target.value })}>
                    <option value="">{standaardUur} (standaard)</option>
                    {uren.filter(u => u !== standaardUur).map(u => <option key={u} value={u}>{u}</option>)}
                </Select>
            </label>
            {MELDING_SOORTEN.map(m => {
                const kop = m.groep !== groep ? (groep = m.groep) : null;
                const slot = VERGRENDELD.includes(m.id);
                const gevraagd = verzoek[m.id] && p[m.id];
                return (
                    <React.Fragment key={m.id}>
                        {kop && <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mt-4 mb-1">{kop}</p>}
                        <div className="flex items-start gap-3 py-1.5">
                            <Icon name={m.icon} size={18} className={m.tone + ' mt-2.5 flex-shrink-0'} />
                            <div className="flex-1 min-w-0">
                                <Toggle checked={!!p[m.id]} onChange={c => zet(m.id, c)} label={<span className="inline-flex items-center gap-1.5">{m.label}{slot && <Icon name="Lock" size={13} className="text-stone-400" />}</span>}
                                    description={m.uitleg + (slot && !admin ? ' Uitzetten kan enkel de beheerder.' : '')} />
                                {gevraagd && <p className={'text-xs -mt-1 mb-1 ' + (admin ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-amber-600')}>
                                    <Icon name="Clock" size={12} className="inline -mt-0.5 mr-1" />{admin ? 'Vraagt om dit uit te zetten' : 'Gevraagd aan de beheerder'} ({formatDateTime(toDate(verzoek[m.id]))})</p>}
                                {m.id === 'lijst' && p.lijst && (
                                    <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300 -mt-1 mb-1">
                                        Op
                                        <Select className="h-9 w-36 text-sm" value={p.lijstDag} onChange={e => save({ lijstDag: Number(e.target.value) })}>
                                            {[1, 2, 3, 4, 5, 6, 0].map(d => <option key={d} value={d}>{DAGEN[d]}</option>)}
                                        </Select>
                                    </label>
                                )}
                                {m.id === 'wijziging' && p.wijziging && (
                                    <div className="-mt-1 mb-1">
                                        {!locs ? <p className="text-xs text-stone-400">Locaties laden…</p>
                                            : !locs.length ? <p className="text-xs text-stone-500">Nog geen locaties.</p>
                                                : <div className="flex flex-wrap gap-1.5">
                                                    {locs.map(l => {
                                                        const on = (p.locaties || []).includes(l.id);
                                                        return <Chip key={l.id} active={on} onClick={() => save({ locaties: on ? p.locaties.filter(x => x !== l.id) : [...(p.locaties || []), l.id] })}>{l.naam}{!l.eigen && <span className="opacity-60"> · gedeeld</span>}</Chip>;
                                                    })}
                                                </div>}
                                        {locs && locs.length > 0 && !(p.locaties || []).length && <p className="text-xs text-amber-600 mt-1">Kies minstens één locatie.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}
