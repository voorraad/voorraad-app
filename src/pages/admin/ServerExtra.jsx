import React, { useEffect, useState } from 'react';
import Icon from '../../lib/icons.jsx';
import { auth } from '../../lib/firebase.js';
import { useStore } from '../../state/store.jsx';
import { Card, Button, SectionTitle, Select, Input, Toggle, Chip } from '../../components/ui.jsx';
import { cx, toDate, formatDateTime, plural, downloadBlob } from '../../lib/utils.js';
import { useBeheerDoc, saveBeheerDoc } from './beheerDoc.js';

const kb = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' kB';
async function api(server, pad, opts = {}) {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(server.replace(/\/$/, '') + pad, { ...opts, headers: { Authorization: 'Bearer ' + token } });
    if (res.status === 404) throw new Error('Werk eerst je server bij (versie 1.6.0 nodig)');
    if (!res.ok) throw new Error('Server gaf fout ' + res.status);
    return res;
}

// ---------- Status van vandaag ----------
export function ServerStatus() {
    const { globalSettings } = useStore();
    const p = globalSettings.push || {};
    const st = p.status;
    if (!p.publicKey) return null;
    const vandaag = st && st.dag === new Date().toLocaleDateString('sv-SE');
    return (
        <section>
            <SectionTitle>Status van de server</SectionTitle>
            <Card className="p-4 space-y-3">
                {!st ? <p className="text-sm text-stone-500">Werk je server bij naar versie 1.6.0 om hier de status te zien.</p> : <>
                    <div className="grid grid-cols-3 gap-2">
                        {[['Verstuurd', vandaag ? st.verstuurd : 0, 'text-emerald-700'], ['Mislukt', vandaag ? st.mislukt : 0, (vandaag && st.mislukt) ? 'text-red-600' : ''], ['Toestel weg', vandaag ? st.verlopen : 0, '']].map(([k, n, c]) => (
                            <div key={k} className="rounded-xl bg-stone-50 dark:bg-stone-800/60 px-3 py-2"><p className={cx('text-xl font-bold tabular-nums', c)}>{n}</p><p className="text-xs text-stone-500">{k} vandaag</p></div>
                        ))}
                    </div>
                    <p className="text-xs text-stone-500">Draait sinds {formatDateTime(st.gestartOp)}{st.backupUur ? ` · back-up elke nacht om ${st.backupUur}` : ''} · mail {st.mail ? 'ingesteld' : 'niet ingesteld'}</p>
                    {vandaag && st.fouten && st.fouten.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-stone-500 mb-1">Laatste fouten</p>
                            <ul className="text-xs space-y-1">{st.fouten.slice(0, 6).map((f, i) => <li key={i} className="text-red-700 dark:text-red-300 break-words"><span className="text-stone-400 mr-1.5">{formatDateTime(f.op)}</span>{f.fout}</li>)}</ul>
                        </div>
                    )}
                    <p className="text-xs text-stone-500 flex items-start gap-1.5"><Icon name="Bell" size={13} className="mt-0.5 flex-shrink-0" />Valt de server uit (stroompanne, update…), dan krijg je een melding zodra hij weer online is. Is hij langer dan 10 minuten stil, dan zie je dat hier en op het overzicht.</p>
                </>}
            </Card>
        </section>
    );
}

// Rode balk op het overzicht als de server stil ligt
export function ServerOfflineBanner() {
    const { globalSettings } = useStore();
    const p = globalSettings.push || {};
    const last = toDate(p.serverOp);
    if (!p.publicKey || !last || Date.now() - last < 10 * 60000) return null;
    return (
        <a href="#/admin/app" className="block rounded-2xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4">
            <p className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2"><Icon name="Alert" size={17} />Je server is offline sinds {formatDateTime(last)}</p>
            <p className="text-sm text-red-700/80 dark:text-red-300/80 mt-0.5">Er gaan geen meldingen en back-ups. Kijk of de container in Proxmox draait (systemctl status voorraad).</p>
        </a>
    );
}

