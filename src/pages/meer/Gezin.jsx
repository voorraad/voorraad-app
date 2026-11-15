import React, { useEffect, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { useStore } from '../../state/store.jsx';
import { Card, Button, Input, Sheet, SectionTitle, ColorPicker } from '../../components/ui.jsx';
import { USER_TONES, USER_TONE_DOTS, USER_TONE_NAMES } from '../../lib/userColors.js';
import { cx, randomToken } from '../../lib/utils.js';

export const memberTone = (m) => USER_TONES[(m && m.kleur) || 'sky'] || USER_TONES.sky;
export function MemberAvatar({ m, size = 'w-8 h-8 text-xs' }) {
    return <span className={cx('rounded-full flex-shrink-0 flex items-center justify-center font-bold', size, memberTone(m).pill)}>{m ? (m.naam || '?')[0].toUpperCase() : '?'}</span>;
}

// Instellingen → Gezinsleden
export function Gezin() {
    const { gezinsleden, gezinslid, actions } = useStore();
    const [naam, setNaam] = useState('');
    const save = (list) => actions.setMine({ gezinsleden: list });
    const kleuren = Object.keys(USER_TONES);
    const add = (e) => {
        e.preventDefault();
        if (!naam.trim()) return;
        const m = { id: randomToken().slice(0, 8), naam: naam.trim(), kleur: kleuren[gezinsleden.length % kleuren.length] };
        save([...gezinsleden, m]); setNaam('');
        if (!gezinslid) actions.setGezinslid(m.id);
    };
    return (
        <div className="space-y-5 max-w-2xl">
            <p className="text-sm text-stone-600 dark:text-stone-300">Gebruiken meerdere mensen dit account (bv. op de gsm of tablet van het gezin)? Voeg ze toe. Op elk toestel kies je wie het gebruikt; in het logboek zie je dan wie wat toevoegde of opat.</p>
            <section>
                <SectionTitle>Gezinsleden</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                    {gezinsleden.length === 0 && <p className="p-4 text-sm text-stone-500">Nog niemand toegevoegd.</p>}
                    {gezinsleden.map(m => (
                        <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                            <MemberAvatar m={m} />
                            <input defaultValue={m.naam} aria-label="Naam" onBlur={e => { const v = e.target.value.trim(); if (v && v !== m.naam) save(gezinsleden.map(x => x.id === m.id ? { ...x, naam: v } : x)); }}
                                className="flex-1 min-w-0 bg-transparent font-medium outline-none focus:bg-stone-50 dark:focus:bg-stone-800 rounded px-1" />
                            <ColorPicker value={m.kleur || 'sky'} colors={USER_TONE_DOTS} names={USER_TONE_NAMES} label={`Kleur van ${m.naam}`} onChange={k => save(gezinsleden.map(x => x.id === m.id ? { ...x, kleur: k } : x))} />
                            <button type="button" aria-label={`${m.naam} verwijderen`} onClick={() => { save(gezinsleden.filter(x => x.id !== m.id)); if (gezinslid && gezinslid.id === m.id) actions.setGezinslid(''); }}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800"><Icon name="Trash" size={16} /></button>
                        </div>
                    ))}
                </Card>
                <form onSubmit={add} className="flex gap-2 mt-3">
                    <Input placeholder="Naam, bv. Mama of Lotte" value={naam} onChange={e => setNaam(e.target.value)} />
                    <Button type="submit" icon="Plus" disabled={!naam.trim()}>Toevoegen</Button>
                </form>
            </section>
            {gezinsleden.length > 0 && (
                <section>
                    <SectionTitle>Wie gebruikt dit toestel?</SectionTitle>
                    <MemberChoice />
                </section>
            )}
        </div>
    );
}

function MemberChoice({ onPick }) {
    const { gezinsleden, gezinslid, actions } = useStore();
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {gezinsleden.map(m => (
                <button key={m.id} type="button" onClick={() => { actions.setGezinslid(m.id); onPick && onPick(); }}
                    className={cx('h-14 rounded-2xl border-2 flex items-center gap-2.5 px-3 font-semibold text-left', gezinslid && gezinslid.id === m.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40' : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900')}>
                    <MemberAvatar m={m} /><span className="truncate">{m.naam}</span>
                </button>
            ))}
        </div>
    );
}

// Knop in de kopbalk + keuzevenster (vraagt het één keer per sessie als nog niemand gekozen is)
export function MemberButton() {
    const { gezinsleden, gezinslid, dataLoaded } = useStore();
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!dataLoaded || !gezinsleden.length || gezinslid) return;
        try { if (sessionStorage.getItem('voorraad_wie_gevraagd')) return; sessionStorage.setItem('voorraad_wie_gevraagd', '1'); } catch (e) { }
        setOpen(true);
    }, [dataLoaded, gezinsleden.length, !!gezinslid]);
    if (!gezinsleden.length) return null;
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} aria-label={gezinslid ? `Gebruikt door ${gezinslid.naam}, wisselen` : 'Wie ben jij?'} title={gezinslid ? gezinslid.naam : 'Wie ben jij?'}
                className="h-9 pl-1 pr-2.5 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center gap-1.5 text-sm font-semibold">
                <MemberAvatar m={gezinslid} size="w-7 h-7 text-xs" /><span className="hidden sm:inline max-w-[6rem] truncate">{gezinslid ? gezinslid.naam : 'Wie?'}</span>
            </button>
            <Sheet open={open} onClose={() => setOpen(false)} size="sm" title="Wie ben jij?" subtitle="Zo zie je in het logboek wie wat deed.">
                <MemberChoice onPick={() => setOpen(false)} />
            </Sheet>
        </>
    );
}
