import React, { useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { db, runBatched } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { useUi } from '../../state/ui.jsx';
import { Card, Button, SectionTitle, Input, ColorPicker, Chip } from '../../components/ui.jsx';
import { MessageComposer } from '../../components/Berichten.jsx';
import { MeldingKeuze } from '../../components/MeldingKeuze.jsx';
import { RIGHTS, RIGHT_GROUPS, RIGHT_PRESETS, DOT } from '../../lib/constants.js';
import { MELDING_STANDAARD } from '../../lib/meldingen.js';
import { cx, plural } from '../../lib/utils.js';
import { useBeheerDoc, saveBeheerDoc, nieuwId } from './beheerDoc.js';

const nameOf = (u) => (u && (u.displayName || (u.email || '').split('@')[0])) || '?';

// Groepen van gebruikers (bv. Familie, Buren) met gemeenschappelijke rechten en meldingen.
export function useGroepen() {
    const d = useBeheerDoc('groepen');
    return { loaded: d !== null, groepen: (d && d.lijst) || [] };
}
export const groepenVan = (groepen, uid) => groepen.filter(g => (g.leden || []).includes(uid));
export function GroepBadges({ groepen, uid }) {
    const l = groepenVan(groepen, uid);
    if (!l.length) return null;
    return (
        <span className="flex flex-wrap gap-1 mt-0.5">
            {l.map(g => <span key={g.id} className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"><span className={cx('w-1.5 h-1.5 rounded-full', DOT[g.kleur] || DOT.gray)} />{g.naam}</span>)}
        </span>
    );
}

export function Groepen() {
    const { groepen, loaded } = useGroepen();
    const { actions } = useStore();
    const [naam, setNaam] = useState('');
    const [open, setOpen] = useState(null);
    const opslaan = (lijst) => saveBeheerDoc('groepen', { lijst });
    const maak = async () => {
        if (!naam.trim()) return;
        const g = { id: nieuwId(), naam: naam.trim(), kleur: ['teal', 'purple', 'orange', 'blue', 'pink', 'green'][groepen.length % 6], leden: [], rechten: null, meldingen: null };
        await opslaan([...groepen, g]); setNaam(''); setOpen(g.id);
        actions.notify(`Groep ${g.naam} gemaakt`);
    };
    return (
        <section>
            <SectionTitle>Gebruikersgroepen</SectionTitle>
            <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                {loaded && !groepen.length && <p className="p-4 text-sm text-stone-500">Nog geen groepen. Maak er een, bv. <i>Familie</i> of <i>Buren</i>, en geef alle leden in één keer dezelfde rechten, meldingen of een bericht.</p>}
                {groepen.map(g => <GroepRij key={g.id} g={g} groepen={groepen} opslaan={opslaan} open={open === g.id} toggle={() => setOpen(open === g.id ? null : g.id)} />)}
                <div className="flex gap-2 p-3">
                    <Input value={naam} onChange={e => setNaam(e.target.value)} placeholder="Nieuwe groep, bv. Familie" onKeyDown={e => e.key === 'Enter' && maak()} />
                    <Button icon="Plus" disabled={!naam.trim()} onClick={maak}>Maak</Button>
                </div>
            </Card>
        </section>
    );
}

function GroepRij({ g, groepen, opslaan, open, toggle }) {
    const { usersList, user, actions, globalSettings } = useStore();
    const { confirm } = useUi();
    const [deel, setDeel] = useState('leden');
    const zet = (patch) => opslaan(groepen.map(x => x.id === g.id ? { ...x, ...patch } : x));
    const leden = usersList.filter(u => (g.leden || []).includes(u.id));
    const hidden = g.rechten || [];
    const prefs = { ...MELDING_STANDAARD, ...(g.meldingen || {}) };
    const toepassen = async (wat) => {
        if (!leden.length) return;
        if (!(await confirm({ title: `${wat === 'rechten' ? 'Rechten' : 'Meldingen'} toepassen op ${plural(leden.length, 'lid', 'leden')}?`, message: `De huidige ${wat} van ${leden.map(nameOf).join(', ')} worden overschreven.`, confirmLabel: 'Toepassen' }))) return;
        await runBatched(leden.map(u => b => b.set(db.collection('users').doc(u.id), wat === 'rechten' ? { hiddenTabs: hidden } : { meldingen: prefs }, { merge: true })));
        actions.notify(`${wat === 'rechten' ? 'Rechten' : 'Meldingen'} toegepast op ${plural(leden.length, 'gebruiker', 'gebruikers')}`);
    };
    const verwijder = async () => {
        if (!(await confirm({ title: `Groep ${g.naam} verwijderen?`, message: 'De gebruikers zelf blijven gewoon bestaan.', confirmLabel: 'Verwijderen', danger: true }))) return;
        opslaan(groepen.filter(x => x.id !== g.id));
    };
    return (
        <div>
            <button type="button" onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className={cx('w-3 h-3 rounded-full flex-shrink-0', DOT[g.kleur] || DOT.gray)} />
                <span className="flex-1 min-w-0">
                    <span className="block font-semibold">{g.naam}</span>
                    <span className="block text-xs text-stone-500 truncate">{leden.length ? leden.map(nameOf).join(', ') : 'Nog geen leden'}</span>
                </span>
                <span className="text-xs text-stone-400 tabular-nums">{leden.length}</span>
                <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={18} className="text-stone-400" />
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input className="h-9 text-sm flex-1 min-w-[10rem]" defaultValue={g.naam} onBlur={e => e.target.value.trim() && e.target.value.trim() !== g.naam && zet({ naam: e.target.value.trim() })} />
                        <ColorPicker value={g.kleur} colors={DOT} onChange={k => zet({ kleur: k })} label={`Kleur van ${g.naam}`} />
                        <Button size="sm" variant="ghost" icon="Trash" className="text-red-600" onClick={verwijder}>Verwijder</Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {[['leden', 'Leden', 'Users'], ['rechten', 'Rechten', 'Lock'], ['meldingen', 'Meldingen', 'Bell'], ['bericht', 'Bericht', 'Message']].map(([id, l, ic]) => (
                            <Chip key={id} active={deel === id} onClick={() => setDeel(id)}><Icon name={ic} size={13} className="inline -mt-0.5 mr-1" />{l}</Chip>
                        ))}
                    </div>
                    {deel === 'leden' && (
                        <div className="flex flex-wrap gap-1.5">
                            {usersList.filter(u => u.id !== user.uid).map(u => {
                                const on = (g.leden || []).includes(u.id);
                                return <Chip key={u.id} active={on} onClick={() => zet({ leden: on ? g.leden.filter(x => x !== u.id) : [...(g.leden || []), u.id] })}>{nameOf(u)}{on && <Icon name="Check" size={12} className="inline ml-1 -mt-0.5" />}</Chip>;
                            })}
                        </div>
                    )}
                    {deel === 'rechten' && (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                                {RIGHT_PRESETS.map(p => <Chip key={p.id} active={p.hidden.length === hidden.length && p.hidden.every(h => hidden.includes(h))} onClick={() => zet({ rechten: p.hidden })}>{p.label}</Chip>)}
                            </div>
                            {RIGHT_GROUPS.map(gr => (
                                <div key={gr}>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mb-1">{gr}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {RIGHTS.filter(r => r.group === gr).map(r => {
                                            const mag = !hidden.includes(r.id);
                                            return <button key={r.id} type="button" onClick={() => zet({ rechten: mag ? [...hidden, r.id] : hidden.filter(x => x !== r.id) })}
                                                className={cx('h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border', mag ? 'border-teal-300 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-200' : 'border-stone-200 dark:border-stone-700 text-stone-400 line-through')}>
                                                <Icon name={r.icon} size={13} />{r.label}</button>;
                                        })}
                                    </div>
                                </div>
                            ))}
                            <Button size="sm" icon="Check" disabled={!leden.length} onClick={() => toepassen('rechten')}>Toepassen op {plural(leden.length, 'lid', 'leden')}</Button>
                        </div>
                    )}
                    {deel === 'meldingen' && (
                        <div>
                            <MeldingKeuze admin prefs={prefs} uid={null} standaardUur={(globalSettings.push && globalSettings.push.meldingUur) || '08:00'} onSave={m => zet({ meldingen: m })} />
                            <Button size="sm" icon="Check" className="mt-3" disabled={!leden.length} onClick={() => toepassen('meldingen')}>Toepassen op {plural(leden.length, 'lid', 'leden')}</Button>
                        </div>
                    )}
                    {deel === 'bericht' && (leden.length ? <MessageComposer compact userIds={leden.map(u => u.id)} /> : <p className="text-sm text-stone-500">Voeg eerst leden toe.</p>)}
                </div>
            )}
        </div>
    );
}
