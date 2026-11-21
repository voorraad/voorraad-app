import React, { useEffect, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { db, runBatched } from '../lib/firebase.js';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Sheet, Button, Card, Textarea, Segmented, SectionTitle, Merk } from './ui.jsx';
import { cx, formatDateTime, toDate, plural } from '../lib/utils.js';
import { useBeheerDoc, saveBeheerDoc, nieuwId } from '../pages/admin/beheerDoc.js';

// Persoonlijke berichten van een beheerder aan één gebruiker (collectie berichten).
export const TONES = {
    info: { label: 'Info', icon: 'Info', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-200' },
    nieuw: { label: 'Nieuw', icon: 'Sparkles', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200' },
    let: { label: 'Let op', icon: 'Alert', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200' }
};
const byDate = (a, b) => (toDate(a.gemaaktOp) || 0) - (toDate(b.gemaaktOp) || 0);

export async function sendMessage(userIds, text, tone, from) {
    const now = new Date();
    await runBatched(userIds.map(uid => b => b.set(db.collection('berichten').doc(), {
        userId: uid, text: text.trim(), tone, door: from.uid, doorNaam: from.displayName || from.email || 'Beheerder', gemaaktOp: now, gelezenOp: null
    })));
}

// ---------- Voor de gebruiker: popup met ongelezen berichten ----------
export function MessagePopup() {
    const { user } = useStore();
    const [list, setList] = useState([]);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        if (!user) return;
        return db.collection('berichten').where('userId', '==', user.uid)
            .onSnapshot(s => setList(s.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => !m.gelezenOp).sort(byDate)), () => setList([]));
    }, [user && user.uid]);
    if (!list.length) return null;
    const read = async () => {
        setBusy(true);
        const now = new Date();
        await runBatched(list.map(m => b => b.update(db.collection('berichten').doc(m.id), { gelezenOp: now }))).catch(() => { });
        setBusy(false);
    };
    return (
        <Sheet open onClose={read} size="sm" title={list.length === 1 ? 'Bericht van Voorraad.' : `${list.length} berichten van Voorraad.`}
            footer={<Button block icon="Check" disabled={busy} onClick={read}>Oké, gelezen</Button>}>
            <div className="space-y-3">
                {list.map(m => {
                    const t = TONES[m.tone] || TONES.info;
                    return (
                        <div key={m.id} className="flex gap-3">
                            <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', t.cls)}><Icon name={t.icon} size={18} /></span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] whitespace-pre-line break-words">{m.text}</p>
                                <p className="text-xs text-stone-400 mt-1">{formatDateTime(m.gemaaktOp)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Sheet>
    );
}

// ---------- Voor de beheerder: berichten aan één gebruiker ----------
export function MessageComposer({ userIds, onSent, compact }) {
    const { user, actions } = useStore();
    const [text, setText] = useState('');
    const [tone, setTone] = useState('info');
    const [busy, setBusy] = useState(false);
    const sj = useBeheerDoc('sjablonen');
    const sjablonen = (sj && sj.lijst) || [];
    const bewaar = async () => {
        if (sjablonen.some(x => x.text === text.trim())) { actions.notify('Dit bericht staat al bij je sjablonen'); return; }
        await saveBeheerDoc('sjablonen', { lijst: [...sjablonen, { id: nieuwId(), text: text.trim(), tone }] });
        actions.notify('Opgeslagen als sjabloon');
    };
    const wis = (id) => saveBeheerDoc('sjablonen', { lijst: sjablonen.filter(x => x.id !== id) });
    const send = async () => {
        setBusy(true);
        try {
            await sendMessage(userIds, text, tone, user);
            actions.notify(userIds.length === 1 ? 'Bericht verstuurd' : `Bericht verstuurd naar ${plural(userIds.length, 'gebruiker', 'gebruikers')}`);
            setText(''); onSent && onSent();
        } catch (e) { actions.notify('Versturen mislukt: ' + (e.message || e), 'error'); }
        setBusy(false);
    };
    return (
        <div className="space-y-2">
            {sjablonen.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {sjablonen.map(x => {
                        const t = TONES[x.tone] || TONES.info;
                        return (
                            <span key={x.id} className={cx('inline-flex items-center rounded-lg text-xs font-medium max-w-full', t.cls)}>
                                <button type="button" title={x.text} onClick={() => { setText(x.text); setTone(x.tone || 'info'); }} className="h-8 pl-2 pr-1 inline-flex items-center gap-1 min-w-0">
                                    <Icon name={t.icon} size={12} className="flex-shrink-0" /><span className="truncate max-w-[11rem]">{x.text}</span>
                                </button>
                                <button type="button" aria-label="Sjabloon verwijderen" onClick={() => wis(x.id)} className="h-8 px-1.5 opacity-60 hover:opacity-100"><Icon name="X" size={12} /></button>
                            </span>
                        );
                    })}
                </div>
            )}
            <Textarea rows={compact ? 2 : 3} value={text} onChange={e => setText(e.target.value)} placeholder="Bv. Ik heb je vriezer opgekuist, kijk je even na?" />
            <div className="flex flex-wrap items-center gap-2">
                <Segmented size="sm" value={tone} onChange={setTone} className="w-64" options={Object.entries(TONES).map(([id, t]) => ({ id, label: t.label, icon: t.icon }))} />
                <div className="flex-1" />
                {text.trim() && !sjablonen.some(x => x.text === text.trim()) && <Button size="sm" variant="ghost" icon="Star" onClick={bewaar}>Bewaar als sjabloon</Button>}
                <Button size="sm" icon="Message" disabled={!text.trim() || !userIds.length || busy} onClick={send}>Versturen</Button>
            </div>
        </div>
    );
}

export function UserMessages({ uid }) {
    const { confirm } = useUi();
    const [list, setList] = useState(null);
    useEffect(() => {
        setList(null);
        return db.collection('berichten').where('userId', '==', uid)
            .onSnapshot(s => setList(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => byDate(b, a))), () => setList([]));
    }, [uid]);
    return (
        <div className="space-y-4 max-w-2xl">
            <Card className="p-4">
                <p className="text-sm font-semibold mb-2">Nieuw bericht</p>
                <MessageComposer userIds={[uid]} />
                <p className="text-xs text-stone-500 mt-2">Verschijnt als pop-up zodra deze gebruiker de app opent (of meteen, als de app al open staat).</p>
            </Card>
            <section>
                <SectionTitle>Verstuurd</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                    {!list && <div className="h-16 animate-pulse" />}
                    {list && !list.length && <p className="p-4 text-sm text-stone-500">Nog geen berichten gestuurd.</p>}
                    {(list || []).map(m => {
                        const t = TONES[m.tone] || TONES.info;
                        return (
                            <div key={m.id} className="flex gap-3 px-4 py-3">
                                <span className={cx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', t.cls)}><Icon name={t.icon} size={15} /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm whitespace-pre-line break-words">{m.text}</p>
                                    <p className="text-xs mt-1 flex flex-wrap gap-x-2">
                                        <span className="text-stone-400">{formatDateTime(m.gemaaktOp)}</span>
                                        {m.gelezenOp
                                            ? <span className="text-emerald-600 font-semibold inline-flex items-center gap-1"><Icon name="Check" size={12} />Gelezen {formatDateTime(m.gelezenOp)}</span>
                                            : <span className="text-amber-600 font-semibold inline-flex items-center gap-1"><Icon name="Clock" size={12} />Nog niet gelezen</span>}
                                    </p>
                                </div>
                                <button type="button" aria-label="Bericht verwijderen" onClick={async () => { if (await confirm({ title: 'Bericht verwijderen?', message: m.gelezenOp ? '' : 'De gebruiker krijgt het dan niet meer te zien.', confirmLabel: 'Verwijderen', danger: true })) db.collection('berichten').doc(m.id).delete(); }}
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-stone-100 dark:hover:bg-stone-800 flex-shrink-0"><Icon name="Trash" size={16} /></button>
                            </div>
                        );
                    })}
                </Card>
            </section>
        </div>
    );
}

// Klein overzichtje in het profiel: aantal ongelezen berichten
export function useUnreadCount(uid) {
    const [n, setN] = useState(0);
    useEffect(() => db.collection('berichten').where('userId', '==', uid)
        .onSnapshot(s => setN(s.docs.filter(d => !d.data().gelezenOp).length), () => setN(0)), [uid]);
    return n;
}