// ---------- Automatische back-up ----------
export function ServerBackups() {
    const { globalSettings, actions } = useStore();
    const p = globalSettings.push || {};
    const lb = p.laatsteBackup;
    const [lijst, setLijst] = useState(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const laad = async () => { if (!p.fotoUrl) return; setErr(''); try { setLijst((await (await api(p.fotoUrl, '/backups')).json()).lijst); } catch (e) { setErr(e.message); } };
    useEffect(() => { laad(); }, [p.fotoUrl, lb && toDate(lb.op) && toDate(lb.op).getTime()]);
    if (!p.publicKey) return null;
    const nu = async () => { setBusy(true); try { const r = await (await api(p.fotoUrl, '/backups/nu', { method: 'POST' })).json(); actions.notify(`Back-up gemaakt (${kb(r.grootte)})`); laad(); } catch (e) { actions.notify(e.message, 'error'); } setBusy(false); };
    const download = async (b) => { try { const res = await api(p.fotoUrl, '/backups/' + b.bestand); downloadBlob(await res.text(), b.bestand.replace('.gz', ''), 'application/json'); } catch (e) { actions.notify(e.message, 'error'); } };
    return (
        <section>
            <SectionTitle>Automatische back-up</SectionTitle>
            <Card className="p-4 space-y-3">
                <p className="text-sm text-stone-600 dark:text-stone-300">
                    {!lb ? 'Nog geen back-up gemaakt. De server maakt er elke nacht een (vanaf versie 1.6.0).'
                        : lb.fout ? <span className="text-red-600">Laatste back-up mislukt ({formatDateTime(lb.op)}): {lb.fout}</span>
                            : <>Laatste back-up: <b>{formatDateTime(lb.op)}</b> · {kb(lb.grootte)} · {plural(lb.gebruikers || 0, 'gebruiker', 'gebruikers')}, {plural(lb.items || 0, 'product', 'producten')}</>}
                </p>
                <p className="text-xs text-stone-500">Elke nacht, {(p.status && p.status.backupUur) || '03:00'}. De server bewaart de laatste 30 dagen in <code>/opt/voorraad-server/data/backups</code>. Terugzetten doe je met <b>Gegevens → Eén gebruiker terugzetten</b>.</p>
                {!p.fotoUrl ? <p className="text-xs text-amber-700">Downloaden vanuit de app kan zodra je server een publiek adres heeft (PUBLIC_URL, bv. via Tailscale Funnel).</p> : <>
                    {err && <p className="text-xs text-red-600">{err}</p>}
                    {lijst && lijst.length > 0 && (
                        <ul className="divide-y divide-stone-100 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 max-h-56 overflow-y-auto">
                            {lijst.map(b => (
                                <li key={b.bestand} className="flex items-center gap-2 px-3 py-2 text-sm">
                                    <Icon name="Download" size={14} className="text-stone-400" />
                                    <span className="flex-1 truncate">{b.bestand.replace('voorraad-', '').replace('.json.gz', '')}</span>
                                    <span className="text-xs text-stone-400">{kb(b.grootte)}</span>
                                    <button type="button" onClick={() => download(b)} className="h-7 px-2 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40">Download</button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Button size="sm" variant="soft" icon="Download" disabled={busy} onClick={nu}>{busy ? 'Bezig…' : 'Nu een back-up maken'}</Button>
                </>}
            </Card>
        </section>
    );
}

// ---------- Dagrapport per mail ----------
export function Dagrapport() {
    const { usersList, globalSettings, actions } = useStore();
    const cfg = useBeheerDoc('dagrapport');
    const [mail, setMail] = useState('');
    if (!cfg) return null;
    const aan = cfg.aan || [];
    const zet = (patch) => saveBeheerDoc('dagrapport', patch);
    const voeg = (m) => { m = m.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(m) || aan.includes(m)) return; zet({ aan: [...aan, m] }); setMail(''); };
    const uren = Array.from({ length: 18 }, (_, i) => String(6 + i).padStart(2, '0') + ':00');
    const l = cfg.laatste;
    const mailOk = globalSettings.push && globalSettings.push.status && globalSettings.push.status.mail;
    return (
        <section>
            <SectionTitle>Dagrapport per mail</SectionTitle>
            <Card className="p-4 space-y-3">
                <Toggle checked={!!cfg.actief} onChange={c => zet({ actief: c })} label="Elke dag een rapport mailen" description="Alles wat er die dag gebeurde, per gebruiker: toegevoegd, opgegeten, weggegooid, aangepast… plus wat verlopen is en nieuwe gebruikers." />
                <label className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-stone-600 dark:text-stone-300">Versturen om</span>
                    <Select className="h-9 w-32 text-sm" value={cfg.uur || '20:00'} onChange={e => zet({ uur: e.target.value })}>{uren.map(u => <option key={u} value={u}>{u}</option>)}</Select>
                </label>
                <div>
                    <p className="text-sm text-stone-600 dark:text-stone-300 mb-1.5">Naar</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {aan.map(m => <Chip key={m} active onClick={() => zet({ aan: aan.filter(x => x !== m) })}>{m}<Icon name="X" size={12} className="inline ml-1 -mt-0.5" /></Chip>)}
                        {usersList.filter(u => u.email && !aan.includes(u.email.toLowerCase())).slice(0, 6).map(u => <Chip key={u.id} onClick={() => voeg(u.email)}>+ {u.email}</Chip>)}
                    </div>
                    <div className="flex gap-2">
                        <Input type="email" value={mail} onChange={e => setMail(e.target.value)} onKeyDown={e => e.key === 'Enter' && voeg(mail)} placeholder="ander@adres.be" />
                        <Button variant="secondary" className="whitespace-nowrap" disabled={!mail.trim()} onClick={() => voeg(mail)}>Voeg toe</Button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="soft" icon="Message" disabled={!aan.length} onClick={() => { zet({ testOp: new Date() }); actions.notify('Testrapport wordt verstuurd…'); }}>Stuur nu een testrapport</Button>
                </div>
                {l && <p className={cx('text-xs', l.ok ? 'text-emerald-700' : 'text-red-600')}>{l.test ? 'Test' : 'Laatste rapport'} {formatDateTime(l.op)}: {l.ok ? `verstuurd naar ${(l.aan || []).join(', ')}` : l.fout}</p>}
                {!mailOk && <p className="text-xs text-amber-700">Op de server staat nog geen mailaccount. Vul in <code>/opt/voorraad-server/.env</code> de regels SMTP_HOST, SMTP_USER en SMTP_PASS in (zie installatiegids, stap 8) en herstart met <code>systemctl restart voorraad</code>.</p>}
            </Card>
        </section>
    );
}
